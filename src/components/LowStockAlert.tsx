import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { needsAttention, type StockLimits } from "@/lib/stockLimits";

export async function LowStockAlert({ businessId, limits }: { businessId: string; limits: StockLimits }) {
  const supabase = createClient();
  const { data: all } = (await supabase
    .from("products" as never)
    .select("id, name, unit, stock_qty")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .not("stock_qty", "is", null)
    .order("stock_qty", { ascending: true })) as { data: { id: string; name: string; unit: string; stock_qty: number }[] | null };

  // Each item is compared with the limit set for its own unit (pieces, kg, grams...).
  const data = (all ?? [])
    .filter((p) => needsAttention(limits, Number(p.stock_qty), p.unit))
    .slice(0, 8);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl2 border border-amber-200 bg-amber-50 p-5 shadow-card sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-amber-900">
          <span aria-hidden="true">⚠️</span> Low stock alert
        </h2>
        <Link href="/dashboard/stock" className="text-xs font-semibold text-amber-800 underline">
          View stock
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
      <p className="mt-3 text-xs text-amber-800">Each item is checked against the stock limit set for its unit. Change limits in Stock.</p>
    </div>
  );
}
