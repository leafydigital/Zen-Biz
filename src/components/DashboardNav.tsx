"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLabels } from "@/lib/businessLabels";
import { getPlanFeatures } from "@/lib/planFeatures";
import { Logo } from "@/components/Logo";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import { useTranslation } from "@/lib/i18n/I18nContext";
import type { Plan } from "@/types/database";

const ICONS = {
  home: (
    <path d="M4 11.5 12 5l8 6.5M6 10v9h5v-5h2v5h5v-9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  box: (
    <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5M12 12.5 20 8M12 12.5V21" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
}: {
  businessType?: string;
  plan?: Plan;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const labels = getLabels(businessType);
  const resolvedPlan = plan ?? "starter";
  const features = getPlanFeatures(resolvedPlan);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const mainItems: { href: string; label: string; icon: keyof typeof ICONS; locked?: boolean }[] = [
    { href: "/dashboard", label: t.nav.overview, icon: "home" },
    { href: "/dashboard/products", label: labels.itemPlural, icon: "box" },
    { href: "/dashboard/purchases", label: t.nav.purchases, icon: "cart", locked: !features.purchases },
    { href: "/dashboard/suppliers", label: t.nav.suppliers, icon: "truck", locked: !features.purchases },
    { href: "/dashboard/customers", label: t.nav.customers, icon: "users" },
    { href: "/dashboard/invoices", label: t.nav.invoices, icon: "file" },
    { href: "/dashboard/billing-records", label: t.nav.billingRecords, icon: "file" },
    { href: "/dashboard/quotations", label: t.nav.quotations, icon: "file" },
    { href: "/dashboard/delivery-challans", label: t.nav.deliveryChallans, icon: "truck", locked: !features.deliveryChallans },
  ];
  const reportItems: { href: string; label: string; icon: keyof typeof ICONS; locked?: boolean }[] = [
    { href: "/dashboard/reports", label: t.nav.gstReport, icon: "chart", locked: !features.gstReport },
    { href: "/dashboard/profit-loss", label: t.nav.profitLoss, icon: "scale", locked: !features.profitAndLoss },
  ];
  const settingsItems: { href: string; label: string; icon: keyof typeof ICONS; locked?: boolean }[] = [
    { href: "/dashboard/settings", label: t.nav.settings, icon: "settings" },
  ];
  const items = [...mainItems, ...reportItems, ...settingsItems];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function NavLink({ item }: { item: (typeof items)[number] }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white"
            : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon name={item.icon} />
        <span className="flex-1">{item.label}</span>
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
        className="hidden shrink-0 flex-col gap-1 overflow-y-auto bg-gradient-to-b from-ink via-indigo-600 to-brass px-3 py-5 md:flex md:w-56 lg:w-64"
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

        <p className="mb-1 mt-5 px-3.5 text-[0.68rem] font-semibold uppercase tracking-wider text-blue-200/80">
          {t.nav.reports}
        </p>
        <div className="flex flex-col gap-1">
          {reportItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <p className="mb-1 mt-5 px-3.5 text-[0.68rem] font-semibold uppercase tracking-wider text-blue-200/80">
          {t.nav.settings}
        </p>
        <div className="flex flex-col gap-1">
          {settingsItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {resolvedPlan === "starter" && (
          <div className="mt-auto pt-5">
            <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm">
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
      </nav>

      {/* Mobile: bottom tab bar shows the 4 most-used items, others sit behind "More" */}
      <MobileNav items={items} isActive={isActive} />

      {upgradeOpen && (
        <PlanComparisonModal currentPlan={resolvedPlan} onClose={() => setUpgradeOpen(false)} />
      )}
    </>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  locked?: boolean;
}

function MobileNav({
  items,
  isActive,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { t } = useTranslation();

  // Keep the bottom bar to 4 primary tabs + "More" — 8 items squeezed into
  // one row would be unreadable on a phone-width screen. Anything beyond
  // the first 4 lives behind the "More" sheet instead.
  const primary = items.slice(0, 4);
  const overflow = items.slice(4);
  const overflowHasActive = overflow.some((item) => isActive(item.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-paper-fold bg-paper-card/95 backdrop-blur md:hidden"
        aria-label="Main navigation"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primary.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.68rem] font-medium ${
                active ? "text-ink" : "text-text-soft"
              }`}
            >
              <span className={active ? "text-ink" : ""}>
                <Icon name={item.icon} />
              </span>
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.68rem] font-medium ${
            overflowHasActive ? "text-ink" : "text-text-soft"
          }`}
        >
          <span className={overflowHasActive ? "text-ink" : ""}>
            <Icon name="more" />
          </span>
          More
        </button>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-ink/40 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-xl2 bg-paper-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-card"
          >
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="font-display text-base font-semibold text-text">
                More
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-sm font-medium text-text-soft"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {overflow.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                      active ? "bg-ink/[0.06] text-ink" : "text-text"
                    }`}
                  >
                    <Icon name={item.icon} />
                    <span className="flex-1">{item.label}</span>
                    {item.locked && (
                      <span className="rounded-full bg-brass/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brass-dark">
                        {t.nav.pro}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
