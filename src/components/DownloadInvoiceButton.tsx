"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import type { Customer, Invoice, InvoiceItem, Profile } from "@/types/database";

export function DownloadInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const [invoiceResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", invoiceId).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId),
      supabase.from("profiles").select("*").single(),
    ]);

    const invoice = invoiceResult.data as Invoice | null;
    const items = itemsResult.data as InvoiceItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!invoice || !profile) {
      setLoading(false);
      return;
    }

    let customer: Customer | null = null;
    if (invoice.customer_id) {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", invoice.customer_id)
        .single();
      customer = data as Customer | null;
    }

    await generateInvoicePdf({ invoice, items: items ?? [], customer, profile });
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
