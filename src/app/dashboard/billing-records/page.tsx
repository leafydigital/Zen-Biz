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
import { BillingCustomers, type BillingCustomerRow } from "@/components/BillingCustomers";
import { formatBillNo, getBillingSettings, type BillingCustomerLite } from "@/lib/billingLoyalty";
import { getStockLimits } from "@/lib/stockLimits";
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
  // POS opens first; Records only for roles allowed to see records. Customers is for anyone who can use Billing.
  const canCustomers = canPos || canRecords;
  const wanted = searchParams.tab;
  const view: "pos" | "records" | "customers" =
    wanted === "customers" && canCustomers
      ? "customers"
      : wanted === "records" && canRecords
        ? "records"
        : canPos
          ? "pos"
          : "records";
  const isPos = view === "pos";

  const tabCls = (on: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 transition ${on ? "bg-ink text-paper" : "text-text-soft hover:bg-paper"}`;
  const tabs =
    [canPos, canRecords, canCustomers].filter(Boolean).length < 2 ? null : (
      <div className="inline-flex self-start rounded-xl border border-paper-fold bg-white p-1 text-sm font-semibold">
        {canPos && (
          <Link href="/dashboard/billing-records" className={tabCls(view === "pos")}>
            POS
          </Link>
        )}
        {canRecords && (
          <Link href="/dashboard/billing-records?tab=records" className={tabCls(view === "records")}>
            Records
          </Link>
        )}
        {canCustomers && (
          <Link href="/dashboard/billing-records?tab=customers" className={tabCls(view === "customers")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5" />
            </svg>
            Customers
          </Link>
        )}
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

    const recentCols = "id, total, subtotal, gst_amount, round_off, currency, payment_method, created_at";
    const recentQ = (cols: string) =>
      supabase
        .from("invoices" as never)
        .select(cols)
        .eq("business_id", activeBusiness?.id ?? "")
        .eq("record_type", "billing_record")
        .order("created_at", { ascending: false })
        .limit(2) as unknown as PromiseLike<{ data: any[] | null; error: unknown }>;
    let recentRes = await recentQ(recentCols + ", bill_no");
    if (recentRes.error) recentRes = await recentQ(recentCols);
    const recentRaw = recentRes.data;
    const { data: custRaw } = (await supabase
      .from("billing_customers" as never)
      .select("id, name, phone, points")
      .eq("business_id", activeBusiness?.id ?? "")
      .order("last_visit", { ascending: false, nullsFirst: false })
      .limit(3000)) as { data: any[] | null };
    const billingCustomers: BillingCustomerLite[] = (custRaw ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name as string) ?? "",
      phone: (c.phone as string) ?? "",
      points: Number(c.points) || 0,
    }));
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
      billNo: formatBillNo(r.bill_no, r.id as string),
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
          customers={billingCustomers}
          stockLimits={getStockLimits(activeBusiness?.low_stock_level, activeBusiness?.low_stock_limits)}
          isOwner={activeBusiness?.owner_id === user?.id}
          billingSettings={getBillingSettings(activeBusiness?.billing_settings)}
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

  if (view === "customers") {
    const businessId = activeBusiness?.id ?? "";
    const settings = getBillingSettings(activeBusiness?.billing_settings);
    const { data: custs } = (await supabase
      .from("billing_customers" as never)
      .select("id, name, phone, points, total_spent, visits, last_visit")
      .eq("business_id", businessId)
      .order("last_visit", { ascending: false, nullsFirst: false })
      .limit(3000)) as { data: any[] | null };
    const billCols = "id, billing_customer_id, total, created_at, points_earned, points_redeemed, invoice_items(description, quantity, unit, line_total, tax_amount)";
    const billsQ = (cols: string) =>
      supabase
        .from("invoices" as never)
        .select(cols)
        .eq("business_id", businessId)
        .eq("record_type", "billing_record")
        .not("billing_customer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(5000) as unknown as PromiseLike<{ data: any[] | null; error: unknown }>;
    let billsRes = await billsQ(billCols + ", bill_no");
    if (billsRes.error) billsRes = await billsQ(billCols);
    const bills = billsRes.data;
    const billsByCustomer = new Map<string, { id: string; billNo: string; date: string; total: number; earned: number; redeemed: number }[]>();
    for (const b of bills ?? []) {
      const list = billsByCustomer.get(b.billing_customer_id as string) ?? [];
      list.push({ id: b.id as string, billNo: formatBillNo(b.bill_no, b.id as string), date: b.created_at as string, total: Number(b.total) || 0, earned: Number(b.points_earned) || 0, redeemed: Number(b.points_redeemed) || 0 });
      billsByCustomer.set(b.billing_customer_id as string, list);
    }

    // Add up what each customer bought; a repeat purchase of the same item is merged into one row.
    const byCustomer = new Map<string, Map<string, { name: string; unit: string; times: number; qty: number; amount: number }>>();
    for (const b of bills ?? []) {
      const id = b.billing_customer_id as string;
      const m = byCustomer.get(id) ?? new Map();
      for (const it of (b.invoice_items ?? []) as any[]) {
        const key = String(it.description) + "|" + String(it.unit ?? "");
        const cur = m.get(key) ?? { name: String(it.description), unit: String(it.unit ?? ""), times: 0, qty: 0, amount: 0 };
        cur.times += 1;
        cur.qty += Number(it.quantity) || 0;
        cur.amount += (Number(it.line_total) || 0) + (Number(it.tax_amount) || 0);
        m.set(key, cur);
      }
      byCustomer.set(id, m);
    }
    const rows: BillingCustomerRow[] = (custs ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name as string) ?? "",
      phone: (c.phone as string) ?? "",
      points: Number(c.points) || 0,
      totalSpent: Number(c.total_spent) || 0,
      visits: Number(c.visits) || 0,
      lastVisit: (c.last_visit as string) ?? null,
      items: Array.from(byCustomer.get(c.id as string)?.values() ?? []).sort((a, b) => b.qty - a.qty),
      bills: billsByCustomer.get(c.id as string) ?? [],
    }));

    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Billing customers</h1>
          <p className="text-sm text-text-soft">
            People you bill at the POS with a phone number. Kept separate from your invoice customers.
          </p>
        </div>
        {tabs}
        <BillingCustomers
          customers={rows}
          currency={activeBusiness?.default_currency ?? "INR"}
          loyaltyOn={settings.loyaltyOn}
          pointValue={settings.pointValue}
          canViewRecords={canRecords}
        />
      </div>
    );
  }

  const recCols = "id, total, currency, invoice_date, converted_invoice_id, notes, customers(name)";
  const recQ = (cols: string) =>
    supabase
      .from("invoices" as never)
      .select(cols)
      .eq("business_id", activeBusiness?.id ?? "")
      .eq("record_type", "billing_record")
      .order("created_at", { ascending: false }) as unknown as PromiseLike<{ data: any[] | null; error: unknown }>;
  let recRes = await recQ(recCols + ", bill_no");
  if (recRes.error) recRes = await recQ(recCols);
  const records = recRes.data;

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
                      {r.bill_no ? <span className="mr-2 rounded-md bg-ink/10 px-1.5 py-0.5 font-ledger text-xs font-semibold text-ink">{formatBillNo(r.bill_no)}</span> : null}
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
                  ) : null}
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
