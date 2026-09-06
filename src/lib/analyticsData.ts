import { createClient } from "@/lib/supabase/server";
import type { AnalyticsDateRange } from "@/types/database";

/**
 * Converts a date-range selection into a concrete start date. Only the
 * start matters — every query filters `>= start`, since "now" is always
 * the implicit end. Keeping this in one place means every chart's query
 * is scoped to the same window rather than each one computing its own
 * (and potentially drifting apart).
 */
export function dateRangeStart(range: AnalyticsDateRange): Date {
  const now = new Date();
  const start = new Date(now);
  switch (range) {
    case "thisMonth":
      start.setDate(1);
      break;
    case "3months":
      start.setMonth(start.getMonth() - 2, 1);
      break;
    case "6months":
      start.setMonth(start.getMonth() - 5, 1);
      break;
    case "thisYear":
      start.setMonth(0, 1);
      break;
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

/** Every month key from `start` through the current month, in order —
 * so a chart shows a continuous line/bars even for months with zero
 * activity, rather than silently skipping gaps. */
function monthKeysInRange(start: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const end = new Date();
  while (cursor <= end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

export interface ProfitLossPoint {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

/**
 * Revenue = paid invoices (the amount actually received — see the
 * existing Profit & Loss page's own convention: "paid sales" means
 * status = 'paid', full total counted). Expenses = paid purchases, same
 * convention. Reuses the identical definition the existing P&L report
 * page already uses, so this chart and that page never disagree.
 */
export async function getProfitLossData(
  businessId: string,
  range: AnalyticsDateRange
): Promise<ProfitLossPoint[]> {
  const supabase = createClient();
  const start = dateRangeStart(range);

  const [{ data: invoices }, { data: purchases }] = await Promise.all([
    supabase
      .from("invoices" as never)
      .select("invoice_date, total")
      .eq("business_id", businessId)
      .eq("record_type", "invoice")
      .eq("status", "paid")
      .gte("invoice_date", start.toISOString().slice(0, 10)),
    supabase
      .from("purchases" as never)
      .select("purchase_date, total")
      .eq("business_id", businessId)
      .eq("status", "paid")
      .gte("purchase_date", start.toISOString().slice(0, 10)),
  ]);

  const months = new Map<string, { revenue: number; expenses: number }>();
  for (const key of monthKeysInRange(start)) months.set(key, { revenue: 0, expenses: 0 });

  for (const inv of (invoices ?? []) as { invoice_date: string; total: number }[]) {
    const key = monthKey(inv.invoice_date);
    const m = months.get(key);
    if (m) m.revenue += Number(inv.total ?? 0);
  }
  for (const pur of (purchases ?? []) as { purchase_date: string; total: number }[]) {
    const key = monthKey(pur.purchase_date);
    const m = months.get(key);
    if (m) m.expenses += Number(pur.total ?? 0);
  }

  return Array.from(months.entries()).map(([key, v]) => ({
    key,
    label: monthLabel(key),
    revenue: v.revenue,
    expenses: v.expenses,
    profit: v.revenue - v.expenses,
  }));
}

export interface ExpenseBreakdownSlice {
  name: string;
  value: number;
  percent: number;
}

/**
 * Only "Purchases" — Zen Biz has no separate Expenses feature/table today
 * (confirmed by inspecting the schema before building this), so this
 * deliberately does not invent categories that don't exist as real data.
 */
export async function getExpenseBreakdownData(
  businessId: string,
  range: AnalyticsDateRange
): Promise<ExpenseBreakdownSlice[]> {
  const supabase = createClient();
  const start = dateRangeStart(range);

  const { data: purchases } = await supabase
    .from("purchases" as never)
    .select("total")
    .eq("business_id", businessId)
    .neq("status", "cancelled")
    .gte("purchase_date", start.toISOString().slice(0, 10));

  const total = ((purchases as { total: number }[] | null) ?? []).reduce(
    (sum, p) => sum + Number(p.total ?? 0),
    0
  );

  if (total === 0) return [];
  return [{ name: "Purchases", value: total, percent: 100 }];
}

export interface SalesVsPurchasesPoint {
  key: string;
  label: string;
  sales: number;
  purchases: number;
}

export async function getSalesVsPurchasesData(
  businessId: string,
  range: AnalyticsDateRange
): Promise<SalesVsPurchasesPoint[]> {
  const supabase = createClient();
  const start = dateRangeStart(range);

  const [{ data: invoices }, { data: purchases }] = await Promise.all([
    supabase
      .from("invoices" as never)
      .select("invoice_date, total")
      .eq("business_id", businessId)
      .eq("record_type", "invoice")
      .neq("status", "cancelled")
      .gte("invoice_date", start.toISOString().slice(0, 10)),
    supabase
      .from("purchases" as never)
      .select("purchase_date, total")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .gte("purchase_date", start.toISOString().slice(0, 10)),
  ]);

  const months = new Map<string, { sales: number; purchases: number }>();
  for (const key of monthKeysInRange(start)) months.set(key, { sales: 0, purchases: 0 });

  for (const inv of (invoices ?? []) as { invoice_date: string; total: number }[]) {
    const m = months.get(monthKey(inv.invoice_date));
    if (m) m.sales += Number(inv.total ?? 0);
  }
  for (const pur of (purchases ?? []) as { purchase_date: string; total: number }[]) {
    const m = months.get(monthKey(pur.purchase_date));
    if (m) m.purchases += Number(pur.total ?? 0);
  }

  return Array.from(months.entries()).map(([key, v]) => ({
    key,
    label: monthLabel(key),
    sales: v.sales,
    purchases: v.purchases,
  }));
}

export interface OutstandingCollectedData {
  collected: number;
  outstanding: number;
}

/**
 * Collected = the amount actually received across paid + partial
 * invoices (full total for 'paid', amount_paid for 'partial') — the
 * same "revenue actually received" definition already used on the main
 * dashboard overview page. Outstanding is the mirror: the unpaid
 * remainder of both 'unpaid' and 'partial' invoices.
 */
export async function getOutstandingCollectedData(
  businessId: string,
  range: AnalyticsDateRange
): Promise<OutstandingCollectedData> {
  const supabase = createClient();
  const start = dateRangeStart(range);

  const { data: invoices } = await supabase
    .from("invoices" as never)
    .select("total, status, amount_paid")
    .eq("business_id", businessId)
    .eq("record_type", "invoice")
    .gte("invoice_date", start.toISOString().slice(0, 10));

  let collected = 0;
  let outstanding = 0;
  for (const inv of (invoices ?? []) as { total: number; status: string; amount_paid: number }[]) {
    const total = Number(inv.total ?? 0);
    const paid = Number(inv.amount_paid ?? 0);
    if (inv.status === "paid") collected += total;
    else if (inv.status === "partial") {
      collected += paid;
      outstanding += total - paid;
    } else if (inv.status === "unpaid") {
      outstanding += total;
    }
  }

  return { collected, outstanding };
}

export interface TopProductPoint {
  name: string;
  value: number;
}

/**
 * Sums invoice-line revenue per product/description across paid,
 * partial, and unpaid invoices (cancelled excluded) within the date
 * range, returning the top N by total sales value.
 */
export async function getTopProductsData(
  businessId: string,
  range: AnalyticsDateRange,
  limit: 5 | 10 = 5
): Promise<TopProductPoint[]> {
  const supabase = createClient();
  const start = dateRangeStart(range);

  // invoice_items has no business_id filter of its own that's meaningful
  // without joining through invoices, so this filters by joining on the
  // invoices table's own business_id and date, matching the same
  // business + date-range scoping every other chart here uses.
  const { data: rows } = await supabase
    .from("invoice_items" as never)
    .select("description, line_total, invoices!inner(business_id, record_type, status, invoice_date)")
    .eq("invoices.business_id", businessId)
    .eq("invoices.record_type", "invoice")
    .neq("invoices.status", "cancelled")
    .gte("invoices.invoice_date", start.toISOString().slice(0, 10));

  const totals = new Map<string, number>();
  for (const row of (rows ?? []) as { description: string; line_total: number }[]) {
    const name = row.description || "Unnamed item";
    totals.set(name, (totals.get(name) ?? 0) + Number(row.line_total ?? 0));
  }

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export interface InvoiceStatusSlice {
  name: string;
  value: number;
  count: number;
}

/**
 * "Overdue" isn't a stored status in Zen Biz (schema only has unpaid /
 * partial / paid / cancelled) — it's derived here as an unpaid or
 * partial invoice whose due_date has already passed, matching how the
 * word is normally understood rather than inventing a new database
 * value.
 */
export async function getInvoiceStatusData(
  businessId: string,
  range: AnalyticsDateRange
): Promise<InvoiceStatusSlice[]> {
  const supabase = createClient();
  const start = dateRangeStart(range);

  const { data: invoices } = await supabase
    .from("invoices" as never)
    .select("total, status, due_date")
    .eq("business_id", businessId)
    .eq("record_type", "invoice")
    .neq("status", "cancelled")
    .gte("invoice_date", start.toISOString().slice(0, 10));

  const today = new Date().toISOString().slice(0, 10);
  const buckets = {
    Paid: { value: 0, count: 0 },
    Unpaid: { value: 0, count: 0 },
    Partial: { value: 0, count: 0 },
    Overdue: { value: 0, count: 0 },
  };

  for (const inv of (invoices ?? []) as { total: number; status: string; due_date: string | null }[]) {
    const total = Number(inv.total ?? 0);
    const isOverdue =
      (inv.status === "unpaid" || inv.status === "partial") &&
      inv.due_date !== null &&
      inv.due_date < today;
    if (isOverdue) {
      buckets.Overdue.value += total;
      buckets.Overdue.count += 1;
    } else if (inv.status === "paid") {
      buckets.Paid.value += total;
      buckets.Paid.count += 1;
    } else if (inv.status === "partial") {
      buckets.Partial.value += total;
      buckets.Partial.count += 1;
    } else if (inv.status === "unpaid") {
      buckets.Unpaid.value += total;
      buckets.Unpaid.count += 1;
    }
  }

  return Object.entries(buckets)
    .map(([name, v]) => ({ name, value: v.value, count: v.count }))
    .filter((slice) => slice.count > 0);
}
