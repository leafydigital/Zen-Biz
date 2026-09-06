"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBusinessMember, removeBusinessMember } from "@/lib/actions/businessActions";
import { getPlanFeatures } from "@/lib/planFeatures";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import type { BusinessMemberWithEmail } from "@/lib/getActiveBusiness";
import type { Plan } from "@/types/database";

export function TeamManagementTab({
  businessId,
  members,
  currentUserId,
  isOwner,
  plan,
}: {
  businessId: string;
  members: BusinessMemberWithEmail[];
  currentUserId: string;
  isOwner: boolean;
  plan: Plan;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const limit = getPlanFeatures(plan).limits.users;
  const atLimit = limit !== null && members.length >= limit;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    if (atLimit) {
      setShowUpgrade(true);
      return;
    }

    setInviting(true);
    setError(null);
    const result = await addBusinessMember(businessId, email.trim());
    setInviting(false);

    if (result.error) {
      if (result.error.includes("Upgrade")) {
        setShowUpgrade(true);
        return;
      }
      setError(result.error);
      return;
    }

    setEmail("");
    router.refresh();
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    const result = await removeBusinessMember(businessId, userId);
    setRemovingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">Team</h2>
        <p className="text-sm text-text-soft">
          {limit !== null ? `Users: ${members.length} / ${limit}` : `Users: ${members.length}`}
        </p>
      </div>

      {atLimit && (
        <p className="rounded-lg bg-brass/10 px-3.5 py-2.5 text-sm text-brass-dark">
          {plan === "starter"
            ? "Starter includes 1 user. Upgrade to Professional to add another user."
            : `Your plan includes up to ${limit} users. Upgrade to a higher plan to add more.`}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center justify-between gap-3 rounded-xl border border-paper-fold bg-white p-3.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {m.email}
                {m.user_id === currentUserId && (
                  <span className="ml-1.5 text-xs font-normal text-text-soft">(you)</span>
                )}
              </p>
              <p className="text-xs capitalize text-text-soft">{m.role}</p>
            </div>
            {isOwner && m.role !== "owner" && (
              <button
                type="button"
                disabled={removingId === m.user_id}
                onClick={() => handleRemove(m.user_id)}
                className="shrink-0 rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert-bg disabled:opacity-60"
              >
                {removingId === m.user_id ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner ? (
        <form onSubmit={handleInvite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Add a team member by email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
            />
            <span className="text-xs text-text-soft">
              They must already have a Zen Biz account with this email.
            </span>
          </label>
          <button
            type="submit"
            disabled={inviting || !email.trim()}
            className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
          >
            {inviting ? "Adding…" : "Add"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-text-soft">Only the business owner can manage team members.</p>
      )}

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      {showUpgrade && (
        <PlanComparisonModal currentPlan={plan} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
