import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLabels } from "@/lib/businessLabels";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getTranslations } from "@/lib/i18n/translations";
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
  const t = getTranslations(profile?.language ?? "en");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ count: productCount }, { count: customerCount }, invoicesResult, { count: invoicesThisMonth }] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("customers" as never).select("id", { count: "exact", head: true }),
      supabase
        .from("invoices" as never)
        .select("id, total, status, invoice_number, invoice_date, currency, customers(name)")
        .eq("record_type", "invoice")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("invoices" as never)
        .select("id", { count: "exact", head: true })
        .eq("record_type", "invoice")
        .gte("created_at", monthStart.toISOString()),
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
    .select("total, status, amount_paid")
    .eq("record_type", "invoice")) as {
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

  const limits = getPlanFeatures(profile?.plan ?? "starter").limits;

  interface StatCard {
    label: string;
    value: string | number;
    href: string;
    cta: string;
    sublabel?: string;
    color: "blue" | "green" | "orange" | "red" | "purple";
    icon: "bag" | "users" | "rupee" | "wallet" | "cart";
  }

  const stats: StatCard[] = [
    {
      label: labels.itemPlural,
      value: productCount ?? 0,
      href: "/dashboard/products",
      cta: `${t.buttons.view} ${labels.itemPlural.toLowerCase()}`,
      sublabel: limits.products !== null ? `${t.dashboard.ofUsed.replace("{limit}", String(limits.products))}` : undefined,
      color: "blue",
      icon: "bag",
    },
    {
      label: t.dashboard.customers,
      value: customerCount ?? 0,
      href: "/dashboard/customers",
      cta: `${t.buttons.view} ${t.dashboard.customers.toLowerCase()}`,
      sublabel: limits.customers !== null ? `${t.dashboard.ofUsed.replace("{limit}", String(limits.customers))}` : undefined,
      color: "green",
      icon: "users",
    },
    {
      label: t.dashboard.collected,
      value: formatCurrency(totalRevenue),
      href: "/dashboard/invoices",
      cta: t.dashboard.viewReceipts,
      color: "orange",
      icon: "rupee",
    },
    {
      label: t.dashboard.outstanding,
      value: formatCurrency(totalUnpaid),
      href: "/dashboard/invoices",
      cta: t.dashboard.viewInvoices,
      color: "red",
      icon: "wallet",
    },
    {
      label: t.dashboard.purchased,
      value: formatCurrency(totalPurchased),
      href: "/dashboard/purchases",
      cta: t.dashboard.viewPurchases,
      color: "purple",
      icon: "cart",
    },
  ];

  const STAT_COLORS: Record<string, { bg: string; text: string; cta: string; blob: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", cta: "text-blue-600", blob: "bg-blue-100/60" },
    green: { bg: "bg-green-50", text: "text-green-600", cta: "text-green-600", blob: "bg-green-100/60" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", cta: "text-orange-600", blob: "bg-orange-100/60" },
    red: { bg: "bg-red-50", text: "text-red-500", cta: "text-red-500", blob: "bg-red-100/60" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", cta: "text-purple-600", blob: "bg-purple-100/60" },
  };

  const STAT_ICONS: Record<string, JSX.Element> = {
    bag: (
      <path d="M6 7h12l1 13H5L6 7ZM9 7a3 3 0 0 1 6 0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    users: (
      <path d="M8 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM2 19c.5-3 2.8-4.6 6-4.6s5.5 1.6 6 4.6M15.5 8a2.5 2.5 0 1 0 0-5M17 19c-.3-2-1.4-3.4-3-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    rupee: (
      <path d="M7 6h10M7 10h10M7 6c3.5 0 6 1.3 6 4s-2.5 4-6 4h-.5L15 18" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    wallet: (
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM16 12h3M16.5 12a1.5 1.5 0 1 0 0 .01" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    cart: (
      <path d="M3 4h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h8.2a1.5 1.5 0 0 0 1.48-1.24L20 8H6.2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  };

  const quickActions = [
    { label: t.dashboard.newInvoiceFull, href: "/dashboard/invoices/new", color: "blue", icon: "invoice" },
    { label: t.dashboard.newQuotationFull, href: "/dashboard/quotations/new", color: "green", icon: "quote" },
    { label: t.dashboard.addCustomer, href: "/dashboard/customers", color: "purple", icon: "addUser" },
    { label: t.dashboard.addItem, href: "/dashboard/products", color: "orange", icon: "addBox" },
    { label: t.dashboard.newPurchase, href: "/dashboard/purchases/new", color: "pink", icon: "cart" },
    { href: "/dashboard/delivery-challans/new", label: t.dashboard.deliveryChallan, color: "teal", icon: "truck" },
  ];

  const ACTION_COLORS: Record<string, { bg: string; text: string; hoverBg: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", hoverBg: "hover:bg-blue-100" },
    green: { bg: "bg-green-50", text: "text-green-600", hoverBg: "hover:bg-green-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", hoverBg: "hover:bg-purple-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", hoverBg: "hover:bg-orange-100" },
    pink: { bg: "bg-pink-50", text: "text-pink-600", hoverBg: "hover:bg-pink-100" },
    teal: { bg: "bg-teal-50", text: "text-teal-600", hoverBg: "hover:bg-teal-100" },
  };

  const ACTION_ICONS: Record<string, JSX.Element> = {
    invoice: (
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1ZM14 3.5V8h4M9 13h6M9 16.5h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
    quote: (
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1ZM14 3.5V8h4M9 13h4M9 16.5h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
    addUser: (
      <path d="M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20c.6-3.2 3-5 7-5M18 8v6M15 11h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
    addBox: (
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5M12 12.5V21M12 12.5 20 8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
    cart: (
      <path d="M3 4h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h8.2a1.5 1.5 0 0 0 1.48-1.24L20 8H6.2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
    truck: (
      <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z M5.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            {t.dashboard.title}
            {profile?.business_name ? `, ${profile.business_name}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-text-soft">
            {t.dashboard.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/quotations/new"
            className="inline-flex items-center justify-center rounded-[10px] border border-[#2563EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#2563EB] shadow-card transition-all duration-200 ease-in-out hover:border-[#EC4899] hover:bg-[#EC4899] hover:text-white"
          >
            + {t.dashboard.newQuotation}
          </Link>
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center justify-center rounded-[10px] border border-[#2563EB] bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-all duration-200 ease-in-out hover:border-[#EC4899] hover:bg-[#EC4899] hover:text-white"
          >
            + {t.dashboard.newInvoice}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {stats.map((s) => {
          const c = STAT_COLORS[s.color];
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group relative overflow-hidden rounded-xl2 border border-paper-fold bg-white p-4 shadow-card transition hover:border-ink/20 hover:shadow-md sm:p-5"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 rounded-full ${c.blob} transition-transform group-hover:scale-110`}
              />
              <div className="relative">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    {STAT_ICONS[s.icon]}
                  </svg>
                </span>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-text-soft">
                  {s.label}
                </p>
                <p className="mt-1 font-ledger text-xl font-bold tabular-nums text-text sm:text-2xl">
                  {s.value}
                </p>
                {s.sublabel && (
                  <p className="mt-0.5 text-xs text-text-soft">{s.sublabel}</p>
                )}
                <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${c.cta}`}>
                  {s.cta}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl2 border border-paper-fold bg-white p-5 shadow-card sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-text">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink" aria-hidden="true">
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.dashboard.quickActions}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickActions.map((a) => {
            const c = ACTION_COLORS[a.color];
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl2 ${c.bg} ${c.hoverBg} px-3 py-5 text-center transition`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={c.text} aria-hidden="true">
                  {ACTION_ICONS[a.icon]}
                </svg>
                <span className={`text-sm font-semibold ${c.text}`}>+ {a.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl2 border border-paper-fold bg-white p-5 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-text">
              {t.dashboard.recentInvoices}
            </h2>
            {limits.invoicesPerMonth !== null && (
              <p
                className={`text-xs ${
                  (invoicesThisMonth ?? 0) >= limits.invoicesPerMonth
                    ? "font-medium text-alert"
                    : "text-text-soft"
                }`}
              >
                {invoicesThisMonth ?? 0} / {limits.invoicesPerMonth} {t.dashboard.invoicesThisMonth}
              </p>
            )}
          </div>
          <Link
            href="/dashboard/invoices"
            className="text-sm font-medium text-ink underline underline-offset-2"
          >
            {t.dashboard.viewAll}
          </Link>
        </div>

        {!invoices || invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-paper-fold py-10 text-center">
            <p className="text-sm text-text-soft">
              {t.dashboard.noInvoicesYet}
            </p>
            <Link
              href="/dashboard/invoices/new"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-light"
            >
              {t.dashboard.newInvoiceFull}
            </Link>
          </div>
        ) : (
          <>
            {/* Table on tablet/desktop */}
            <div className="hidden overflow-hidden rounded-xl sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-fold text-left text-xs font-semibold uppercase tracking-wide text-text-soft">
                    <th className="px-3 py-2.5">Invoice</th>
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-fold">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="transition hover:bg-paper/60">
                      <td className="px-3 py-3 font-medium text-ink">#{inv.invoice_number}</td>
                      <td className="px-3 py-3 text-text">
                        {inv.customers?.name ?? "Walk-in customer"}
                      </td>
                      <td className="px-3 py-3 text-text-soft">{inv.invoice_date}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold capitalize ${
                            inv.status === "paid"
                              ? "bg-success-bg text-success"
                              : inv.status === "partial"
                                ? "bg-blue-50 text-blue-600"
                                : inv.status === "cancelled"
                                  ? "bg-alert-bg text-alert"
                                  : "bg-orange-50 text-orange-600"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-ledger font-semibold tabular-nums text-text">
                        {formatCurrency(Number(inv.total))}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-paper-fold px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-paper"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards on mobile */}
            <ul className="flex flex-col divide-y divide-paper-fold sm:hidden">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      #{inv.invoice_number}
                    </p>
                    <p className="truncate text-xs text-text-soft">
                      {inv.customers?.name ?? "Walk-in customer"} · {inv.invoice_date}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold capitalize ${
                        inv.status === "paid"
                          ? "bg-success-bg text-success"
                          : inv.status === "partial"
                            ? "bg-blue-50 text-blue-600"
                            : inv.status === "cancelled"
                              ? "bg-alert-bg text-alert"
                              : "bg-orange-50 text-orange-600"
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
          </>
        )}
      </div>
    </div>
  );
}
