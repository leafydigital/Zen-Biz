"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateQuotationPdf } from "@/lib/generateQuotationPdf";
import type { Customer, Profile, Quotation, QuotationItem } from "@/types/database";

export function DownloadQuotationButton({ quotationId }: { quotationId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const [quotationResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("quotations").select("*").eq("id", quotationId).single(),
      supabase.from("quotation_items").select("*").eq("quotation_id", quotationId),
      supabase.from("profiles").select("*").single(),
    ]);

    const quotation = quotationResult.data as Quotation | null;
    const items = itemsResult.data as QuotationItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!quotation || !profile) {
      setLoading(false);
      return;
    }

    let customer: Customer | null = null;
    if (quotation.customer_id) {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", quotation.customer_id)
        .single();
      customer = data as Customer | null;
    }

    await generateQuotationPdf({ quotation, items: items ?? [], customer, profile });
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
