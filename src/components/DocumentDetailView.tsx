import Link from "next/link";
import type { ReactNode } from "react";
import { CURRENCY_SYMBOLS } from "@/types/database";

type Item = {
  id: string;
  description: string;
  item_code?: string | null;
  quantity: number;
  unit: string;
  unit_price?: number;
  tax_percent?: number;
  line_total?: number;
};

export function DocumentDetailView({
  backHref,
  backLabel,
  title,
  subtitle,
  badge,
  actions,
  partyLabel,
  party,
  summary,
  items,
  currency = "INR",
  notes,
  extra,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  actions: ReactNode;
  partyLabel: string;
  party: { name?: string | null; phone?: string | null; email?: string | null; address?: string | null; gstin?: string | null } | null;
  summary?: { subtotal: number; rows: { label: string; value: number }[]; total: number };
  items: Item[];
  currency?: string;
  notes?: string | null;
  extra?: { label: string; value: string }[];
}) {
  const money = (n: number) =>
    `${CURRENCY_SYMBOLS[currency] ?? `${currency} `}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const priced = items.some((i) => i.unit_price !== undefined);
  const hasTax = items.some((i) => Number(i.tax_percent ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={backHref} className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {backLabel}
          </Link>
          <h1 className="font-display text-2xl font-semibold text-text">{title}</h1>
          <p className="mt-0.5 text-sm text-text-soft">
            {subtitle}
            {badge && <span className="ml-2 rounded bg-paper px-2 py-0.5 text-xs font-semibold capitalize text-text">{badge}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-soft">{partyLabel}</p>
          <p className="font-medium text-text">{party?.name || "Not specified"}</p>
          {party?.phone && <p className="text-sm text-text-soft">{party.phone}</p>}
          {party?.email && <p className="text-sm text-text-soft">{party.email}</p>}
          {party?.address && <p className="text-sm text-text-soft">{party.address}</p>}
          {party?.gstin && <p className="text-sm text-text-soft">GSTIN: {party.gstin}</p>}
          {extra?.map((e) => (
            <p key={e.label} className="mt-1 text-sm text-text-soft">
              {e.label}: <span className="text-text">{e.value}</span>
            </p>
          ))}
        </div>
        {summary && (
          <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-soft">Summary</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-soft">Subtotal</span>
              <span className="font-ledger tabular-nums text-text">{money(summary.subtotal)}</span>
            </div>
            {summary.rows
              .filter((r) => r.value !== 0)
              .map((r) => (
                <div key={r.label} className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-text-soft">{r.label}</span>
                  <span className="font-ledger tabular-nums text-text">{money(r.value)}</span>
                </div>
              ))}
            <div className="mt-2 flex items-center justify-between border-t border-paper-fold pt-2 text-base">
              <span className="font-semibold text-text">Total</span>
              <span className="font-ledger text-lg font-bold tabular-nums text-ink">{money(summary.total)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
        <div className="hidden overflow-hidden rounded-xl2 sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-fold bg-paper text-left text-xs font-semibold uppercase tracking-wide text-text-soft">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Unit</th>
                {priced && <th className="px-4 py-3">Unit price</th>}
                {hasTax && <th className="px-4 py-3">Tax %</th>}
                {priced && <th className="px-4 py-3 text-right">Total</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-fold">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-soft">No items.</td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-3 text-text">
                      {it.description}
                      {it.item_code && <span className="ml-1.5 text-xs text-text-soft">({it.item_code})</span>}
                    </td>
                    <td className="px-4 py-3 font-ledger tabular-nums text-text">{it.quantity}</td>
                    <td className="px-4 py-3 text-text-soft">{it.unit}</td>
                    {priced && <td className="px-4 py-3 font-ledger tabular-nums text-text">{money(Number(it.unit_price ?? 0))}</td>}
                    {hasTax && <td className="px-4 py-3 font-ledger tabular-nums text-text">{Number(it.tax_percent ?? 0)}%</td>}
                    {priced && (
                      <td className="px-4 py-3 text-right font-ledger font-semibold tabular-nums text-text">
                        {money(Number(it.line_total ?? 0))}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-paper-fold sm:hidden">
          {items.map((it) => (
            <li key={it.id} className="flex flex-col gap-1.5 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-text">
                  {it.description}
                  {it.item_code && <span className="ml-1.5 text-xs font-normal text-text-soft">({it.item_code})</span>}
                </p>
                {priced && <p className="shrink-0 font-ledger text-sm font-semibold tabular-nums text-text">{money(Number(it.line_total ?? 0))}</p>}
              </div>
              <p className="text-xs text-text-soft">
                {it.quantity} {it.unit}
                {priced && ` × ${money(Number(it.unit_price ?? 0))}`}
                {Number(it.tax_percent ?? 0) > 0 && ` · ${it.tax_percent}% tax`}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {notes && (
        <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-soft">Notes</p>
          <p className="text-sm text-text">{notes}</p>
        </div>
      )}
    </div>
  );
}
