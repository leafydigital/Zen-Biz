import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLabels } from "@/lib/businessLabels";
import type { Profile } from "@/types/database";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function DashboardHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles" as never)
    .select("*")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Profile | null };

  const labels = getLabels(profile?.business_type);

  const [{ count: productCount }, { count: customerCount }, invoicesResult] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("customers" as never).select("id", { count: "exact", head: true }),
      supabase
        .from("invoices" as never)
        .select("id, total, status, invoice_number, invoice_date, currency, customers(name)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const invoices = invoicesResult.data as
    | {
        id: string;
        total: number;
        status: string;
        invoice_number: string;
        invoice_date: string;
        currency: string;
        customers: { name: string } | null;
      }[]
    | null;

  const { data: totals } = (await supabase
    .from("invoices" as never)
    .select("total, status, amount_paid")) as {
    data: { total: number; status: string; amount_paid: number }[] | null;
  };
  // Revenue counts the amount actually received: all of a "paid" invoice,
  // just the paid portion of a "partial" one. Outstanding is the mirror —
  // the unpaid remainder of both "unpaid" and "partial" invoices.
  const totalRevenue = (totals ?? []).reduce((sum, i) => {
    if (i.status === "paid") return sum + Number(i.total);
    if (i.status === "partial") return sum + Number(i.amount_paid);
    return sum;
  }, 0);
  const totalUnpaid = (totals ?? []).reduce((sum, i) => {
    if (i.status === "unpaid") return sum + Number(i.total);
    if (i.status === "partial") return sum + (Number(i.total) - Number(i.amount_paid));
    return sum;
  }, 0);

  const { data: purchaseTotals } = (await supabase
    .from("purchases" as never)
    .select("total")
    .neq("status", "cancelled")) as { data: { total: number }[] | null };
  const totalPurchased = (purchaseTotals ?? []).reduce(
    (sum, p) => sum + Number(p.total),
    0
  );

  const stats = [
    { label: labels.itemPlural, value: productCount ?? 0, href: "/dashboard/products" },
    { label: "Customers", value: customerCount ?? 0, href: "/dashboard/customers" },
    { label: "Collected", value: formatCurrency(totalRevenue), href: "/dashboard/invoices" },
    { label: "Outstanding", value: formatCurrency(totalUnpaid), href: "/dashboard/invoices" },
    { label: "Purchased", value: formatCurrency(totalPurchased), href: "/dashboard/purchases" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            Good to see you
            {profile?.business_name ? `, ${profile.business_name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-text-soft">
            Here's how your CRM looks today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/quotations/new"
            className="inline-flex items-center justify-center rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text shadow-card transition hover:border-ink/30"
          >
            + Quotation
          </Link>
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-card transition hover:bg-ink-light"
          >
            + Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl2 border border-paper-fold bg-paper-card p-4 shadow-card transition hover:border-ink/30 sm:p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
              {s.label}
            </p>
            <p className="mt-1.5 font-ledger text-xl font-semibold tabular-nums text-ink sm:text-2xl">
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text">
            Recent invoices
          </h2>
          <Link
            href="/dashboard/invoices"
            className="text-sm font-medium text-ink underline underline-offset-2"
          >
            View all
          </Link>
        </div>

        {!invoices || invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-paper-fold py-10 text-center">
            <p className="text-sm text-text-soft">
              No invoices yet. Create your first one to get started.
            </p>
            <Link
              href="/dashboard/invoices/new"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-light"
            >
              New invoice
            </Link>
          </div>
        ) : (
          <ul className="ledger-lines flex flex-col">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    #{inv.invoice_number}
                  </p>
                  <p className="truncate text-xs text-text-soft">
                    {inv.customers?.name ?? "Walk-in customer"} · {inv.invoice_date}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold capitalize ${
                      inv.status === "paid"
                        ? "bg-success-bg text-success"
                        : inv.status === "cancelled"
                          ? "bg-paper-fold text-text-soft"
                          : "bg-brass/15 text-brass-dark"
                    }`}
                  >
                    {inv.status}
                  </span>
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(Number(inv.total))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
