"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLabels } from "@/lib/businessLabels";
import { getPlanFeatures } from "@/lib/planFeatures";
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
  const labels = getLabels(businessType);
  const features = getPlanFeatures(plan ?? "starter");

  const items: { href: string; label: string; icon: keyof typeof ICONS; locked?: boolean }[] = [
    { href: "/dashboard", label: "Overview", icon: "home" },
    { href: "/dashboard/products", label: labels.itemPlural, icon: "box" },
    { href: "/dashboard/purchases", label: "Purchases", icon: "cart", locked: !features.purchases },
    { href: "/dashboard/suppliers", label: "Suppliers", icon: "truck", locked: !features.purchases },
    { href: "/dashboard/customers", label: "Customers", icon: "users" },
    { href: "/dashboard/invoices", label: "Invoices", icon: "file" },
    { href: "/dashboard/quotations", label: "Quotations", icon: "file" },
    { href: "/dashboard/delivery-challans", label: "Delivery Challans", icon: "truck", locked: !features.deliveryChallans },
    { href: "/dashboard/reports", label: "GST Report", icon: "chart", locked: !features.gstReport },
    { href: "/dashboard/profit-loss", label: "Profit & Loss", icon: "scale", locked: !features.profitAndLoss },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop / tablet: left rail with the brass stitch as the active indicator */}
      <nav
        className="hidden shrink-0 flex-col gap-1 border-r border-paper-fold bg-paper-card px-3 py-6 md:flex md:w-56 lg:w-64"
        aria-label="Main navigation"
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-ink/[0.06] text-ink"
                  : "text-text-soft hover:bg-ink/[0.04] hover:text-text"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brass" />
              )}
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              {item.locked && (
                <span className="rounded-full bg-brass/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brass-dark">
                  Paid
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: bottom tab bar shows the 4 most-used items, others sit behind "More" */}
      <MobileNav items={items} isActive={isActive} />
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
              <span className={active ? "text-brass-dark" : ""}>
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
          <span className={overflowHasActive ? "text-brass-dark" : ""}>
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
                        Paid
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
