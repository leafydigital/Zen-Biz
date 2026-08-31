"use client";

import { useEffect, useState } from "react";
import { PLAN_PRICING } from "@/lib/planFeatures";
import type { Plan } from "@/types/database";

interface FeatureRow {
  label: string;
  starter: boolean;
  professional: boolean;
  business: boolean;
}

const FEATURES: FeatureRow[] = [
  { label: "Products & services", starter: true, professional: true, business: true },
  { label: "Customers", starter: true, professional: true, business: true },
  { label: "Invoices (with watermark on Starter)", starter: true, professional: true, business: true },
  { label: "Quotations, convert to Invoice", starter: true, professional: true, business: true },
  { label: "A4 / A5 / Thermal paper sizes", starter: true, professional: true, business: true },
  { label: "Terms & Conditions, signature, bank details", starter: true, professional: true, business: true },
  { label: "Purchases & Suppliers", starter: false, professional: true, business: true },
  { label: "Delivery Challan", starter: false, professional: true, business: true },
  { label: "Share via WhatsApp / email", starter: false, professional: true, business: true },
  { label: "Expense tracking", starter: false, professional: true, business: true },
  { label: "Invoice tracking (Sent/Viewed/Overdue)", starter: false, professional: true, business: true },
  { label: "Colourful document styles", starter: false, professional: false, business: true },
  { label: "GST billing & GST report", starter: false, professional: false, business: true },
  { label: "Profit & Loss report", starter: false, professional: false, business: true },
  { label: "Multiple users & roles", starter: false, professional: false, business: true },
  { label: "Low stock alerts", starter: false, professional: false, business: true },
];

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Included">
      <circle cx="12" cy="12" r="11" fill="#E9F2ED" />
      <path d="M7.5 12.5l3 3 6-6.5" stroke="#2E6B4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Not included">
      <circle cx="12" cy="12" r="11" fill="#F2F0EA" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="#A8A296" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlanComparisonModal({
  currentPlan,
  onClose,
}: {
  currentPlan: Plan;
  onClose: () => void;
}) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const plans: { id: Plan; label: string; blurb: string }[] = [
    { id: "starter", label: "Starter", blurb: "Freelancers & small shops" },
    { id: "professional", label: "Professional", blurb: "Growing small businesses" },
    { id: "business", label: "Business", blurb: "Established SMEs" },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
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
          You're currently on the {plans.find((p) => p.id === currentPlan)?.label} plan.
        </p>
        <p className="mt-2 rounded-lg bg-brass/10 px-3 py-2 text-xs text-brass-dark">
          Online upgrades are coming soon. Everything on the Starter plan
          works fully in the meantime.
        </p>

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

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.id === currentPlan;
            const pricing = p.id === "starter" ? null : PLAN_PRICING[p.id as "professional" | "business"];
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
                  {pricing ? `₹${pricing[cycle].toLocaleString("en-IN")}` : "₹0"}
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
          <div className="grid grid-cols-[1fr_60px_60px_60px] bg-paper text-xs font-semibold uppercase tracking-wide text-text-soft">
            <div className="px-4 py-3">Feature</div>
            <div className="px-1 py-3 text-center">Starter</div>
            <div className="px-1 py-3 text-center">Pro</div>
            <div className="px-1 py-3 text-center text-brass-dark">Business</div>
          </div>
          <div className="divide-y divide-paper-fold">
            {FEATURES.map((f) => (
              <div key={f.label} className="grid grid-cols-[1fr_60px_60px_60px] items-center">
                <div className="px-4 py-2.5 text-sm text-text">{f.label}</div>
                <div className="flex justify-center py-2.5">{f.starter ? <Check /> : <Cross />}</div>
                <div className="flex justify-center py-2.5">{f.professional ? <Check /> : <Cross />}</div>
                <div className="flex justify-center py-2.5">{f.business ? <Check /> : <Cross />}</div>
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
