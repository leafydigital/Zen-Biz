"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPeriod } from "@/lib/actions/periodActions";
import { fyOptions, parsePeriod } from "@/lib/period";

const field = "rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-sm text-text focus:border-ink";

/** Year / financial-year / custom-dates filter. Sits next to the business switcher. */
export function PeriodSwitcher({ value, className = "" }: { value: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const cur = parsePeriod(value);
  const isCustom = cur.value.startsWith("custom_");
  const [custom, setCustom] = useState(isCustom);
  const [from, setFrom] = useState(cur.from ?? "");
  const [to, setTo] = useState(cur.to ?? "");
  const options = fyOptions();

  function apply(v: string) {
    start(async () => {
      await setPeriod(v);
      router.refresh();
    });
  }

  const selectValue = custom ? "custom" : options.some((o) => o.value === cur.value) || cur.value === "all" ? cur.value : "all";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-text-soft">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        </svg>
        <span className="sr-only">Period</span>
        <select
          aria-label="Show data for year or dates"
          title="Show invoices, billing, reports... for this year or dates. Customers and suppliers always stay visible."
          value={selectValue}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            apply(v);
          }}
          className={`${field} max-w-[11rem] font-semibold text-text`}
        >
          <option value="all">All time</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="custom">Custom dates…</option>
        </select>
      </label>
      {custom && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
          <span className="text-xs text-text-soft">to</span>
          <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
          <button
            type="button"
            disabled={!from || !to || from > to || pending}
            onClick={() => apply(`custom_${from}_${to}`)}
            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ink-light disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
