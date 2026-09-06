"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateQuotationPdf } from "@/lib/generateQuotationPdf";
import type { Business, Customer, Profile, Quotation, QuotationItem } from "@/types/database";

export function DownloadQuotationButton({ quotationId }: { quotationId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const [quotationResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("quotations" as never).select("*").eq("id", quotationId).single(),
      supabase.from("quotation_items" as never).select("*").eq("quotation_id", quotationId),
      supabase.from("profiles" as never).select("*").single(),
    ]);

    const quotation = quotationResult.data as Quotation | null;
    const items = itemsResult.data as QuotationItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!quotation || !profile) {
      setLoading(false);
      return;
    }

    // Branding must come from THIS quotation's own business, not
    // whichever business the signed-in user happens to have created
    // first — see the identical fix in DownloadInvoiceButton.
    const { data: businessData } = await supabase
      .from("businesses" as never)
      .select("*")
      .eq("id", quotation.business_id)
      .maybeSingle();
    const business = businessData as Business | null;
    const profileForPdf: Profile = business ? { ...profile, ...business, id: profile.id } : profile;

    let customer: Customer | null = null;
    if (quotation.customer_id) {
      const { data } = await supabase
        .from("customers" as never)
        .select("*")
        .eq("id", quotation.customer_id)
        .single();
      customer = data as Customer | null;
    }

    await generateQuotationPdf({ quotation, items: items ?? [], customer, profile: profileForPdf });
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
