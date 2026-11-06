import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMyAccess } from "@/lib/getMyAccess";
import { createClient } from "@/lib/supabase/server";
import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
import { DownloadInvoiceButton } from "@/components/DownloadInvoiceButton";
import { ShareInvoiceButtons } from "@/components/ShareInvoiceButtons";
import { PrintButton } from "@/components/PrintButton";
import { CURRENCY_SYMBOLS } from "@/types/database";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getPlanFeatures } from "@/lib/planFeatures";
import type { Invoice, InvoiceItem } from "@/types/database";
import { formatBillNo } from "@/lib/billingLoyalty";

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function BillingRecordDetailPage({ params }: { params: { id: string } }) {
  if (!(await getMyAccess()).permissions.includes("billing_records")) redirect("/dashboard/billing-records");
  const supabase = createClient();

  const { data: record } = (await supabase
    .from("invoices" as never)
    .select("*, customers(name)")
    .eq("id", params.id)
    .eq("record_type", "billing_record")
    .maybeSingle()) as { data: (Invoice & { customers: { name: string } | null }) | null };

  if (!record) notFound();

  const [{ data: items }, profile] = await Promise.all([
    supabase
      .from("invoice_items" as never)
      .select("*")
      .eq("invoice_id", record.id)
      .order("created_at", { ascending: true }) as unknown as Promise<{ data: InvoiceItem[] | null }>,
    getCurrentProfile(),
  ]);

  const plan = profile?.plan ?? "starter";
  const canShare = getPlanFeatures(plan).shareViaWhatsapp;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/billing-records?tab=records"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-ink"
      >
        ← Back to Billing Records
      </Link>

      <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
        <div className="border-b border-brass/30 bg-brass/10 px-5 py-4 sm:px-6">
          <p className="text-sm font-semibold text-brass-dark">
            BILLING RECORD
            {(record as unknown as { bill_no?: number | null }).bill_no ? (
              <span className="ml-2 rounded-md bg-ink/10 px-2 py-0.5 font-ledger text-xs text-ink">
                Bill No: {formatBillNo((record as unknown as { bill_no?: number | null }).bill_no)}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-text-soft">
            Not an official invoice — saved for your own records.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                Customer
              </p>
              <p className="mt-0.5 font-medium text-text">
                {record.customers?.name ?? "Walk-in customer"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                Date
              </p>
              <p className="mt-0.5 font-medium text-text">{record.invoice_date}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-paper-fold">
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-fold bg-paper text-left text-xs font-semibold uppercase tracking-wide text-text-soft">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-fold">
                  {(items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-text">{item.description}</td>
                      <td className="px-4 py-3 text-right font-ledger tabular-nums text-text">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-ledger tabular-nums text-text">
                        {formatCurrency(Number(item.unit_price), record.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-ledger font-semibold tabular-nums text-text">
                        {formatCurrency(Number(item.line_total), record.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-paper-fold sm:hidden">
              {(items ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">{item.description}</p>
                    <p className="text-xs text-text-soft">
                      {item.quantity} × {formatCurrency(Number(item.unit_price), record.currency)}
                    </p>
                  </div>
                  <p className="shrink-0 font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(item.line_total), record.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-paper-fold pt-4">
            <span className="font-semibold text-text">Total</span>
            <span className="font-ledger text-lg font-bold tabular-nums text-ink">
              {formatCurrency(Number(record.total), record.currency)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-paper-fold px-5 py-4 sm:px-6">
          {record.converted_invoice_id ? (
            <>
              <span className="rounded-full bg-success-bg px-3 py-1.5 text-xs font-semibold text-success">
                Converted to Invoice
              </span>
              <Link
                href={`/dashboard/invoices/${record.converted_invoice_id}`}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-ink-light"
              >
                View Invoice
              </Link>
            </>
          ) : (
            <>
              <Link
                href={`/dashboard/invoices/${record.id}/edit?type=billing`}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition bg-sky-600 hover:bg-sky-700"
              >
                Edit
              </Link>
              <PrintButton invoiceId={record.id} />
              <DownloadInvoiceButton invoiceId={record.id} />
              {canShare && <ShareInvoiceButtons invoiceId={record.id} />}
              <DeleteInvoiceButton invoiceId={record.id} isBillingRecord />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
