import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatusSelect } from "@/components/InvoiceStatusSelect";
import { DownloadInvoiceButton } from "@/components/DownloadInvoiceButton";
import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
import { CURRENCY_SYMBOLS } from "@/types/database";
import type { Customer, Invoice, InvoiceItem } from "@/types/database";

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ViewInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: invoice } = (await supabase
    .from("invoices" as never)
    .select("*")
    .eq("id", params.id)
    .maybeSingle()) as { data: Invoice | null };

  if (!invoice) notFound();

  const { data: items } = (await supabase
    .from("invoice_items" as never)
    .select("*")
    .eq("invoice_id", invoice.id)
    .order("created_at", { ascending: true })) as { data: InvoiceItem[] | null };

  let customer: Customer | null = null;
  if (invoice.customer_id) {
    const { data } = await supabase
      .from("customers" as never)
      .select("*")
      .eq("id", invoice.customer_id)
      .maybeSingle();
    customer = data as Customer | null;
  }

  const hasAnyTax = (items ?? []).some((it: any) => Number(it.tax_percent ?? 0) > 0);
  const totalLineTax = (items ?? []).reduce(
    (sum: number, it: any) => sum + Number(it.line_total) * (Number(it.tax_percent ?? 0) / 100),
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/invoices"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-ink"
          >
            ← Back to Invoices
          </Link>
          <h1 className="font-display text-2xl font-semibold text-text">
            Invoice #{invoice.invoice_number}
          </h1>
          <p className="text-sm text-text-soft">
            {invoice.invoice_date}
            {invoice.due_date && ` · Due ${invoice.due_date}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InvoiceStatusSelect
            invoiceId={invoice.id}
            status={invoice.status}
            paymentMethod={invoice.payment_method}
          />
          <Link
            href={`/dashboard/invoices/${invoice.id}/edit`}
            className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
          >
            Edit
          </Link>
          <DownloadInvoiceButton invoiceId={invoice.id} />
          <DeleteInvoiceButton invoiceId={invoice.id} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-soft">
            Bill to
          </p>
          <p className="font-medium text-text">{customer?.name ?? "Walk-in customer"}</p>
          {customer?.phone && <p className="text-sm text-text-soft">{customer.phone}</p>}
          {customer?.address && <p className="text-sm text-text-soft">{customer.address}</p>}
        </div>
        {(invoice.ship_to_name || invoice.ship_to_address) && (
          <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-soft">
              Ship to
            </p>
            <p className="font-medium text-text">{invoice.ship_to_name || "Not specified"}</p>
            {invoice.ship_to_address && (
              <p className="text-sm text-text-soft">{invoice.ship_to_address}</p>
            )}
          </div>
        )}
        <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-soft">
            Summary
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-soft">Subtotal</span>
            <span className="font-ledger tabular-nums text-text">
              {formatCurrency(Number(invoice.subtotal), invoice.currency)}
            </span>
          </div>
          {invoice.gst_enabled && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-text-soft">GST ({invoice.gst_percent}%)</span>
              <span className="font-ledger tabular-nums text-text">
                {formatCurrency(Number(invoice.gst_amount), invoice.currency)}
              </span>
            </div>
          )}
          {totalLineTax > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-text-soft">Tax</span>
              <span className="font-ledger tabular-nums text-text">
                {formatCurrency(totalLineTax, invoice.currency)}
              </span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-paper-fold pt-2 text-base">
            <span className="font-semibold text-text">Total</span>
            <span className="font-ledger text-lg font-bold tabular-nums text-ink">
              {formatCurrency(Number(invoice.total), invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-paper-fold bg-paper text-left text-xs font-semibold uppercase tracking-wide text-text-soft">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Unit price</th>
                {hasAnyTax && <th className="px-4 py-3">Tax %</th>}
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-fold">
              {(items ?? []).map((item: any) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-text">
                    {item.description}
                    {item.item_code && (
                      <span className="ml-1.5 text-xs text-text-soft">({item.item_code})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-ledger tabular-nums text-text">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-text-soft">{item.unit}</td>
                  <td className="px-4 py-3 font-ledger tabular-nums text-text">
                    {formatCurrency(Number(item.unit_price), invoice.currency)}
                  </td>
                  {hasAnyTax && (
                    <td className="px-4 py-3 font-ledger tabular-nums text-text">
                      {Number(item.tax_percent ?? 0)}%
                    </td>
                  )}
                  <td className="px-4 py-3 font-ledger font-semibold tabular-nums text-text">
                    {formatCurrency(Number(item.line_total), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {invoice.notes && (
        <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-soft">
            Notes
          </p>
          <p className="text-sm text-text">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
