"use client";

import { useAppConfig } from "@/lib/AppConfigContext";
import { formatPrice } from "@/lib/currency";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Plan } from "@/types/database";

interface FeatureRow {
  label: string;
  starter: boolean | string;
  pro: boolean | string;
}

const FEATURES: FeatureRow[] = [
  { label: "Invoices", starter: "50/month", pro: "Unlimited" },
  { label: "Customers", starter: "75", pro: "Unlimited" },
  { label: "Products & services", starter: "75", pro: "Unlimited" },
  { label: "Businesses", starter: "1", pro: "Up to 5" },
  { label: "Users", starter: "1", pro: "Up to 10" },
  { label: "No watermark on invoices", starter: false, pro: true },
  { label: "Quotations, Proforma, convert to Invoice", starter: true, pro: true },
  { label: "A4 / A5 / Thermal paper sizes", starter: true, pro: true },
  { label: "Terms & Conditions, signature, bank details", starter: true, pro: true },
  { label: "Purchases & Suppliers", starter: false, pro: true },
  { label: "E-way bill & e-invoice", starter: false, pro: true },
  { label: "Delivery Challan", starter: false, pro: true },
  { label: "Share via WhatsApp / email", starter: false, pro: true },
  { label: "Expense tracking", starter: false, pro: true },
  { label: "Invoice tracking (Sent/Viewed/Overdue)", starter: false, pro: true },
  { label: "POS print support", starter: true, pro: true },
  { label: "Colourful & custom invoice styles, size adjustments", starter: false, pro: true },
  { label: "GST billing & GST report", starter: false, pro: true },
  { label: "Profit & Loss and all reports", starter: false, pro: true },
  { label: "Multiple users & roles", starter: false, pro: true },
  { label: "Low stock alerts", starter: false, pro: true },
  { label: "Barcode scanning", starter: false, pro: true },
];

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Included">
      <circle cx="12" cy="12" r="11" fill="#ECFDF5" />
      <path d="M7.5 12.5l3 3 6-6.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Not included">
      <circle cx="12" cy="12" r="11" fill="#F1F5F9" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <div className="flex justify-center py-2.5 px-1 text-center text-xs font-semibold text-text">
        {value}
      </div>
    );
  }
  return <div className="flex justify-center py-2.5">{value ? <Check /> : <Cross />}</div>;
}

export function PlanComparisonModal({
  currentPlan,
  onClose,
}: {
  currentPlan: Plan;
  onClose: () => void;
}) {
  const { pricing: allPricing, paymentsEnabled, currency } = useAppConfig();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const plans: { id: Plan; label: string; blurb: string }[] = [
    { id: "starter", label: "Basic", blurb: "Freelancers & small shops" },
    { id: "professional", label: "Pro", blurb: "Everything, for growing businesses" },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-[820px] overflow-y-auto rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2 sm:p-8"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-text-soft transition hover:bg-paper hover:text-text"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <h2 className="font-display text-2xl font-semibold text-text">Choose your plan</h2>
        <p className="mt-1 text-sm text-text-soft">
          You're currently on the {plans.find((p) => p.id === (currentPlan === "business" ? "professional" : currentPlan))?.label} plan.
        </p>
        {!paymentsEnabled && (
          <p className="mt-2 rounded-lg bg-brass/10 px-3 py-2 text-xs text-brass-dark">
            Online upgrades are coming soon. Everything on the Basic plan
            works fully in the meantime.
          </p>
        )}

        <div className="mt-4 inline-flex rounded-full bg-paper p-1 text-sm">
          <button
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
              cycle === "monthly" ? "bg-ink text-paper" : "text-text-soft"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
              cycle === "yearly" ? "bg-ink text-paper" : "text-text-soft"
            }`}
          >
            Yearly <span className="text-brass-dark">(save ~17%)</span>
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {plans.map((p) => {
            const isCurrent = p.id === (currentPlan === "business" ? "professional" : currentPlan);
            const pricing = p.id === "starter" ? null : allPricing.professional;
            return (
              <div
                key={p.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 ${
                  isCurrent ? "border-ink bg-ink/[0.03]" : "border-paper-fold bg-white"
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-text-soft">
                  {p.label}
                </p>
                <p className="font-display text-2xl font-bold text-text">
                  {pricing ? formatPrice(pricing[cycle], currency) : formatPrice(0, currency)}
                  {pricing && (
                    <span className="text-sm font-normal text-text-soft">
                      /{cycle === "monthly" ? "mo" : "yr"}
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-soft">{p.blurb}</p>
                {isCurrent ? (
                  <span className="mt-2 rounded-lg bg-paper-fold px-3 py-2 text-center text-sm font-semibold text-text-soft">
                    Current plan
                  </span>
                ) : p.id === "starter" ? (
                  <span className="mt-2 rounded-lg border border-paper-fold px-3 py-2 text-center text-sm font-medium text-text-soft">
                    Free forever
                  </span>
                ) : paymentsEnabled ? (
                  <Link
                    href={`/dashboard/settings/upgrade?plan=${p.id}&cycle=${cycle}`}
                    onClick={onClose}
                    className="mt-2 rounded-lg bg-ink px-3 py-2 text-center text-sm font-semibold text-paper transition hover:bg-ink-light"
                  >
                    Upgrade
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Online payments are coming soon"
                    className="mt-2 cursor-not-allowed rounded-lg bg-paper-fold px-3 py-2 text-center text-sm font-semibold text-text-soft opacity-70"
                  >
                    Coming soon
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-paper-fold">
          <div className="grid grid-cols-[1fr_84px_84px] bg-paper text-xs font-semibold uppercase tracking-wide text-text-soft">
            <div className="px-4 py-3">Feature</div>
            <div className="px-1 py-3 text-center">Basic</div>
            <div className="px-1 py-3 text-center text-brass-dark">Pro</div>
          </div>
          <div className="divide-y divide-paper-fold">
            {FEATURES.map((f) => (
              <div key={f.label} className="grid grid-cols-[1fr_84px_84px] items-center">
                <div className="px-4 py-2.5 text-sm text-text">{f.label}</div>
                <FeatureCell value={f.starter} />
                <FeatureCell value={f.pro} />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-paper-fold px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-paper"
        >
          Close
        </button>
      </div>
    </div>
  );
}
