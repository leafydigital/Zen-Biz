"use client";

import { ICON_BTN, MailIcon, WhatsAppIcon, Spinner } from "@/components/ActionIcons";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { generateBillingRecordPdf } from "@/lib/generateBillingRecordPdfWrapper";
import { sharePdfToWhatsApp } from "@/lib/shareFile";
import { sendInvoiceEmail } from "@/lib/actions/emailActions";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import { CURRENCY_SYMBOLS } from "@/types/database";
import type { Business, Customer, Invoice, InvoiceItem, Profile } from "@/types/database";

/**
 * Downloads the invoice PDF (same as DownloadInvoiceButton) and then
 * opens WhatsApp or the person's email client with a short pre-filled
 * message. Neither WhatsApp's web share nor a mailto: link can actually
 * attach a file from JavaScript — that's a real browser/API limitation,
 * not something this app can work around — so the file downloads first
 * and the message asks the sender to attach it, which is the standard
 * pattern real invoicing apps use for this exact reason.
 */
export function ShareInvoiceButtons({ invoiceId }: { invoiceId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState<"whatsapp" | "email" | null>(null);
  const { showLoader, hideLoader } = useGlobalLoader();
  const [draft, setDraft] = useState<{
    to: string;
    subject: string;
    message: string;
    blob: Blob;
    filename: string;
    hasReplyTo: boolean;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function sendNow() {
    if (!draft) return;
    setSending(true);
    setSendError(null);
    const buf = new Uint8Array(await draft.blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const result = await sendInvoiceEmail({
      invoiceId,
      to: draft.to,
      subject: draft.subject,
      message: draft.message,
      pdfBase64: btoa(bin),
      filename: draft.filename,
    });
    setSending(false);
    if (result.error) {
      setSendError(result.error);
      return;
    }
    setSentTo(draft.to);
    setDraft(null);
  }

  async function prepareAndShare(channel: "whatsapp" | "email") {
    setLoading(channel);
    showLoader("Preparing PDF…");

    function stopLoading() {
      setLoading(null);
      hideLoader();
    }

    const [invoiceResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("invoices" as never).select("*").eq("id", invoiceId).single(),
      supabase.from("invoice_items" as never).select("*").eq("invoice_id", invoiceId),
      supabase.from("profiles" as never).select("*").single(),
    ]);

    const invoice = invoiceResult.data as Invoice | null;
    const items = itemsResult.data as InvoiceItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!invoice || !profile) {
      stopLoading();
      return;
    }

    const { data: businessData } = await supabase
      .from("businesses" as never)
      .select("*")
      .eq("id", invoice.business_id)
      .maybeSingle();
    const business = businessData as Business | null;
    const profileForPdf: Profile = business ? { ...profile, ...business, id: profile.id } : profile;

    let customer: Customer | null = null;
    if (invoice.customer_id) {
      const { data } = await supabase
        .from("customers" as never)
        .select("*")
        .eq("id", invoice.customer_id)
        .single();
      customer = data as Customer | null;
    }

    const asBlob = true;
    let pdfBlob: Blob | void = undefined;
    if (invoice.record_type === "billing_record") {
      pdfBlob = await generateBillingRecordPdf({ invoice, items: items ?? [], customer, profile: profileForPdf, preview: asBlob });
    } else {
      pdfBlob = await generateInvoicePdf({ invoice, items: items ?? [], customer, profile: profileForPdf, preview: asBlob });
    }

    const symbol = CURRENCY_SYMBOLS[invoice.currency ?? "INR"] ?? "";
    const docLabel = invoice.record_type === "billing_record" ? "bill" : "invoice";
    const businessName = business?.business_name || "";
    const messageText =
      `Hi${customer?.name ? " " + customer.name : ""}, here's your ${docLabel} ` +
      `${invoice.invoice_number ? `#${invoice.invoice_number} ` : ""}` +
      `for ${symbol}${Number(invoice.total).toLocaleString("en-IN")}` +
      `${businessName ? ` from ${businessName}` : ""}. The PDF just downloaded — please attach it here.`;

    stopLoading();

    if (channel === "whatsapp") {
      if (pdfBlob) {
        const label = docLabel === "bill" ? "Bill" : "Invoice";
        await sharePdfToWhatsApp({
          blob: pdfBlob,
          filename: `${label}-${invoice.invoice_number}.pdf`,
          text: messageText.replace(" The PDF just downloaded — please attach it here.", ""),
          fallbackText: messageText,
          phone: customer?.phone,
          businessId: invoice.business_id,
        });
      }
    } else if (pdfBlob) {
      const label = docLabel === "bill" ? "Bill" : "Invoice";
      const subject = `${label}${invoice.invoice_number ? ` #${invoice.invoice_number}` : ""}${businessName ? ` from ${businessName}` : ""}`;
      const body =
        `Hi${customer?.name ? " " + customer.name : ""},\n\n` +
        `Please find attached your ${docLabel}${invoice.invoice_number ? ` #${invoice.invoice_number}` : ""} ` +
        `for ${symbol}${Number(invoice.total).toLocaleString("en-IN")}.\n\nThank you,\n${businessName}`;
      setSentTo(null);
      setSendError(null);
      setDraft({
        to: customer?.email ?? "",
        subject,
        message: body,
        blob: pdfBlob,
        filename: `${label}-${invoice.invoice_number}.pdf`,
        hasReplyTo: !!business?.email,
      });
    }
  }

  const field =
    "rounded-lg border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink focus:outline-none";

  return (
    <>
      {sentTo && (
        <span className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">
          Email sent to {sentTo}
        </span>
      )}
      {draft && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => !sending && setDraft(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-xl2 bg-paper-card p-5 shadow-card"
          >
            <p className="text-sm font-semibold text-text">Email to customer</p>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-soft">To</span>
              <input
                type="email"
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                placeholder="customer@example.com"
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-soft">Subject</span>
              <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={field} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-soft">Message</span>
              <textarea
                rows={7}
                value={draft.message}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                className={field}
              />
            </label>
            <p className="text-xs text-text-soft">
              The PDF ({draft.filename}) is attached automatically.
              {!draft.hasReplyTo && " Add a Business email in Settings → General so customers can reply to you."}
            </p>
            {sendError && <p className="rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert">{sendError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={sending}
                className="flex-1 rounded-lg border border-paper-fold px-3 py-2 text-sm font-medium text-text transition hover:bg-paper disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendNow}
                disabled={sending || !draft.to.trim()}
                className="flex-1 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send email"}
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => prepareAndShare("whatsapp")}
        disabled={loading !== null}
        title="Share on WhatsApp"
        aria-label="Share on WhatsApp"
        className={`${ICON_BTN} bg-emerald-600 hover:bg-emerald-700`}
      >
        {loading === "whatsapp" ? <Spinner /> : <WhatsAppIcon />}
      </button>
      <button
        type="button"
        onClick={() => prepareAndShare("email")}
        disabled={loading !== null}
        title="Send by email"
        aria-label="Send by email"
        className={`${ICON_BTN} bg-amber-600 hover:bg-amber-700`}
      >
        {loading === "email" ? <Spinner /> : <MailIcon />}
      </button>
    </>
  );
}
