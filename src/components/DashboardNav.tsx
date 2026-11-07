"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearLoginVerification } from "@/lib/actions/otpActions";
import { getLabels, ITEM_PLURAL_KEYS } from "@/lib/businessLabels";
import { getPlanFeatures } from "@/lib/planFeatures";
import { VersionLine } from "@/components/VersionLine";
import { Logo } from "@/components/Logo";
import { useUpdateAvailable } from "@/lib/useUpdateAvailable";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import { useTranslation } from "@/lib/i18n/I18nContext";
import { hasPermission, isBillingOnly, permissionForPath } from "@/lib/permissions";
import type { Plan } from "@/types/database";

const ICONS = {
  home: (
    <path d="M4 11.5 12 5l8 6.5M6 10v9h5v-5h2v5h5v-9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  box: (
    <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5M12 12.5 20 8M12 12.5V21" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  stock: (
    <path d="M12 4 3 8.5 12 13l9-4.5L12 4ZM3 12.5 12 17l9-4.5M3 16.5 12 21l9-4.5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  invoice: (
    <path d="M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5v-17ZM9 8h6M9 11.5h6M9 15h3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  billing: (
    <path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1ZM8 7h8v3H8V7ZM8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  quote: (
    <path d="M9 4h6v3H9V4ZM8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16M8.5 12h7M8.5 16h4.5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  supplier: (
    <path d="M5.8 9.2a3.2 3.2 0 0 0 6.4 0v-1C12.2 5.6 10.8 4 9 4S5.8 5.6 5.8 8.2v1ZM4.8 8.6h8.4M3 20.5c.4-3 2.6-5 6-5 1.5 0 2.6.4 3.5 1.2M13.5 12.5H21v8h-7.5v-8ZM17.25 12.5V15M15.5 18h3.5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  users: (
    <path d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c.6-3.2 3-5 6-5s5.4 1.8 6 5M14 20c.4-2.2 1.7-3.7 3.5-4.4c2 .3 3.6 1.9 4 4.4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  file: (
    <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z M14 3.5V8h4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  cart: (
    <path d="M3 4h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h8.2a1.5 1.5 0 0 0 1.48-1.24L20 8H6.2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  truck: (
    <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z M5.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  settings: (
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19.5a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4.5a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V4.5a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H19.5a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  more: (
    <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  chart: (
    <path d="M4 19V10M10 19V5M16 19v-7M4 19h16" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  scale: (
    <path d="M12 3v18M12 3l-5 4M12 3l5 4M4 10h6M14 10h6M4 10l1.5 5a2.5 2.5 0 0 0 5 0L12 10M14 10l1.5 5a2.5 2.5 0 0 0 5 0L22 10" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  refresh: (
    <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  message: (
    <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.5 4V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function DashboardNav({
  businessType,
  plan,
  allowed,
  mobileExtras,
}: {
  businessType?: string;
  plan?: Plan;
  allowed?: string[];
  mobileExtras?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Billing records are made/edited on the invoice form with ?type=billing;
  // they belong to the Billing Records menu item, not Invoices.
  const isBillingForm = pathname.startsWith("/dashboard/invoices/") && searchParams.get("type") === "billing";
  const { t } = useTranslation();
  const labels = getLabels(businessType);
  const resolvedPlan = plan ?? "starter";
  const features = getPlanFeatures(resolvedPlan);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const updateAvailable = useUpdateAvailable();
  const router = useRouter();

  // While the phone menu is open the page behind it must not scroll —
  // that is what made the menu bounce and flash blank at the bottom.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  async function signOut() {
    await clearLoginVerification();
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const mainItems: { href: string; label: string; icon: keyof typeof ICONS; locked?: boolean }[] = [
    { href: "/dashboard", label: t.nav.overview, icon: "home" },
    { href: "/dashboard/products", label: (ITEM_PLURAL_KEYS[labels.itemPlural as keyof typeof ITEM_PLURAL_KEYS] && t.itemNames[ITEM_PLURAL_KEYS[labels.itemPlural as keyof typeof ITEM_PLURAL_KEYS]]) || labels.itemPlural, icon: "box" },
    { href: "/dashboard/stock", label: t.nav.stock, icon: "stock" },
    { href: "/dashboard/purchases", label: t.nav.purchases, icon: "cart", locked: !features.purchases },
    { href: "/dashboard/suppliers", label: t.nav.suppliers, icon: "supplier", locked: !features.purchases },
    { href: "/dashboard/customers", label: t.nav.customers, icon: "users" },
    { href: "/dashboard/invoices", label: t.nav.invoices, icon: "invoice" },
    { href: "/dashboard/billing-records", label: t.nav.billingRecords, icon: "billing" },
    { href: "/dashboard/quotations", label: t.nav.quotations, icon: "quote" },
    { href: "/dashboard/proforma", label: "Proforma", icon: "file" },
    { href: "/dashboard/delivery-challans", label: t.nav.deliveryChallans, icon: "truck", locked: !features.deliveryChallans },
  ];
  const reportItems: { href: string; label: string; icon: keyof typeof ICONS; locked?: boolean }[] = [
    { href: "/dashboard/reports", label: t.nav.gstReport, icon: "chart", locked: !features.gstReport },
    { href: "/dashboard/profit-loss", label: t.nav.profitLoss, icon: "scale", locked: !features.profitAndLoss },
    { href: "/dashboard/income-expenses", label: "Income & Expenses", icon: "cart", locked: !features.expenseTracking },
  ];
  const settingsItems: { href: string; label: string; icon: keyof typeof ICONS; locked?: boolean }[] = [
    { href: "/dashboard/settings", label: t.nav.settings, icon: "settings" },
  ];
  const canSee = (href: string) => {
    if (href === "/dashboard") return !allowed || allowed.includes("overview");
    const need = permissionForPath(href);
    return !need || !allowed || hasPermission(allowed, need);
  };
  mainItems.splice(0, mainItems.length, ...mainItems.filter((i) => canSee(i.href)));
  reportItems.splice(0, reportItems.length, ...reportItems.filter((i) => canSee(i.href)));
  const billingOnly = !!allowed && isBillingOnly(allowed);
  if (billingOnly) {
    mainItems.splice(0, mainItems.length, ...mainItems.filter((i) => i.href === "/dashboard/billing-records"));
    settingsItems.splice(0, settingsItems.length);
  }
  const items = [...mainItems, ...reportItems, ...settingsItems];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (isBillingForm) return href === "/dashboard/billing-records";
    return pathname.startsWith(href);
  }

  function NavLink({ item, onNavigate }: { item: (typeof items)[number] & { dot?: boolean }; onNavigate?: () => void }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white"
            : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon name={item.icon} />
        <span className="flex-1">{item.label}</span>
        {item.dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-white/70" aria-label="Update available" />}
        {item.locked && (
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-brass-dark">
            {t.nav.pro}
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      {/* Desktop / tablet: gradient rail with grouped sections */}
      <nav
        className="hidden shrink-0 flex-col gap-1 overflow-y-auto bg-gradient-to-b from-ink via-indigo-600 to-brass px-3 py-5 md:sticky md:top-0 md:flex md:h-screen md:w-56 lg:w-64"
        aria-label="Main navigation"
      >
        <Link href="/dashboard" className="mb-4 px-2">
          <Logo variant="light" />
        </Link>

        <div className="flex flex-col gap-1">
          {mainItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <p className={`mb-1 mt-5 px-3.5 text-[0.68rem] font-semibold uppercase tracking-wider text-blue-200/80 ${billingOnly ? "hidden" : ""}`}>
          {t.nav.reports}
        </p>
        <div className="flex flex-col gap-1">
          {reportItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <p className={`mb-1 mt-5 px-3.5 text-[0.68rem] font-semibold uppercase tracking-wider text-blue-200/80 ${billingOnly ? "hidden" : ""}`}>
          {t.nav.settings}
        </p>
        <div className="flex flex-col gap-1">
          {settingsItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-2">
          {!billingOnly && <NavLink item={{ href: "/dashboard/updates", label: "Updates", icon: "refresh", dot: updateAvailable }} />}
          <NavLink item={{ href: "/dashboard/contact-us", label: t.nav.contactUs, icon: "message" }} />
        </div>

        {resolvedPlan === "starter" && (
          <div className="mt-auto pt-5">
            <div className="rounded-2xl bg-white/15 p-4 text-center">
              <span className="text-xl" aria-hidden="true">👑</span>
              <p className="mt-1.5 text-sm font-semibold text-white">Upgrade to Pro</p>
              <p className="mt-1 text-xs text-blue-100">
                Unlock all features and grow your business faster.
              </p>
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-blue-50"
              >
                Upgrade Now →
              </button>
            </div>
          </div>
        )}

        <p className="mt-3 px-2 text-xs text-blue-200/60"><VersionLine label={t.nav.version} /></p>
      </nav>

      {/* Phone / app: 3-line button (top-left) opens a left-side menu with every page */}
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        className="fixed left-3 top-2.5 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-indigo-600 text-white shadow-card md:hidden"
        style={{ top: "calc(env(safe-area-inset-top) + 0.625rem)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        {updateAvailable && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />}
      </button>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <nav
            className="absolute left-0 top-0 flex w-[80%] max-w-xs flex-col gap-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-ink via-indigo-600 to-brass px-3 py-4 shadow-2xl"
            style={{ height: "100dvh", WebkitOverflowScrolling: "touch", paddingTop: "calc(env(safe-area-inset-top) + 1rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <div className="mb-3 flex items-center justify-between px-2">
              <Logo variant="light" />
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            {mobileExtras && (
              <div
                className="mb-2 flex flex-col gap-2 rounded-xl bg-white p-2.5"
                onClick={(e) => { if ((e.target as HTMLElement).closest("[data-close]")) setMenuOpen(false); }}
              >
                {mobileExtras}
              </div>
            )}

            {mainItems.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={() => setMenuOpen(false)} />
            ))}
            <p className={`mb-1 mt-4 px-3.5 text-[0.68rem] font-semibold uppercase tracking-wider text-blue-200/80 ${billingOnly ? "hidden" : ""}`}>{t.nav.reports}</p>
            {reportItems.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={() => setMenuOpen(false)} />
            ))}
            <p className={`mb-1 mt-4 px-3.5 text-[0.68rem] font-semibold uppercase tracking-wider text-blue-200/80 ${billingOnly ? "hidden" : ""}`}>{t.nav.settings}</p>
            {settingsItems.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={() => setMenuOpen(false)} />
            ))}
            <div className="mt-2 border-t border-white/10 pt-2">
              {!billingOnly && <NavLink item={{ href: "/dashboard/updates", label: "Updates", icon: "refresh", dot: updateAvailable }} onNavigate={() => setMenuOpen(false)} />}
              <NavLink item={{ href: "/dashboard/contact-us", label: t.nav.contactUs, icon: "message" }} onNavigate={() => setMenuOpen(false)} />
              <NavLink item={{ href: "/about-app", label: t.nav.aboutApp, icon: "file" }} onNavigate={() => setMenuOpen(false)} />
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-red-100 transition hover:bg-red-500/30 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" /></svg>
                <span className="flex-1">Sign out</span>
              </button>
            </div>

            {resolvedPlan === "starter" && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setUpgradeOpen(true); }}
                className="mt-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-ink"
              >
                👑 Upgrade to Pro
              </button>
            )}
            <p className="mt-3 px-2 text-xs text-blue-200/70"><VersionLine label={t.nav.version} /></p>
          </nav>
        </div>
      )}

      {upgradeOpen && (
        <PlanComparisonModal currentPlan={resolvedPlan} onClose={() => setUpgradeOpen(false)} />
      )}
    </>
  );
}
