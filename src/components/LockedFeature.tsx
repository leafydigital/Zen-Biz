import Link from "next/link";
import type { Plan } from "@/types/database";
import { PLAN_LABELS } from "@/lib/planFeatures";

export function LockedFeature({
  title,
  description,
  requiredPlan,
}: {
  title: string;
  description: string;
  requiredPlan: Plan;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl2 border border-dashed border-brass/40 bg-paper-card px-6 py-16 text-center shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brass/15 text-xl text-brass-dark">
        🔒
      </span>
      <h1 className="font-display text-xl font-semibold text-text">{title}</h1>
      <p className="max-w-sm text-sm text-text-soft">{description}</p>
      <Link
        href="/dashboard/settings?tab=plan"
        className="mt-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
      >
        Upgrade to {PLAN_LABELS[requiredPlan]}
      </Link>
    </div>
  );
}
