"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateQuotationPdf } from "@/lib/generateQuotationPdf";
import { generatePurchasePdf } from "@/lib/generatePurchasePdf";
import { sharePdfToWhatsApp } from "@/lib/shareFile";
import { sendInvoiceEmail } from "@/lib/actions/emailActions";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import { CURRENCY_SYMBOLS } from "@/types/database";
import type { Business, Customer, Profile, Purchase, PurchaseItem, Quotation, QuotationItem, Supplier } from "@/types/database";

type Loaded = {
  blob: Blob;
  filename: string;
  label: string;
  number: string;
  totalText: string;
  party: { name?: string | null; email?: string | null; phone?: string | null } | null;
  businessId: string;
  businessName: string;
  hasReplyTo: boolean;
};

/** Print / WhatsApp / Email for a quotation or a purchase, using the same PDF as Download. */
export function DocShareActions({ kind, id }: { kind: "quotation" | "purchase"; id: string }) {
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<(Loaded & { to: string; subject: string; message: string }) | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function load(): Promise<Loaded | null> {
    const isQ = kind === "quotation";
    const [doc, its, prof] = await Promise.all([
      supabase.from((isQ ? "quotations" : "purchases") as never).select("*").eq("id", id).single(),
      supabase.from((isQ ? "quotation_items" : "purchase_items") as never).select("*").eq(isQ ? "quotation_id" : "purchase_id", id),
      supabase.from("profiles" as never).select("*").single(),
    ]);
    const d = doc.data as any;
    const profile = prof.data as Profile | null;
    if (!d || !profile) return null;
    const { data: bd } = await supabase.from("businesses" as never).select("*").eq("id", d.business_id).maybeSingle();
    const business = bd as Business | null;
    const profileForPdf: Profile = business ? { ...profile, ...business, id: profile.id } : profile;

    let party: Loaded["party"] = null;
    let blob: Blob | void;
    let number: string;
    if (isQ) {
      if (d.customer_id) party = ((await supabase.from("customers" as never).select("*").eq("id", d.customer_id).single()).data as Customer | null);
      blob = await generateQuotationPdf({ quotation: d as Quotation, items: (its.data as QuotationItem[] | null) ?? [], customer: party as Customer | null, profile: profileForPdf, preview: true });
      number = (d as Quotation).quotation_number;
    } else {
      if (d.supplier_id) party = ((await supabase.from("suppliers" as never).select("*").eq("id", d.supplier_id).single()).data as Supplier | null);
      blob = await generatePurchasePdf({ purchase: d as Purchase, items: (its.data as PurchaseItem[] | null) ?? [], supplier: party as Supplier | null, profile: profileForPdf, preview: true });
      number = (d as Purchase).purchase_number;
    }
    if (!blob) return null;
    const label = isQ ? "Quotation" : "Purchase";
    return {
      blob,
      filename: `${label}-${number}.pdf`,
      label,
      number,
      totalText: `${CURRENCY_SYMBOLS[d.currency ?? "INR"] ?? ""}${Number(d.total).toLocaleString("en-IN")}`,
      party,
      businessId: d.business_id,
      businessName: business?.business_name ?? "",
      hasReplyTo: !!business?.email,
    };
  }

  async function run(action: "print" | "whatsapp" | "email") {
    setBusy(action);
    setDone(null);
    showLoader("Preparing…");
    try {
      const l = await load();
      if (!l) return;
      if (action === "print") {
        const url = URL.createObjectURL(l.blob);
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
        frame.src = url;
        frame.onload = () => {
          try {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
          } catch {
            window.open(url, "_blank");
          }
          setTimeout(() => {
            frame.remove();
            URL.revokeObjectURL(url);
          }, 60_000);
        };
        document.body.appendChild(frame);
      } else if (action === "whatsapp") {
        const text = `Hi${l.party?.name ? " " + l.party.name : ""}, here's ${l.label.toLowerCase()} #${l.number} for ${l.totalText}${l.businessName ? ` from ${l.businessName}` : ""}.`;
        await sharePdfToWhatsApp({
          blob: l.blob,
          filename: l.filename,
          text,
          fallbackText: `${text} The PDF just downloaded — please attach it here.`,
          phone: l.party?.phone,
          businessId: l.businessId,
        });
      } else {
        setErr(null);
        setDraft({
          ...l,
          to: l.party?.email ?? "",
          subject: `${l.label} #${l.number}${l.businessName ? ` from ${l.businessName}` : ""}`,
          message: `Hi${l.party?.name ? " " + l.party.name : ""},\n\nPlease find attached ${l.label.toLowerCase()} #${l.number} for ${l.totalText}.\n\nThank you,\n${l.businessName}`,
        });
      }
    } finally {
      setBusy(null);
      hideLoader();
    }
  }

  async function send() {
    if (!draft) return;
    setSending(true);
    setErr(null);
    const buf = new Uint8Array(await draft.blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const r = await sendInvoiceEmail({ businessId: draft.businessId, to: draft.to, subject: draft.subject, message: draft.message, pdfBase64: btoa(bin), filename: draft.filename });
    setSending(false);
    if (r.error) return setErr(r.error);
    setDone(`Email sent to ${draft.to}`);
    setDraft(null);
  }

  const B = "rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60";
  const field = "rounded-lg border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink focus:outline-none";

  return (
    <>
      {done && <span className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">{done}</span>}
      <button type="button" onClick={() => run("print")} disabled={busy !== null} className={`${B} bg-indigo-600 hover:bg-indigo-700`}>{busy === "print" ? "Preparing…" : "Print"}</button>
      <button type="button" onClick={() => run("whatsapp")} disabled={busy !== null} className={`${B} bg-emerald-600 hover:bg-emerald-700`}>{busy === "whatsapp" ? "Preparing…" : "WhatsApp"}</button>
      <button type="button" onClick={() => run("email")} disabled={busy !== null} className={`${B} bg-amber-600 hover:bg-amber-700`}>{busy === "email" ? "Preparing…" : "Email"}</button>

      {draft && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onClick={() => !sending && setDraft(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-xl2 bg-paper-card p-5 shadow-card">
            <p className="text-sm font-semibold text-text">Email {draft.label.toLowerCase()}</p>
            <input type="email" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} placeholder="To: email address" className={field} />
            <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={field} />
            <textarea rows={7} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} className={field} />
            <p className="text-xs text-text-soft">
              The PDF ({draft.filename}) is attached automatically.
              {!draft.hasReplyTo && " Add a Business email in Settings → General so replies reach you."}
            </p>
            {err && <p className="rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert">{err}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraft(null)} disabled={sending} className="flex-1 rounded-lg border border-paper-fold px-3 py-2 text-sm font-medium text-text hover:bg-paper disabled:opacity-60">Cancel</button>
              <button type="button" onClick={send} disabled={sending || !draft.to.trim()} className="flex-1 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-60">{sending ? "Sending…" : "Send email"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
