"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBusiness, switchActiveBusiness } from "@/lib/actions/businessActions";
import { getPlanFeatures } from "@/lib/planFeatures";
import { PlanComparisonModal } from "@/components/PlanComparisonModal";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/businessLabels";
import type { Business, Plan } from "@/types/database";

export function BusinessManagementTab({
  businesses,
  activeBusinessId,
  plan,
}: {
  businesses: (Business & { role: "owner" | "member" })[];
  activeBusinessId: string;
  plan: Plan;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  const limit = getPlanFeatures(plan).limits.businesses;
  const atLimit = limit !== null && businesses.length >= limit;

  function handleSwitch(businessId: string) {
    if (businessId === activeBusinessId) return;
    setSwitchingId(businessId);
    startTransition(async () => {
      await switchActiveBusiness(businessId);
      setSwitchingId(null);
      router.refresh();
    });
  }

  function handleAddClick() {
    if (atLimit) {
      setShowUpgrade(true);
      return;
    }
    setLimitError(null);
    setShowAddForm(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-text">Your businesses</h2>
          <p className="text-sm text-text-soft">
            {limit !== null
              ? `Businesses: ${businesses.length} / ${limit}`
              : `Businesses: ${businesses.length}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + Add Business
        </button>
      </div>

      {atLimit && (
        <p className="rounded-lg bg-brass/10 px-3.5 py-2.5 text-sm text-brass-dark">
          {plan === "starter"
            ? "You've reached the 1-business limit on Starter. Upgrade to Professional to manage up to 2 businesses."
            : plan === "professional"
              ? "Professional allows up to 2 businesses. Upgrade to Business to manage up to 5 businesses."
              : "You've reached your plan's business limit."}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {businesses.map((b) => {
          const isActive = b.id === activeBusinessId;
          return (
            <div
              key={b.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                isActive ? "border-ink bg-ink/[0.03]" : "border-paper-fold bg-white"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                {b.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logo_url}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full border border-paper-fold object-contain"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold uppercase text-white">
                    {(b.business_name || "Z").charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-text">
                      {b.business_name || "Untitled business"}
                    </p>
                    {isActive && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[0.65rem] font-semibold text-success">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Active
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs capitalize text-text-soft">
                    {b.business_type || "—"}
                    {b.gst_number ? ` · GSTIN: ${b.gst_number}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!isActive && (
                  <button
                    type="button"
                    disabled={pending && switchingId === b.id}
                    onClick={() => handleSwitch(b.id)}
                    className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper disabled:opacity-60"
                  >
                    {pending && switchingId === b.id ? "Switching…" : "Switch to this"}
                  </button>
                )}
                <a
                  href={isActive ? "/dashboard/settings?tab=general" : undefined}
                  onClick={(e) => {
                    if (!isActive) {
                      e.preventDefault();
                      handleSwitch(b.id);
                    }
                  }}
                  className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
                >
                  Edit
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {showAddForm && (
        <AddBusinessForm
          onClose={() => setShowAddForm(false)}
          onLimitError={(msg) => {
            setShowAddForm(false);
            setLimitError(msg);
            setShowUpgrade(true);
          }}
        />
      )}

      {limitError && !showUpgrade && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {limitError}
        </p>
      )}

      {showUpgrade && (
        <PlanComparisonModal currentPlan={plan} onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}

function AddBusinessForm({
  onClose,
  onLimitError,
}: {
  onClose: () => void;
  onLimitError: (message: string) => void;
}) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) {
      setError("Business name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createBusiness({
      business_name: businessName.trim(),
      business_type: businessType.trim(),
    });
    setSaving(false);
    if (result.error) {
      if (result.business === null && result.error.includes("Upgrade")) {
        onLimitError(result.error);
        return;
      }
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex w-full max-w-[440px] flex-col gap-4 rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2"
      >
        <h3 className="font-display text-lg font-semibold text-text">Add a business</h3>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Business name</span>
          <input
            autoFocus
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">
            Business type <span className="text-text-soft">(optional)</span>
          </span>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          >
            <option value="">Select…</option>
            {BUSINESS_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-paper-fold px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-paper"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create business"}
          </button>
        </div>
      </form>
    </div>
  );
}
