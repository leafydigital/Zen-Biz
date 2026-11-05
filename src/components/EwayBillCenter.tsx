"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EwayBillPanel } from "@/components/EwayBillPanel";
import { EwayConnectModal } from "@/components/EwayConnectModal";
import { GearIcon } from "@/components/CategoryManagerModal";
import type { Business, Customer, Invoice, InvoiceItem } from "@/types/database";

type Row = { invoice: Invoice; customer: Customer | null };
type Filter = "all" | "with" | "without";

/** The E-way Bill page: pick any invoice and make (or record) its e-way bill. */
export function EwayBillCenter({ invoices, business, allowed }: { invoices: Row[]; business: Business | null; allowed: boolean }) {
  const supabase = createClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, InvoiceItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      invoices.filter(({ invoice, customer }) => {
        if (filter === "with" && !invoice.eway_bill_number) return false;
        if (filter === "without" && invoice.eway_bill_number) return false;
        return !q || invoice.invoice_number.toLowerCase().includes(q) || (customer?.name ?? "walk-in").toLowerCase().includes(q) || (invoice.eway_bill_number ?? "").includes(q);
      }),
    [invoices, filter, q]
  );

  async function toggle(id: string) {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    if (!items[id]) {
      setLoading(true);
      const { data } = await supabase.from("invoice_items" as never).select("*").eq("invoice_id", id).order("created_at", { ascending: true });
      setItems((m) => ({ ...m, [id]: (data as InvoiceItem[] | null) ?? [] }));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">E-way Bill</h1>
          <p className="text-sm text-text-soft">
            Make an e-way bill for any invoice for free on the GST portal, then keep its number here so it prints on the invoice.
          </p>
        </div>
        {allowed && business && (
          <button
            onClick={() => setConnectOpen(true)}
            title="Connect e-way bill account"
            aria-label="Connect e-way bill account"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-paper-fold bg-white text-text transition hover:bg-paper"
          >
            <GearIcon />
          </button>
        )}
      </div>
      {connectOpen && business && <EwayConnectModal businessId={business.id} gstin={business.gst_number} onClose={() => setConnectOpen(false)} />}

      {!allowed && (
        <p className="rounded-xl bg-brass/10 px-4 py-3 text-sm text-brass-dark">
          E-way bill tools are available on the Professional and Business plans. Upgrade from Settings → Plan &amp; Billing.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search invoice no, customer or e-way bill no…"
          className="w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All invoices"],
              ["without", "No e-way bill yet"],
              ["with", "Has e-way bill"],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === id ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text-soft hover:bg-paper"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-12 text-center text-sm text-text-soft">
          {invoices.length === 0 ? "No invoices yet. Create an invoice first." : "Nothing matches."}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ invoice, customer }) => (
            <li key={invoice.id} className="flex flex-col gap-3">
              <button
                onClick={() => toggle(invoice.id)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-fold bg-paper-card p-3.5 text-left shadow-card hover:bg-paper"
              >
                <div className="min-w-0">
                  <p className="font-medium text-text">
                    #{invoice.invoice_number} · {customer?.name ?? "Walk-in customer"}
                  </p>
                  <p className="text-xs text-text-soft">{invoice.invoice_date}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    invoice.eway_bill_number ? "bg-green-100 text-green-800" : "bg-paper text-text-soft"
                  }`}
                >
                  {invoice.eway_bill_number ? `E-way ${invoice.eway_bill_number}` : "No e-way bill"}
                </span>
              </button>
              {openId === invoice.id &&
                (loading && !items[invoice.id] ? (
                  <p className="px-2 text-sm text-text-soft">Loading…</p>
                ) : (
                  <EwayBillPanel invoice={invoice} items={items[invoice.id] ?? []} customer={customer} business={business} allowed={allowed} />
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
