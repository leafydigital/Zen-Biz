"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { generateBillingRecordPdf } from "@/lib/generateBillingRecordPdfWrapper";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import type { Business, Customer, Invoice, InvoiceItem, Profile } from "@/types/database";

/**
 * Prints the document itself (the same neat PDF as Download), not the whole
 * web page — so there's no sidebar or buttons, just the invoice/bill laid out
 * exactly like the PDF. The print dialog opens directly.
 */
export function PrintButton({ invoiceId }: { invoiceId: string }) {
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [busy, setBusy] = useState(false);

  async function handlePrint() {
    setBusy(true);
    showLoader("Preparing to print…");
    try {
      const [inv, its, prof] = await Promise.all([
        supabase.from("invoices" as never).select("*").eq("id", invoiceId).single(),
        supabase.from("invoice_items" as never).select("*").eq("invoice_id", invoiceId),
        supabase.from("profiles" as never).select("*").single(),
      ]);
      const invoice = inv.data as Invoice | null;
      const profile = prof.data as Profile | null;
      if (!invoice || !profile) return;

      const { data: bData } = await supabase.from("businesses" as never).select("*").eq("id", invoice.business_id).maybeSingle();
      const business = bData as Business | null;
      const profileForPdf: Profile = business ? { ...profile, ...business, id: profile.id } : profile;

      let customer: Customer | null = null;
      if (invoice.customer_id) {
        const { data } = await supabase.from("customers" as never).select("*").eq("id", invoice.customer_id).single();
        customer = data as Customer | null;
      }

      const args = { invoice, items: (its.data as InvoiceItem[] | null) ?? [], customer, profile: profileForPdf, preview: true };
      const blob =
        invoice.record_type === "billing_record" ? await generateBillingRecordPdf(args) : await generateInvoicePdf(args);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
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
    } finally {
      setBusy(false);
      hideLoader();
    }
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={busy}
      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60 bg-indigo-600 hover:bg-indigo-700"
    >
      {busy ? "Preparing…" : "Print"}
    </button>
  );
}
