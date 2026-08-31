import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LABELS } from "@/lib/planFeatures";
import type { SubscriptionPayment } from "@/types/database";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success-bg text-success",
  created: "bg-brass/15 text-brass-dark",
  failed: "bg-alert-bg text-alert",
};

export default async function BillingHistoryPage() {
  const supabase = createClient();

  const { data: payments } = (await supabase
    .from("subscription_payments")
    .select("*")
    .order("created_at", { ascending: false })) as { data: SubscriptionPayment[] | null };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/dashboard/settings?tab=plan"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-ink"
        >
          ← Back to Plan & Billing
        </Link>
        <h1 className="font-display text-2xl font-semibold text-text">
          Billing history
        </h1>
      </div>

      {!payments || payments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">No payments yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-text">
                    {PLAN_LABELS[p.plan]} — {p.billing_cycle}
                  </p>
                  <p className="text-xs text-text-soft">
                    {new Date(p.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(p.amount))}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold capitalize ${
                      STATUS_STYLES[p.status] ?? "bg-paper-fold text-text-soft"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
