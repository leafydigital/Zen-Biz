/**
 * The "period" filter shown next to the business switcher: All time, a financial
 * year (India: 1 April to 31 March) or custom dates. It narrows invoices, billing
 * records, quotations, proforma, purchases, challans, reports and income/expenses.
 * Customers and suppliers are never filtered.
 *
 * Stored as a cookie string: "all" | "fy-2026" | "custom_2026-01-01_2026-03-31".
 */
export const PERIOD_COOKIE = "zenbiz-period";

export interface Period {
  value: string;
  from: string | null;
  to: string | null;
  label: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function currentFyStart(now: Date = new Date()): number {
  return now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
}

export function fyLabel(start: number) {
  return `${start} - ${start + 1}`;
}

/** Current financial year and the previous few, newest first. */
export function fyOptions(count = 6): { value: string; label: string }[] {
  const s = currentFyStart();
  return Array.from({ length: count }, (_, i) => ({ value: `fy-${s - i}`, label: `FY ${fyLabel(s - i)}` }));
}

export function parsePeriod(value?: string | null): Period {
  const v = value ?? "all";
  const fy = /^fy-(\d{4})$/.exec(v);
  if (fy) {
    const y = Number(fy[1]);
    return { value: v, from: `${y}-04-01`, to: `${y + 1}-03-31`, label: `FY ${fyLabel(y)}` };
  }
  const c = /^custom_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(v);
  if (c && ISO.test(c[1]) && ISO.test(c[2]) && c[1] <= c[2]) {
    return { value: v, from: c[1], to: c[2], label: `${c[1]} to ${c[2]}` };
  }
  return { value: "all", from: null, to: null, label: "All time" };
}

/** Adds the period's date range to a Supabase query on the given date column. */
export function applyPeriod<T>(query: T, column: string, period: Period): T {
  let q: any = query;
  if (period.from) q = q.gte(column, period.from);
  if (period.to) q = q.lte(column, period.to);
  return q as T;
}

export function isoDate(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export const periodFrom = (p: Period) => p.from ?? "0001-01-01";
export const periodTo = (p: Period) => p.to ?? "9999-12-31";
