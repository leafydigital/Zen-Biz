"use client";

import { ICON_BTN, DownloadIcon, Spinner } from "@/components/ActionIcons";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generatePurchasePdf } from "@/lib/generatePurchasePdf";
import type { Business, Profile, Purchase, PurchaseItem, Supplier } from "@/types/database";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";

export function DownloadPurchaseButton({ purchaseId }: { purchaseId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const { showLoader, hideLoader } = useGlobalLoader();

  async function handleDownload() {
    setLoading(true);
    showLoader("Preparing PDF…");

    function stopLoading() {
      setLoading(false);
      hideLoader();
    }

    const [purchaseResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("purchases" as never).select("*").eq("id", purchaseId).single(),
      supabase.from("purchase_items" as never).select("*").eq("purchase_id", purchaseId),
      supabase.from("profiles" as never).select("*").single(),
    ]);

    const purchase = purchaseResult.data as Purchase | null;
    const items = itemsResult.data as PurchaseItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!purchase || !profile) {
      stopLoading();
      return;
    }

    // Branding must come from THIS purchase's own business, not
    // whichever business the signed-in user happens to have created
    // first — see the identical fix in DownloadInvoiceButton.
    const { data: businessData } = await supabase
      .from("businesses" as never)
      .select("*")
      .eq("id", purchase.business_id)
      .maybeSingle();
    const business = businessData as Business | null;
    const profileForPdf: Profile = business ? { ...profile, ...business, id: profile.id } : profile;

    let supplier: Supplier | null = null;
    if (purchase.supplier_id) {
      const { data } = await supabase
        .from("suppliers" as never)
        .select("*")
        .eq("id", purchase.supplier_id)
        .single();
      supplier = data as Supplier | null;
    }

    await generatePurchasePdf({ purchase, items: items ?? [], supplier, profile: profileForPdf });
    stopLoading();
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title="Download PDF"
      aria-label="Download PDF"
      className={`${ICON_BTN} bg-rose-600 hover:bg-rose-700`}
    >
      {loading ? <Spinner /> : <DownloadIcon />}
    </button>
  );
}
