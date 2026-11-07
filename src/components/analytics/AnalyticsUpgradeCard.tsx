export function AnalyticsUpgradeCard() {
  return (
    <div className="rounded-xl2 border border-paper-fold bg-white p-6 text-center shadow-card sm:p-8">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brass/15 text-brass-dark">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.7 8 13 13.7l-3-3L4.3 16.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold text-text">Unlock Business Analytics</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-soft">
        Upgrade to Pro to view Profit & Loss, Expenses, Sales and more.
      </p>
      <a
        href="/dashboard/settings?tab=plan"
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
      >
        View Plans
      </a>
    </div>
  );
}
