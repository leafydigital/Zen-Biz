import { DocShareActions } from "@/components/DocShareActions";
import { getPeriod } from "@/lib/getPeriod";
import { periodFrom, periodTo } from "@/lib/period";
import { ICON_BTN, ViewIcon } from "@/components/ActionIcons";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuotationStatusSelect } from "@/components/QuotationStatusSelect";
import { DownloadQuotationButton } from "@/components/DownloadQuotationButton";
import { CURRENCY_SYMBOLS } from "@/types/database";
import { getActiveBusiness } from "@/lib/getActiveBusiness";

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function QuotationsPage() {
  const supabase = createClient();
  const activeBusiness = await getActiveBusiness();
  const period = getPeriod();

  const base = () =>
    supabase.from("quotations" as never).select("*, customers(name)").eq("business_id", activeBusiness?.id ?? "")
      .gte("quotation_date", periodFrom(period)).lte("quotation_date", periodTo(period));
  let res = (await base().eq("doc_kind", "quotation").order("created_at", { ascending: false })) as { data: any[] | null; error: unknown };
  // Before the proforma migration is applied there is no doc_kind column: show everything.
  if (res.error) res = (await base().order("created_at", { ascending: false })) as { data: any[] | null; error: unknown };
  const quotations = res.data;

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
                <Link href={`/dashboard/quotations/${q.id}`} className="flex min-w-0 flex-1 items-center gap-3">
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
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:flex-nowrap sm:justify-end">
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(q.total), q.currency)}
                  </span>
                  <QuotationStatusSelect quotationId={q.id} status={q.status} />
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Link href={`/dashboard/quotations/${q.id}`} title="View" aria-label="View" className={`${ICON_BTN} bg-violet-600 hover:bg-violet-700`}><ViewIcon /></Link>
                  <DownloadQuotationButton quotationId={q.id} />
          <DocShareActions kind="quotation" id={q.id} />
                  <DeleteRecordButton table="quotations" id={q.id} label="quotation" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
