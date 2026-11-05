"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EwayBillPanel } from "@/components/EwayBillPanel";
import { EinvoicePanel } from "@/components/EinvoicePanel";
import { InvoiceTabs } from "@/components/InvoiceTabs";
import type { Business, Customer, Invoice, InvoiceItem } from "@/types/database";

type Row = { invoice: Invoice; customer: Customer | null };
type Filter = "all" | "with" | "without";

/** The E-way Bill page: pick any invoice and make (or record) its e-way bill. */
export function EwayBillCenter({ invoices, business, allowed, kind }: { invoices: Row[]; business: Business | null; allowed: boolean; kind: "eway" | "einvoice" }) {
  const isE = kind === "einvoice";
  const numberOf = (i: Invoice) => (isE ? i.irn : i.eway_bill_number);
  const supabase = createClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, InvoiceItem[]>>({});
  const [loading, setLoading] = useState(false);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      invoices.filter(({ invoice, customer }) => {
        if (filter === "with" && !numberOf(invoice)) return false;
        if (filter === "without" && numberOf(invoice)) return false;
        return !q || invoice.invoice_number.toLowerCase().includes(q) || (customer?.name ?? "walk-in").toLowerCase().includes(q) || (numberOf(invoice) ?? "").toLowerCase().includes(q);
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
      <InvoiceTabs active={kind} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">{isE ? "E-invoice" : "E-way Bill"}</h1>
          <p className="text-sm text-text-soft">
            {isE
              ? "Make an e-invoice (IRN) for any invoice for free on the GST portal, then keep the IRN here so it prints on the invoice."
              : "Make an e-way bill for any invoice for free on the GST portal, then keep its number here so it prints on the invoice."}
          </p>
        </div>
      </div>
      <div className="rounded-xl2 border border-paper-fold bg-paper-card p-4 shadow-card">
        <h2 className="font-display text-base font-semibold text-text">{isE ? "How to make an e-invoice (free)" : "How to make an e-way bill (free)"}</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-soft">
          <li>Tap an invoice below.</li>
          {isE ? (
            <>
              <li>Fill your city and pincode and the customer&apos;s, then press <strong>Download file</strong>. The customer needs a GSTIN.</li>
              <li>Open the <strong>GST e-invoice website</strong> (einvoice1.gst.gov.in) and sign in with your GST login.</li>
              <li>Choose <strong>Bulk Generation</strong> under e-Invoice and upload the downloaded file.</li>
              <li>Download the result, copy the IRN, then press <strong>Enter IRN</strong> on the invoice here so it prints on the invoice.</li>
            </>
          ) : (
            <>
              <li>Fill the few transport details and press <strong>Download file</strong>.</li>
              <li>Open the <strong>GST e-way bill website</strong> (ewaybillgst.gov.in) and sign in with your GST login.</li>
              <li>Go to <strong>E-Waybill → Generate Bulk</strong> and upload the downloaded file.</li>
              <li>Download the result from the portal, then press <strong>Enter e-way bill number</strong> on the invoice here and type it so it prints on the invoice.</li>
            </>
          )}
        </ol>
        <a href={isE ? "https://einvoice1.gst.gov.in" : "https://ewaybillgst.gov.in"} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-xl border border-paper-fold bg-white px-4 py-2 text-sm font-semibold text-text hover:bg-paper">
          {isE ? "Open GST e-invoice website" : "Open GST e-way bill website"}
        </a>
      </div>

      {!allowed && (
        <p className="rounded-xl bg-brass/10 px-4 py-3 text-sm text-brass-dark">
          E-way bill tools are available on the Professional and Business plans. Upgrade from Settings → Plan &amp; Billing.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isE ? "Search invoice no, customer or IRN…" : "Search invoice no, customer or e-way bill no…"}
          className="w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All invoices"],
              ["without", isE ? "No IRN yet" : "No e-way bill yet"],
              ["with", isE ? "Has IRN" : "Has e-way bill"],
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
                    numberOf(invoice) ? "bg-green-100 text-green-800" : "bg-paper text-text-soft"
                  }`}
                >
                  {numberOf(invoice) ? (isE ? "IRN saved" : `E-way ${numberOf(invoice)}`) : isE ? "No IRN" : "No e-way bill"}
                </span>
              </button>
              {openId === invoice.id &&
                (loading && !items[invoice.id] ? (
                  <p className="px-2 text-sm text-text-soft">Loading…</p>
                ) : (
                  isE ? (
                    <EinvoicePanel invoice={invoice} items={items[invoice.id] ?? []} customer={customer} business={business} allowed={allowed} />
                  ) : (
                    <EwayBillPanel invoice={invoice} items={items[invoice.id] ?? []} customer={customer} business={business} allowed={allowed} />
                  )
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
