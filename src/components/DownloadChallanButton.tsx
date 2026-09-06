"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateDeliveryChallanPdf } from "@/lib/generateDeliveryChallanPdf";
import type { Business, Customer, DeliveryChallan, DeliveryChallanItem, Profile } from "@/types/database";

export function DownloadChallanButton({ challanId }: { challanId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const [challanResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("delivery_challans" as never).select("*").eq("id", challanId).single(),
      supabase.from("delivery_challan_items" as never).select("*").eq("challan_id", challanId),
      supabase.from("profiles" as never).select("*").single(),
    ]);

    const challan = challanResult.data as DeliveryChallan | null;
    const items = itemsResult.data as DeliveryChallanItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!challan || !profile) {
      setLoading(false);
      return;
    }

    // Branding must come from THIS challan's own business, not whichever
    // business the signed-in user happens to have created first — see
    // the identical fix in DownloadInvoiceButton.
    const { data: businessData } = await supabase
      .from("businesses" as never)
      .select("*")
      .eq("id", challan.business_id)
      .maybeSingle();
    const business = businessData as Business | null;
    const profileForPdf: Profile = business ? { ...profile, ...business, id: profile.id } : profile;

    let customer: Customer | null = null;
    if (challan.customer_id) {
      const { data } = await supabase
        .from("customers" as never)
        .select("*")
        .eq("id", challan.customer_id)
        .single();
      customer = data as Customer | null;
    }

    await generateDeliveryChallanPdf({ challan, items: items ?? [], customer, profile: profileForPdf });
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
