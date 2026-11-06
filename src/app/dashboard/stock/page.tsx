import { createClient } from "@/lib/supabase/server";
import { getLabels } from "@/lib/businessLabels";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { getBarcodeSettings } from "@/lib/barcode";
import { StockManager } from "@/components/StockManager";
import type { Product } from "@/types/database";

export default async function StockPage() {
  const supabase = createClient();
  const business = await getActiveBusiness();
  const businessId = business?.id ?? "";

  const { data: products } = (await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true })) as unknown as { data: Product[] | null };

  const labels = getLabels(business?.business_type);

  return (
    <StockManager
      businessId={businessId}
      businessName={business?.business_name ?? ""}
      products={products ?? []}
      itemLabelPlural={labels.itemPlural}
      barcodeSettings={getBarcodeSettings(business?.barcode_settings)}
      lowStockLevel={business?.low_stock_level ?? 5}
    />
  );
}
