"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { deletePayment, getPaymentHistory } from "@/lib/actions/adminActions";
import { formatPrice, type Currency } from "@/lib/currency";
import type { PaymentRow } from "@/lib/paymentTypes";

const card = "rounded-xl2 border border-paper-fold bg-white p-4 shadow-card";
const input = "rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink focus:outline-none";

type Filter = "all" | PaymentRow["status"];
const STATUS_STYLE: Record<PaymentRow["status"], string> = {
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-800",
  abandoned: "bg-gray-100 text-gray-600",
};
const STATUS_LABEL: Record<PaymentRow["status"], string> = { paid: "Paid", failed: "Failed", pending: "Waiting", abandoned: "Not completed" };

const money = (n: number, c: string) => formatPrice(n, (c === "USD" ? "USD" : "INR") as Currency);

/** Owner console → Payment history: every checkout, whether it was paid or failed, and which discount was used. */
export function PaymentHistoryPanel({ canEdit = false }: { canEdit?: boolean }) {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [updated, setUpdated] = useState(() => new Date());

  const load = useCallback(async () => {
    const r = await getPaymentHistory();
    if (r.error) setError(r.error);
    else {
      setError(null);
      setRows(r.rows);
      setUpdated(new Date());
    }
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this payment record permanently?")) return;
    const r = await deletePayment(id);
    if (r.error) window.alert(r.error);
    else setRows((cur) => (cur ? cur.filter((x) => x.id !== id) : cur));
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => document.visibilityState === "visible" && void load(), 20_000);
    return () => clearInterval(id);
  }, [load]);

  const summary = useMemo(() => {
    const all = rows ?? [];
    const paid = all.filter((r) => r.status === "paid");
    const collected: Record<string, number> = {};
    const discounted: Record<string, number> = {};
    for (const r of paid) {
      collected[r.currency] = (collected[r.currency] ?? 0) + r.amount;
      if (r.discountAmount > 0) discounted[r.currency] = (discounted[r.currency] ?? 0) + r.discountAmount;
    }
    const codes = new Map<string, { uses: number; amounts: Record<string, number> }>();
    for (const r of paid) {
      if (!r.discountCode) continue;
      const c = codes.get(r.discountCode) ?? { uses: 0, amounts: {} };
      c.uses++;
      c.amounts[r.currency] = (c.amounts[r.currency] ?? 0) + r.discountAmount;
      codes.set(r.discountCode, c);
    }
    return {
      collected,
      discounted,
      codes: Array.from(codes.entries()).sort((a, b) => b[1].uses - a[1].uses),
      count: (s: PaymentRow["status"]) => all.filter((r) => r.status === s).length,
    };
  }, [rows]);

  const q = query.trim().toLowerCase();
  const visible = (rows ?? []).filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!q || [r.customer, r.email, r.discountCode ?? "", r.orderId, r.paymentId ?? ""].some((x) => x.toLowerCase().includes(q)))
  );

  if (error) return <p className={`${card} text-sm text-red-700`}>{error}</p>;
  if (!rows) return <p className={`${card} text-sm text-text-soft`}>Loading…</p>;

  const join = (o: Record<string, number>) =>
    Object.keys(o).length ? Object.entries(o).map(([c, n]) => money(n, c)).join(" + ") : "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={card}>
          <p className="text-xs text-text-soft">Collected</p>
          <p className="font-ledger text-lg font-semibold text-text">{join(summary.collected)}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-text-soft">Paid · Failed · Waiting</p>
          <p className="font-ledger text-lg font-semibold text-text">
            {summary.count("paid")} · {summary.count("failed")} · {summary.count("pending")}
          </p>
        </div>
        <div className={card}>
          <p className="text-xs text-text-soft">Discount given (paid)</p>
          <p className="font-ledger text-lg font-semibold text-text">{join(summary.discounted)}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-text-soft">Discount codes used</p>
          <p className="font-ledger text-lg font-semibold text-text">
            {summary.codes.reduce((n, [, c]) => n + c.uses, 0)}
          </p>
        </div>
      </div>

      {summary.codes.length > 0 && (
        <div className={card}>
          <p className="mb-2 text-sm font-semibold text-text">Discount codes — how many customers used each</p>
          <div className="flex flex-wrap gap-2">
            {summary.codes.map(([code, c]) => (
              <span key={code} className="rounded-full bg-paper px-3 py-1 text-xs text-text">
                <strong className="font-ledger">{code}</strong> · {c.uses} {c.uses === 1 ? "customer" : "customers"} · saved {join(c.amounts)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "paid", "failed", "pending", "abandoned"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-ink text-paper" : "bg-white text-text hover:bg-paper-fold/60"}`}
          >
            {f === "all" ? "All" : STATUS_LABEL[f]}
          </button>
        ))}
        <button onClick={() => void load()} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
          ⟳ Refresh
        </button>
        <span className="text-xs text-text-soft">Updates automatically · {updated.toLocaleTimeString("en-IN")}</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, code, order…" className={`${input} ml-auto min-w-[220px]`} />
      </div>

      {visible.length === 0 ? (
        <p className={`${card} text-sm text-text-soft`}>No payments to show.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((r) => (
            <div key={r.id} className={`${card} !p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text">
                    {r.customer}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </p>
                  <p className="text-xs text-text-soft">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ""} · {new Date(r.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-ledger text-lg font-semibold text-text">{money(r.amount, r.currency)}</p>
                  <p className="text-xs capitalize text-text-soft">
                    {r.plan} · {r.cycle}
                  </p>
                </div>
              </div>
              {r.discountCode && (
                <p className="mt-2 text-xs text-text">
                  Discount <strong className="font-ledger">{r.discountCode}</strong>: −{money(r.discountAmount, r.currency)}
                  {r.listPrice != null && <span className="text-text-soft"> (list price {money(r.listPrice, r.currency)})</span>}
                </p>
              )}
              {r.status === "failed" && r.failureReason && <p className="mt-1 text-xs text-red-700">Reason: {r.failureReason}</p>}
              <p className="mt-1 break-all text-[0.7rem] text-text-soft">
                Order {r.orderId}
                {r.paymentId ? ` · Payment ${r.paymentId}` : ""}
              </p>
              {canEdit && (
                <button
                  onClick={() => void remove(r.id)}
                  className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
