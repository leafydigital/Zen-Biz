import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PurchaseStatusSelect } from "@/components/PurchaseStatusSelect";
import { DownloadPurchaseButton } from "@/components/DownloadPurchaseButton";
import { LockedFeature } from "@/components/LockedFeature";
import { getPlanFeatures } from "@/lib/planFeatures";
import { CURRENCY_SYMBOLS } from "@/types/database";
import type { Profile } from "@/types/database";

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PurchasesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles" as never)
    .select("plan")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Pick<Profile, "plan"> | null };

  if (!getPlanFeatures(profile?.plan ?? "starter").purchases) {
    return (
      <LockedFeature
        title="Purchases is a Professional plan feature"
        description="Track stock and goods you buy in from suppliers — available on the Professional plan and above."
        requiredPlan="professional"
      />
    );
  }

  const { data: purchases } = (await supabase
    .from("purchases" as never)
    .select("*, suppliers(name)")
    .order("created_at", { ascending: false })) as { data: any[] | null };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Purchases</h1>
          <p className="text-sm text-text-soft">
            Stock or goods you've bought in. Adding stock-tracked items here
            increases their stock automatically.
          </p>
        </div>
        <Link
          href="/dashboard/purchases/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + New purchase
        </Link>
      </div>

      {!purchases || purchases.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">No purchases yet.</p>
          <Link
            href="/dashboard/purchases/new"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-light"
          >
            Record your first purchase
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {purchases.map((p: any) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 p-4 transition hover:bg-paper/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M3 4h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h8.2a1.5 1.5 0 0 0 1.48-1.24L20 8H6.2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-text">#{p.purchase_number}</p>
                    <p className="text-xs text-text-soft">
                      {p.suppliers?.name ?? "Not specified"} · {p.purchase_date}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(p.total), p.currency)}
                  </span>
                  <PurchaseStatusSelect purchaseId={p.id} status={p.status} paymentMethod={p.payment_method} />
                  <DownloadPurchaseButton purchaseId={p.id} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
