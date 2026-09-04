"use client";

import { useState } from "react";
import { PLAN_PRICING, getLimitMessage, type LimitKind } from "@/lib/planFeatures";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import type { Plan } from "@/types/database";

/**
 * Shown when a Starter-plan usage limit (customers, products, or invoices
 * this month) is hit at the moment of creation. Blocks the action — the
 * caller should not proceed with the insert while this is open.
 */
export function LimitReachedModal({
  kind,
  limit,
  currentPlan,
  onClose,
}: {
  kind: LimitKind;
  limit: number;
  currentPlan: Plan;
  onClose: () => void;
}) {
  const [showComparison, setShowComparison] = useState(false);
  const message = getLimitMessage(kind, limit);

  if (showComparison) {
    return <PlanComparisonModal currentPlan={currentPlan} onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2"
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brass/15 text-brass-dark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="font-display text-lg font-semibold text-text">{message.title}</h2>
        <p className="mt-2 text-sm text-text-soft">{message.body}</p>

        <p className="mt-4 font-display text-2xl font-bold text-text">
          ₹{PLAN_PRICING.professional.monthly}
          <span className="text-sm font-normal text-text-soft">/month</span>
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowComparison(true)}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
          >
            Upgrade to Professional
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-text-soft transition hover:bg-paper"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
