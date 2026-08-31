"use client";

import { useState } from "react";
import Link from "next/link";
import { PLAN_LABELS, PLAN_PRICING, getPlanFeatures } from "@/lib/planFeatures";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import type { Profile } from "@/types/database";

export function PlanBillingTab({ profile }: { profile: Profile }) {
  const [compareOpen, setCompareOpen] = useState(false);
  const features = getPlanFeatures(profile.plan);
  const pricing = profile.plan === "starter" ? null : PLAN_PRICING[profile.plan];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">
          Plan & Billing
        </h2>
        <p className="text-sm text-text-soft">
          Manage your Zen Biz subscription.
        </p>
      </div>

      <div className="rounded-xl border border-paper-fold bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-text-soft">
          Current plan
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-text">
          {PLAN_LABELS[profile.plan]}
          {pricing && profile.billing_cycle && (
            <span className="ml-2 text-base font-normal text-text-soft">
              ₹{pricing[profile.billing_cycle].toLocaleString("en-IN")}/
              {profile.billing_cycle === "monthly" ? "mo" : "yr"}
            </span>
          )}
        </p>
        {profile.plan_renews_at && (
          <p className="mt-1 text-xs text-text-soft">
            Renews {new Date(profile.plan_renews_at).toLocaleDateString("en-IN")}
          </p>
        )}
        {features.invoiceWatermark && (
          <p className="mt-3 rounded-lg bg-brass/10 px-3 py-2 text-xs text-brass-dark">
            Your invoices carry a "Generated with Zen Biz" watermark on the
            Starter plan. Upgrade to remove it.
          </p>
        )}

        <button
          onClick={() => setCompareOpen(true)}
          className="mt-4 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          {profile.plan === "starter" ? "View plans & upgrade" : "Change plan"}
        </button>
      </div>

      <Link
        href="/dashboard/settings/billing-history"
        className="text-sm font-medium text-ink underline underline-offset-2"
      >
        View billing history
      </Link>

      {compareOpen && (
        <PlanComparisonModal currentPlan={profile.plan} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}
