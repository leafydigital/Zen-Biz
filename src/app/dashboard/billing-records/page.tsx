import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY_SYMBOLS } from "@/types/database";

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function BillingRecordsPage() {
  const supabase = createClient();

  const { data: records } = (await supabase
    .from("invoices" as never)
    .select("id, total, currency, invoice_date, converted_invoice_id, customers(name)")
    .eq("record_type", "billing_record")
    .order("created_at", { ascending: false })) as { data: any[] | null };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Billing Records</h1>
          <p className="text-sm text-text-soft">
            Records for your own reference — not official invoices.
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new?type=billing"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + New billing record
        </Link>
      </div>

      {!records || records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">
            No billing records yet. Save one to keep an internal note of a sale
            without using up your invoice limit.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 p-4 transition hover:bg-paper/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link href={`/dashboard/billing-records/${r.id}`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brass/15 text-brass-dark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1ZM14 3.5V8h4M9 13h6M9 16.5h6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <p className="font-medium text-text underline-offset-2 hover:underline">
                      {r.customers?.name ?? "Walk-in customer"}
                    </p>
                    <p className="text-xs text-text-soft">{r.invoice_date}</p>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(r.total), r.currency)}
                  </span>
                  {r.converted_invoice_id ? (
                    <Link
                      href={`/dashboard/invoices/${r.converted_invoice_id}`}
                      className="rounded-full bg-success-bg px-2.5 py-0.5 text-[0.7rem] font-semibold text-success"
                    >
                      Converted to Invoice
                    </Link>
                  ) : (
                    <span className="rounded-full bg-brass/15 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brass-dark">
                      Not yet invoiced
                    </span>
                  )}
                  <Link
                    href={`/dashboard/billing-records/${r.id}`}
                    className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
