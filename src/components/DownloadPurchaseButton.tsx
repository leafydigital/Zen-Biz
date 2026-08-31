"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generatePurchasePdf } from "@/lib/generatePurchasePdf";
import type { Profile, Purchase, PurchaseItem, Supplier } from "@/types/database";

export function DownloadPurchaseButton({ purchaseId }: { purchaseId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const [purchaseResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("purchases").select("*").eq("id", purchaseId).single(),
      supabase.from("purchase_items").select("*").eq("purchase_id", purchaseId),
      supabase.from("profiles").select("*").single(),
    ]);

    const purchase = purchaseResult.data as Purchase | null;
    const items = itemsResult.data as PurchaseItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!purchase || !profile) {
      setLoading(false);
      return;
    }

    let supplier: Supplier | null = null;
    if (purchase.supplier_id) {
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", purchase.supplier_id)
        .single();
      supplier = data as Supplier | null;
    }

    await generatePurchasePdf({ purchase, items: items ?? [], supplier, profile });
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
