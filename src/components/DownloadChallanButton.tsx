"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateDeliveryChallanPdf } from "@/lib/generateDeliveryChallanPdf";
import type { Customer, DeliveryChallan, DeliveryChallanItem, Profile } from "@/types/database";

export function DownloadChallanButton({ challanId }: { challanId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const [challanResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("delivery_challans").select("*").eq("id", challanId).single(),
      supabase.from("delivery_challan_items").select("*").eq("challan_id", challanId),
      supabase.from("profiles").select("*").single(),
    ]);

    const challan = challanResult.data as DeliveryChallan | null;
    const items = itemsResult.data as DeliveryChallanItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!challan || !profile) {
      setLoading(false);
      return;
    }

    let customer: Customer | null = null;
    if (challan.customer_id) {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", challan.customer_id)
        .single();
      customer = data as Customer | null;
    }

    generateDeliveryChallanPdf({ challan, items: items ?? [], customer, profile });
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
