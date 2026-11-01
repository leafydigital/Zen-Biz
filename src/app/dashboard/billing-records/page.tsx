import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY_SYMBOLS } from "@/types/database";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { getMyAccess } from "@/lib/getMyAccess";
import { getAuthUser } from "@/lib/getAuthUser";
import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
import { getLabels } from "@/lib/businessLabels";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { BillingPOS } from "@/components/BillingPOS";
import type { Product } from "@/types/database";

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Name / phone typed at the POS are kept in the record notes. */
function posCustomer(notes: string | null): { name?: string; phone?: string } | null {
  if (!notes) return null;
  const name = /^Customer: (.+)$/m.exec(notes)?.[1];
  const phone = /^Phone: (.+)$/m.exec(notes)?.[1];
  return name || phone ? { name, phone } : null;
}

export default async function BillingRecordsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = createClient();
  const activeBusiness = await getActiveBusiness();
  const access = await getMyAccess();
  const canPos = access.permissions.includes("billing");
  const canRecords = access.permissions.includes("billing_records");
  // POS opens first; the Records tab only exists for roles allowed to see records.
  const isPos = canPos && (searchParams.tab !== "records" || !canRecords);

  const tabs = !(canPos && canRecords) ? null : (
    <div className="inline-flex self-start rounded-xl border border-paper-fold bg-white p-1 text-sm font-semibold">
      <Link
        href="/dashboard/billing-records"
        className={`rounded-lg px-4 py-1.5 transition ${isPos ? "bg-ink text-paper" : "text-text-soft hover:bg-paper"}`}
      >
        POS
      </Link>
      <Link
        href="/dashboard/billing-records?tab=records"
        className={`rounded-lg px-4 py-1.5 transition ${!isPos ? "bg-ink text-paper" : "text-text-soft hover:bg-paper"}`}
      >
        Records
      </Link>
    </div>
  );

  if (isPos) {
    const user = await getAuthUser();
    const profile = await getCurrentProfile();
    const labels = getLabels(activeBusiness?.business_type);
    const plan = profile?.plan ?? "starter";
    const { data: products } = (await supabase
      .from("products")
      .select("*")
      .eq("business_id", activeBusiness?.id ?? "")
      .order("name")) as unknown as { data: Product[] | null };

    const { data: recentRaw } = (await supabase
      .from("invoices" as never)
      .select("id, total, subtotal, gst_amount, round_off, currency, payment_method, created_at")
      .eq("business_id", activeBusiness?.id ?? "")
      .eq("record_type", "billing_record")
      .order("created_at", { ascending: false })
      .limit(2)) as { data: any[] | null };
    const recentIds = (recentRaw ?? []).map((r) => r.id);
    const { data: recentItems } = recentIds.length
      ? ((await supabase
          .from("invoice_items" as never)
          .select("invoice_id, description, quantity, unit_price, line_total")
          .in("invoice_id", recentIds)) as { data: any[] | null })
      : { data: [] as any[] };
    const recent = (recentRaw ?? []).map((r) => ({
      id: r.id as string,
      createdAt: r.created_at as string,
      total: Number(r.total),
      subtotal: Number(r.subtotal),
      tax: Number(r.gst_amount),
      roundOff: Number(r.round_off),
      payMethod: (r.payment_method as string) ?? "cash",
      items: (recentItems ?? [])
        .filter((i) => i.invoice_id === r.id)
        .map((i) => ({ name: i.description as string, qty: Number(i.quantity), price: Number(i.unit_price), amount: Number(i.line_total) })),
    }));

    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Billing</h1>
          <p className="text-sm text-text-soft">Quick POS — tap items, then print on a thermal printer or save as a billing record.</p>
        </div>
        {tabs}
        <BillingPOS
          ownerId={user!.id}
          businessId={activeBusiness?.id ?? ""}
          products={products ?? []}
          currency={activeBusiness?.default_currency ?? "INR"}
          recent={recent}
          canViewRecords={canRecords}
          itemPerms={{
            add: access.permissions.includes("billing_add_item"),
            edit: access.permissions.includes("billing_edit_item"),
            hide: access.permissions.includes("billing_hide_item"),
            remove: access.permissions.includes("billing_remove_item"),
          }}
          plan={plan}
          productLimit={getPlanFeatures(plan).limits.products}
          labels={{
            itemSingular: labels.itemSingular,
            defaultUnit: labels.unitDefault,
            unitOptions: labels.unitOptions,
            stockTrackingDefault: labels.stockTrackingDefault,
            stockHint: labels.stockHint,
          }}
          business={{
            name: activeBusiness?.business_name ?? "",
            address: activeBusiness?.address ?? null,
            phone: activeBusiness?.phone ?? null,
            gstin: activeBusiness?.gst_number ?? null,
          }}
        />
      </div>
    );
  }

  const { data: records } = (await supabase
    .from("invoices" as never)
    .select("id, total, currency, invoice_date, converted_invoice_id, notes, customers(name)")
    .eq("business_id", activeBusiness?.id ?? "")
    .eq("record_type", "billing_record")
    .order("created_at", { ascending: false })) as { data: any[] | null };

  if (!canRecords) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Billing</h1>
          <p className="text-sm text-text-soft">
            Records for your own reference — not official invoices.
          </p>
        </div>
      </div>

      {tabs}

      {!records || records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">
            No billing records yet. Use the POS tab to make your first bill.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 p-4 transition hover:bg-paper/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link href={`/dashboard/billing-records/${r.id}`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brass/15 text-brass-dark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1ZM14 3.5V8h4M9 13h6M9 16.5h6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <p className="font-medium text-text underline-offset-2 hover:underline">
                      {r.customers?.name ?? posCustomer(r.notes)?.name ?? "Walk-in customer"}
                    </p>
                    <p className="text-xs text-text-soft">
                      {r.invoice_date}
                      {posCustomer(r.notes)?.phone ? ` · ${posCustomer(r.notes)?.phone}` : ""}
                    </p>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(r.total), r.currency)}
                  </span>
                  {r.converted_invoice_id ? (
                    <Link
                      href={`/dashboard/invoices/${r.converted_invoice_id}`}
                      className="rounded-full bg-success-bg px-2.5 py-0.5 text-[0.7rem] font-semibold text-success"
                    >
                      Converted to Invoice
                    </Link>
                  ) : (
                    <span className="rounded-full bg-brass/15 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brass-dark">
                      Not yet invoiced
                    </span>
                  )}
                  <Link
                    href={`/dashboard/billing-records/${r.id}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition bg-violet-600 hover:bg-violet-700"
                  >
                    View
                  </Link>
                  <DeleteInvoiceButton invoiceId={r.id} isBillingRecord />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
