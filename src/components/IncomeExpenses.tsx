"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import { ICON_BTN, TrashIcon } from "@/components/ActionIcons";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type CashOccurrence } from "@/lib/cashEntries";

const field = "w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10";

function money(n: number, currency: string) {
  const sym = currency === "INR" ? "₹" : currency + " ";
  return `${sym}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Add and list income and expenses (salary, petrol, rent, outside income...). */
export function IncomeExpenses({
  rows,
  ownerId,
  businessId,
  currency,
  periodLabel,
  missingTable,
}: {
  rows: CashOccurrence[];
  ownerId: string;
  businessId: string;
  currency: string;
  periodLabel: string;
  missingTable: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();

  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [custom, setCustom] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [month, setMonth] = useState("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const cats = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const months = useMemo(() => Array.from(new Set(rows.map((r) => r.date.slice(0, 7)))).sort().reverse(), [rows]);
  const shown = rows.filter((r) => (filter === "all" || r.kind === filter) && (month === "all" || r.date.startsWith(month)));
  const income = shown.filter((r) => r.kind === "income").reduce((t, r) => t + r.amount, 0);
  const expense = shown.filter((r) => r.kind === "expense").reduce((t, r) => t + r.amount, 0);

  function pickKind(k: "income" | "expense") {
    setKind(k);
    setCategory((k === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]);
    setCustom("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!(amt > 0)) return setError("Enter an amount.");
    const cat = category === "__custom" ? custom.trim() : category;
    if (!cat) return setError("Enter a category name.");
    setSaving(true);
    showLoader("Saving…");
    const { error: err } = await supabase.from("cash_entries" as never).insert({
      owner_id: ownerId,
      business_id: businessId,
      kind,
      category: cat,
      amount: amt,
      entry_date: date,
      note: note.trim() || null,
      repeat_monthly: repeat,
      repeat_until: repeat && until ? until : null,
    } as never);
    setSaving(false);
    hideLoader();
    if (err) return setError(err.message);
    setAmount("");
    setNote("");
    setRepeat(false);
    setUntil("");
    router.refresh();
  }

  async function remove(id: string) {
    showLoader("Deleting…");
    const { error: err } = await supabase.from("cash_entries" as never).delete().eq("id", id);
    hideLoader();
    setConfirmId(null);
    if (err) return setError(err.message);
    router.refresh();
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text-soft hover:bg-paper"}`;

  return (
    <div className="flex flex-col gap-5">
      {missingTable && (
        <p className="rounded-xl bg-brass/10 px-4 py-3 text-sm text-brass-dark">
          One-time database update needed: run supabase/migration_56.sql in the Supabase SQL editor, then reload this page.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Income", money(income, currency), "border-emerald-200 bg-emerald-50 text-emerald-700"],
          ["Expenses", money(expense, currency), "border-rose-200 bg-rose-50 text-rose-700"],
          ["Net (income − expenses)", money(income - expense, currency), income - expense >= 0 ? "border-violet-200 bg-violet-50 text-violet-700" : "border-red-300 bg-red-50 text-red-700"],
        ].map(([l, v, tone]) => (
          <div key={l} className={`rounded-xl2 border p-4 shadow-card ${tone}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">{l}</p>
            <p className="mt-1.5 font-ledger text-xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border border-paper-fold bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-text">Add {kind === "income" ? "income" : "expense"}</h2>
          <div className="inline-flex rounded-full bg-paper p-1 text-sm" role="radiogroup" aria-label="Type">
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => pickKind(k)}
                className={`rounded-full px-4 py-1.5 font-medium capitalize transition ${kind === k ? (k === "income" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "text-text-soft"}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom">Other (type name)…</option>
            </select>
          </label>
          {category === "__custom" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Category name</span>
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Staff bonus" className={field} />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Note (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Ravi, bike fuel" className={field} />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Amount</span>
            <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={field} />
          </label>
          {category === "__custom" && (
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-text">Note (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-paper/60 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-text">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="h-4 w-4 accent-ink" />
            Repeat every month (salary, rent...) from this date
          </label>
          {repeat && (
            <label className="flex flex-wrap items-center gap-2 text-sm text-text-soft">
              Stop after (optional)
              <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-sm text-text" />
            </label>
          )}
        </div>

        {error && <p className="rounded-lg bg-alert-bg px-3 py-2 text-sm text-alert">{error}</p>}
        <button type="submit" disabled={saving || missingTable} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-60 sm:w-fit">
          {saving ? "Saving…" : `Save ${kind}`}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "income", "expense"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={chip(filter === f)}>
              {f === "all" ? "All" : f === "income" ? "Income" : "Expenses"}
            </button>
          ))}
          <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="ml-auto rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-sm text-text">
            <option value="all">All months ({periodLabel})</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-10 text-center text-sm text-text-soft">Nothing recorded for this period.</p>
        ) : (
          <ul className="divide-y divide-paper-fold overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
            {shown.map((r) => (
              <li key={r.id + r.date} className="flex items-center gap-3 p-3.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold ${r.kind === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`} aria-hidden="true">
                  {r.kind === "income" ? "+" : "−"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {r.category}
                    {r.repeating && <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[0.65rem] font-semibold text-ink">Monthly</span>}
                  </p>
                  <p className="truncate text-xs text-text-soft">
                    {r.date}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <p className={`font-ledger text-sm font-semibold tabular-nums ${r.kind === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                  {r.kind === "income" ? "+" : "−"}
                  {money(r.amount, currency)}
                </p>
                <button type="button" title="Delete" aria-label="Delete" onClick={() => setConfirmId(r.id)} className={`${ICON_BTN} bg-red-600 hover:bg-red-700`}>
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-text-soft">
          Totals feed the{" "}
          <Link href="/dashboard/profit-loss" className="font-semibold text-ink underline">
            Profit &amp; Loss
          </Link>{" "}
          report together with your paid sales and purchases.
        </p>
      </div>

      {confirmId && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4" onClick={() => setConfirmId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[340px] rounded-xl2 bg-paper-card p-5 shadow-card">
            <p className="mb-1.5 text-sm font-semibold text-text">Delete this entry?</p>
            <p className="mb-4 text-sm text-text-soft">If it repeats every month, all its months are removed. This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmId(null)} className="flex-1 rounded-lg border border-paper-fold px-3 py-2 text-sm font-medium text-text hover:bg-paper">
                Cancel
              </button>
              <button type="button" onClick={() => remove(confirmId)} className="flex-1 rounded-lg bg-alert px-3 py-2 text-sm font-semibold text-white hover:bg-alert/90">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
