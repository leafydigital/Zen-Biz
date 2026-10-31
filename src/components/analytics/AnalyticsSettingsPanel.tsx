"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAnalyticsPreferences } from "@/lib/actions/analyticsActions";
import { DEFAULT_ANALYTICS_PREFERENCES } from "@/types/database";
import type { AnalyticsChartId, AnalyticsDateRange, AnalyticsPreferences } from "@/types/database";

const CHART_LABELS: Record<AnalyticsChartId, string> = {
  profitLoss: "Profit & Loss",
  expenseBreakdown: "Expense Breakdown",
  salesVsPurchases: "Sales vs Purchases",
  outstandingCollected: "Outstanding / Collected",
  topProducts: "Top Products",
  invoiceStatus: "Invoice Status",
};

const TYPE_TOGGLEABLE_CHARTS: AnalyticsChartId[] = ["profitLoss"];

const DATE_RANGE_LABELS: Record<AnalyticsDateRange, string> = {
  thisMonth: "This Month",
  "3months": "3 Months",
  "6months": "6 Months",
  thisYear: "This Year",
};

export function AnalyticsSettingsPanel({
  preferences,
}: {
  preferences: AnalyticsPreferences;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AnalyticsPreferences>(preferences);
  const [saving, setSaving] = useState(false);

  // Every change is applied and saved straight away (no Save button).
  async function apply(next: AnalyticsPreferences) {
    setDraft(next);
    setSaving(true);
    const result = await saveAnalyticsPreferences(next);
    setSaving(false);
    if (!result.error) router.refresh();
  }

  function toggleChart(id: AnalyticsChartId) {
    apply({
      ...draft,
      visibleCharts: draft.visibleCharts.includes(id)
        ? draft.visibleCharts.filter((c) => c !== id)
        : [...draft.visibleCharts, id],
    });
  }

  function setChartType(id: AnalyticsChartId, type: "line" | "bar") {
    apply({ ...draft, chartTypes: { ...draft.chartTypes, [id]: type } });
  }

  function handleReset() {
    apply(DEFAULT_ANALYTICS_PREFERENCES);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setDraft(preferences);
          setOpen((prev) => !prev);
        }}
        aria-label="Customize analytics"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-soft transition hover:bg-paper hover:text-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl2 border border-paper-fold bg-white p-4 shadow-lg">
            <p className="mb-3 text-sm font-semibold text-text">Customize Analytics</p>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-soft">
              Date range
            </p>
            <div className="mb-4 grid grid-cols-2 gap-1.5">
              {(Object.keys(DATE_RANGE_LABELS) as AnalyticsDateRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => apply({ ...draft, dateRange: range })}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    draft.dateRange === range
                      ? "border-ink bg-ink text-paper"
                      : "border-paper-fold text-text hover:border-ink/40"
                  }`}
                >
                  {DATE_RANGE_LABELS[range]}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-soft">
              Visible charts
            </p>
            <div className="mb-4 flex flex-col gap-1">
              {(Object.keys(CHART_LABELS) as AnalyticsChartId[]).map((id) => (
                <div key={id} className="flex items-center justify-between gap-2 py-1">
                  <label className="flex flex-1 items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={draft.visibleCharts.includes(id)}
                      onChange={() => toggleChart(id)}
                      className="h-4 w-4 rounded border-paper-fold accent-ink"
                    />
                    {CHART_LABELS[id]}
                  </label>
                  {TYPE_TOGGLEABLE_CHARTS.includes(id) && draft.visibleCharts.includes(id) && (
                    <div className="flex gap-1">
                      {(["line", "bar"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setChartType(id, type)}
                          className={`rounded px-1.5 py-0.5 text-[0.65rem] font-medium capitalize transition ${
                            (draft.chartTypes[id] ?? "line") === type
                              ? "bg-ink text-paper"
                              : "bg-paper text-text-soft"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-text-soft underline-offset-2 hover:text-text hover:underline"
              >
                Reset to default
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
              >
                {saving ? "Updating…" : "Close"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
