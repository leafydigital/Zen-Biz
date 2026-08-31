"use client";

import { useState } from "react";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import { PLAN_LABELS } from "@/lib/planFeatures";
import type { Plan } from "@/types/database";

export function PlanBadge({ plan, className = "" }: { plan: Plan; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-full bg-brass/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brass-dark transition hover:bg-brass/25 ${className}`}
      >
        {PLAN_LABELS[plan]} plan
      </button>
      {open && <PlanComparisonModal currentPlan={plan} onClose={() => setOpen(false)} />}
    </>
  );
}
