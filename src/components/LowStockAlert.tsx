import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/** Stock at or below this count is flagged as low. */
export const LOW_STOCK_LEVEL = 5;

export async function LowStockAlert({ businessId, level = LOW_STOCK_LEVEL }: { businessId: string; level?: number }) {
  const supabase = createClient();
  const { data } = (await supabase
    .from("products" as never)
    .select("id, name, unit, stock_qty")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .not("stock_qty", "is", null)
    .lte("stock_qty", level)
    .order("stock_qty", { ascending: true })
    .limit(8)) as { data: { id: string; name: string; unit: string; stock_qty: number }[] | null };

  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-xl2 border border-amber-200 bg-amber-50 p-5 shadow-card sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-amber-900">
          <span aria-hidden="true">⚠️</span> Low stock alert
        </h2>
        <Link href="/dashboard/products" className="text-xs font-semibold text-amber-800 underline">
          View products
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {data.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-text">{p.name}</span>
            <span className={`ml-3 shrink-0 font-ledger font-semibold tabular-nums ${Number(p.stock_qty) <= 0 ? "text-alert" : "text-amber-700"}`}>
              {Number(p.stock_qty) <= 0 ? "Out of stock" : `${p.stock_qty} ${p.unit ?? ""} left`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-amber-800">Items with {level} or fewer in stock are shown here.</p>
    </div>
  );
}
