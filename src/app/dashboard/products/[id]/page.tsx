import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductDetailView } from "@/components/ProductDetailView";
import { getLabels } from "@/lib/businessLabels";
import type { Product, Profile } from "@/types/database";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [productResult, profileResult] = await Promise.all([
    supabase.from("products").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
  ]);

  const product = productResult.data as Product | null;
  if (!product) notFound();

  const profile = profileResult.data as Profile | null;
  const labels = getLabels(profile?.business_type);

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
      />
    </div>
  );
}
