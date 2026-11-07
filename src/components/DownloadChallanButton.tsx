"use client";

import { ICON_BTN, DownloadIcon, Spinner } from "@/components/ActionIcons";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateDeliveryChallanPdf } from "@/lib/generateDeliveryChallanPdf";
import type { Business, Customer, DeliveryChallan, DeliveryChallanItem, Profile } from "@/types/database";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";

export function DownloadChallanButton({ challanId }: { challanId: string }) {
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

    const [challanResult, itemsResult, profileResult] = await Promise.all([
      supabase.from("delivery_challans" as never).select("*").eq("id", challanId).single(),
      supabase.from("delivery_challan_items" as never).select("*").eq("challan_id", challanId),
      supabase.from("profiles" as never).select("*").single(),
    ]);

    const challan = challanResult.data as DeliveryChallan | null;
    const items = itemsResult.data as DeliveryChallanItem[] | null;
    const profile = profileResult.data as Profile | null;

    if (!challan || !profile) {
      stopLoading();
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
