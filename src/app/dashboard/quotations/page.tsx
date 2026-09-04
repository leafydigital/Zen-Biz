import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuotationStatusSelect } from "@/components/QuotationStatusSelect";
import { DownloadQuotationButton } from "@/components/DownloadQuotationButton";
import { CURRENCY_SYMBOLS } from "@/types/database";

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function QuotationsPage() {
  const supabase = createClient();

  const { data: quotations } = (await supabase
    .from("quotations" as never)
    .select("*, customers(name)")
    .order("created_at", { ascending: false })) as { data: any[] | null };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Quotations</h1>
          <p className="text-sm text-text-soft">
            Priced offers you've sent to customers before they confirm an order.
          </p>
        </div>
        <Link
          href="/dashboard/quotations/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + New quotation
        </Link>
      </div>

      {!quotations || quotations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">No quotations yet.</p>
          <Link
            href="/dashboard/quotations/new"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-light"
          >
            Create your first quotation
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {quotations.map((q: any) => (
              <li
                key={q.id}
                className="flex flex-col gap-3 p-4 transition hover:bg-paper/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1ZM14 3.5V8h4M9 13h4M9 16.5h6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-text">#{q.quotation_number}</p>
                    <p className="text-xs text-text-soft">
                      {q.customers?.name ?? "Not specified"} · {q.quotation_date}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(q.total), q.currency)}
                  </span>
                  <QuotationStatusSelect quotationId={q.id} status={q.status} />
                  <DownloadQuotationButton quotationId={q.id} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
