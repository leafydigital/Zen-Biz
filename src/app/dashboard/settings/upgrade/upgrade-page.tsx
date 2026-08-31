import Link from "next/link";

export default function UpgradePage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/dashboard/settings"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-ink"
        >
          ← Back to Settings
        </Link>
        <h1 className="font-display text-2xl font-semibold text-text">
          Upgrade your plan
        </h1>
      </div>

      <div className="max-w-md rounded-2xl border border-paper-fold bg-paper-card p-6 shadow-card">
        <p className="text-sm text-text-soft">
          Online upgrades aren't available yet — we're setting up payments
          and will turn this on soon. Everything on the Starter plan works
          fully in the meantime.
        </p>
      </div>
    </div>
  );
}
