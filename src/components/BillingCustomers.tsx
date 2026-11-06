"use client";

import { useState } from "react";
import Link from "next/link";

export interface BillingCustomerRow {
  id: string;
  name: string;
  phone: string;
  points: number;
  totalSpent: number;
  visits: number;
  lastVisit: string | null;
  /** What this customer bought, with repeat purchases added together. */
  items: { name: string; unit: string; times: number; qty: number; amount: number }[];
  /** Every bill made for this customer, newest first. */
  bills: { id: string; billNo: string; date: string; total: number; earned: number; redeemed: number }[];
}

export function BillingCustomers({
  customers,
  currency,
  loyaltyOn,
  pointValue,
  canViewRecords,
}: {
  customers: BillingCustomerRow[];
  currency: string;
  loyaltyOn: boolean;
  pointValue: number;
  canViewRecords: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  // Per customer: show only the bills where points were used.
  const [redeemedOnly, setRedeemedOnly] = useState<Record<string, boolean>>({});
  const sym = currency === "INR" ? "₹" : currency + " ";
  const money = (n: number) => sym + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const q = search.trim().toLowerCase();
  const rows = customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q.replace(/\D/g, "") || "\u0000") ||
      c.bills.some((b) => b.billNo.toLowerCase().includes(q))
  );

  return (
    <div className="flex flex-col gap-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone or bill no…"
        className="w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink sm:max-w-xs"
      />

      {rows.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-12 text-center text-sm text-text-soft">
          {customers.length === 0
            ? "No billing customers yet. Type a phone number on a bill in the POS tab and the customer is saved automatically."
            : "Nobody matches your search."}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => {
            const isOpen = open === c.id;
            return (
              <li key={c.id} className="rounded-xl border border-paper-fold bg-paper-card shadow-card">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  aria-expanded={isOpen}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-3.5 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/10 text-sm font-bold uppercase text-ink">
                    {(c.name || c.phone).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text">{c.name || "No name"}</span>
                    <span className="block text-xs text-text-soft">
                      {c.phone} · {c.visits} bill{c.visits === 1 ? "" : "s"}
                      {c.lastVisit ? ` · last ${new Date(c.lastVisit).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}
                    </span>
                  </span>
                  {loyaltyOn && (
                    <span className="rounded-full bg-brass/15 px-2.5 py-1 text-xs font-semibold text-brass-dark">
                      {c.points} pts{pointValue > 0 ? ` (${money(c.points * pointValue)})` : ""}
                    </span>
                  )}
                  <span className="text-right">
                    <span className="block text-[0.7rem] uppercase tracking-wide text-text-soft">Total bought</span>
                    <span className="font-ledger text-sm font-bold tabular-nums text-ink">{money(c.totalSpent)}</span>
                  </span>
                  <span aria-hidden="true" className="text-text-soft">
                    {isOpen ? "▴" : "▾"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-paper-fold p-3.5">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-soft">Items bought</p>
                    {c.items.length === 0 ? (
                      <p className="text-sm text-text-soft">No items recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-xs text-text-soft">
                              <th className="pb-1.5 font-medium">Item</th>
                              <th className="pb-1.5 text-right font-medium">Times bought</th>
                              <th className="pb-1.5 text-right font-medium">Quantity</th>
                              <th className="pb-1.5 text-right font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-paper-fold">
                            {c.items.map((it) => (
                              <tr key={it.name + it.unit}>
                                <td className="py-1.5 pr-2 text-text">
                                  {it.name}
                                  {it.times > 1 && (
                                    <span className="ml-2 rounded-full bg-success-bg px-2 py-0.5 text-[0.65rem] font-semibold text-success">repeat</span>
                                  )}
                                </td>
                                <td className="py-1.5 text-right tabular-nums text-text-soft">{it.times}×</td>
                                <td className="py-1.5 text-right tabular-nums text-text">
                                  {it.qty} {it.unit}
                                </td>
                                <td className="py-1.5 text-right font-ledger tabular-nums text-ink">{money(it.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {(() => {
                      const redeemedBills = c.bills.filter((x) => x.redeemed > 0);
                      const onlyRedeemed = Boolean(redeemedOnly[c.id]);
                      const shown = onlyRedeemed ? redeemedBills : c.bills;
                      const usedTotal = redeemedBills.reduce((n, x) => n + x.redeemed, 0);
                      return (
                        <>
                    <div className="mb-1.5 mt-4 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">Bills ({c.bills.length})</p>
                      {loyaltyOn && (
                        <button
                          type="button"
                          onClick={() => setRedeemedOnly((m) => ({ ...m, [c.id]: !m[c.id] }))}
                          aria-pressed={onlyRedeemed}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            onlyRedeemed ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text-soft hover:bg-paper"
                          }`}
                        >
                          Points used ({redeemedBills.length}){usedTotal > 0 ? ` · ${usedTotal} pts` : ""}
                        </button>
                      )}
                    </div>
                    {shown.length === 0 ? (
                      <p className="text-sm text-text-soft">{onlyRedeemed ? "This customer has not used points on any bill." : "No bills yet."}</p>
                    ) : (
                      <ul className="divide-y divide-paper-fold rounded-lg border border-paper-fold bg-white">
                        {shown.map((b) => (
                          <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                            <span className="w-16 shrink-0 font-ledger font-semibold text-ink">{b.billNo}</span>
                            <span className="min-w-0 flex-1 text-xs text-text-soft">
                              {new Date(b.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {b.redeemed > 0 && (
                              <span className="rounded-full bg-brass/15 px-2 py-0.5 text-[0.7rem] font-semibold text-brass-dark">Used {b.redeemed} pts</span>
                            )}
                            {b.earned > 0 && (
                              <span className="rounded-full bg-success-bg px-2 py-0.5 text-[0.7rem] font-semibold text-success">+{b.earned} pts</span>
                            )}
                            <span className="font-ledger font-semibold tabular-nums text-text">{money(b.total)}</span>
                            {canViewRecords && (
                              <Link href={"/dashboard/billing-records/" + b.id} className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700">
                                View
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
