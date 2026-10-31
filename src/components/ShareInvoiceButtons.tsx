"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { generateBillingRecordPdf } from "@/lib/generateBillingRecordPdfWrapper";
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

    if (invoice.record_type === "billing_record") {
      await generateBillingRecordPdf({ invoice, items: items ?? [], customer, profile: profileForPdf });
    } else {
      await generateInvoicePdf({ invoice, items: items ?? [], customer, profile: profileForPdf });
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
      const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, "") : "";
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } else {
      const subject = `${docLabel === "bill" ? "Bill" : "Invoice"}${invoice.invoice_number ? ` #${invoice.invoice_number}` : ""}`;
      const mailtoUrl = `mailto:${customer?.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`;
      window.location.href = mailtoUrl;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => prepareAndShare("whatsapp")}
        disabled={loading !== null}
        className="flex items-center gap-1.5 rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4L9.7 7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z" />
          <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.5 5.1L2 22l5.1-1.3C8.5 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2Zm0 18.2c-1.7 0-3.2-.5-4.5-1.3l-.3-.2-3 .8.8-2.9-.2-.3C4 15 3.5 13.6 3.5 12c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5-3.8 8.5-8.5 8.5Z" />
        </svg>
        {loading === "whatsapp" ? "Preparing…" : "WhatsApp"}
      </button>
      <button
        type="button"
        onClick={() => prepareAndShare("email")}
        disabled={loading !== null}
        className="flex items-center gap-1.5 rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 6h16v12H4z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {loading === "email" ? "Preparing…" : "Email"}
      </button>
    </>
  );
}
