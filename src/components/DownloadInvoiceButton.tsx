"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { generateBillingRecordPdf } from "@/lib/generateBillingRecordPdfWrapper";
import type { Business, Customer, Invoice, InvoiceItem, Profile } from "@/types/database";

export function DownloadInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const [invoiceResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("invoices" as never).select("*").eq("id", invoiceId).single(),
      supabase.from("invoice_items" as never).select("*").eq("invoice_id", invoiceId),
      supabase.from("profiles" as never).select("*").single(),
    ]);

    const invoice = invoiceResult.data as Invoice | null;
    const items = itemsResult.data as InvoiceItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!invoice || !profile) {
      setLoading(false);
      return;
    }

    // The PDF's business branding (name, logo, address, GSTIN, bank
    // details, document design) must come from THIS invoice's own
    // business — not whichever business the signed-in user happens to
    // have created first. A user who belongs to more than one business
    // would otherwise get one business's invoice printed with a
    // different business's letterhead.
    const { data: businessData } = await supabase
      .from("businesses" as never)
      .select("*")
      .eq("id", invoice.business_id)
      .maybeSingle();
    const business = businessData as Business | null;

    // The PDF generator's Profile type carries both per-user settings
    // (id, plan, language) and business-branding fields. Merge the two
    // rather than changing that type everywhere it's used — the
    // business row's fields win for anything branding-related.
    const profileForPdf: Profile = business ? { ...profile, ...business, id: profile.id } : profile;

    if (!invoice) {
      setLoading(false);
      return;
    }

    let customer: Customer | null = null;
    if (invoice.customer_id) {
      const { data } = await supabase
        .from("customers" as never)
        .select("*")
        .eq("id", invoice.customer_id)
        .single();
      customer = data as Customer | null;
    }

    // Billing Records use their own dedicated PDF generator — kept
    // completely separate from the Invoice one so Billing Record layout
    // fixes can never change how an official Invoice PDF looks.
    if (invoice.record_type === "billing_record") {
      await generateBillingRecordPdf({ invoice, items: items ?? [], customer, profile: profileForPdf });
    } else {
      await generateInvoicePdf({ invoice, items: items ?? [], customer, profile: profileForPdf });
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper disabled:opacity-60"
    >
      {loading ? "Preparing…" : "Download PDF"}
    </button>
  );
}
