import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatusSelect } from "@/components/InvoiceStatusSelect";
import { DownloadInvoiceButton } from "@/components/DownloadInvoiceButton";
import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
import { CURRENCY_SYMBOLS } from "@/types/database";

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function InvoicesPage() {
  const supabase = createClient();

  const { data: invoices } = (await supabase
    .from("invoices" as never)
    .select("*, customers(name)")
    .order("created_at", { ascending: false })) as { data: any[] | null };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Invoices</h1>
          <p className="text-sm text-text-soft">Bills you've raised for customers.</p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + New invoice
        </Link>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">No invoices yet.</p>
          <Link
            href="/dashboard/invoices/new"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-light"
          >
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {invoices.map((inv: any) => (
              <li
                key={inv.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link href={`/dashboard/invoices/${inv.id}`} className="min-w-0 hover:opacity-80">
                  <p className="font-medium text-text underline-offset-2 hover:underline">
                    #{inv.invoice_number}
                  </p>
                  <p className="text-xs text-text-soft">
                    {inv.customers?.name ?? "Walk-in customer"} · {inv.invoice_date}
                  </p>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(inv.total), inv.currency)}
                  </span>
                  <InvoiceStatusSelect invoiceId={inv.id} status={inv.status} paymentMethod={inv.payment_method} />
                  <Link
                    href={`/dashboard/invoices/${inv.id}/edit`}
                    className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
                  >
                    Edit
                  </Link>
                  <DownloadInvoiceButton invoiceId={inv.id} />
                  <DeleteInvoiceButton invoiceId={inv.id} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
