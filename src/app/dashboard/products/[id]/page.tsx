import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductDetailView } from "@/components/ProductDetailView";
import { getLabels } from "@/lib/businessLabels";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import type { Business, Product } from "@/types/database";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [productResult, profile] = await Promise.all([
    supabase.from("products").select("*").eq("id", params.id).maybeSingle(),
    getCurrentProfile(),
  ]);

  const product = productResult.data as Product | null;
  if (!product) notFound();

  // Business type must come from THIS product's own business — not
  // whichever business happens to be active right now, since this page
  // can be reached via a direct link regardless of the current
  // switcher selection (same reasoning as the invoice edit page).
  // profiles.business_type is a stale, per-user leftover field from
  // before multi-business support — it never reflects any specific
  // business's actual type, which was showing every business's Items
  // page with whichever type the user's very first business happened
  // to have.
  const { data: businessData } = await supabase
    .from("businesses" as never)
    .select("business_type")
    .eq("id", product.business_id)
    .maybeSingle();
  const businessType = (businessData as Pick<Business, "business_type"> | null)?.business_type;

  const labels = getLabels(businessType);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-ink"
      >
        ← Back to {labels.itemPlural}
      </Link>
      <ProductDetailView
        product={product}
        itemLabel={labels.itemSingular}
        defaultUnit={labels.unitOptions[0] ?? "item"}
        unitOptions={labels.unitOptions}
        stockTrackingDefault={labels.stockTrackingDefault}
        stockHint={labels.stockHint}
        plan={profile?.plan ?? "starter"}
      />
    </div>
  );
}
