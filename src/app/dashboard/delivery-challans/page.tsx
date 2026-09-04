import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChallanStatusSelect } from "@/components/ChallanStatusSelect";
import { DownloadChallanButton } from "@/components/DownloadChallanButton";
import { LockedFeature } from "@/components/LockedFeature";
import { getPlanFeatures } from "@/lib/planFeatures";
import type { Profile } from "@/types/database";

export default async function DeliveryChallansPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles" as never)
    .select("plan")
    .eq("id", user!.id)
    .maybeSingle()) as { data: Pick<Profile, "plan"> | null };

  if (!getPlanFeatures(profile?.plan ?? "starter").deliveryChallans) {
    return (
      <LockedFeature
        title="Delivery Challan is a Professional plan feature"
        description="Create a dispatch note for goods sent out, ahead of or without an invoice — available on the Professional plan and above."
        requiredPlan="professional"
      />
    );
  }

  const { data: challans } = (await supabase
    .from("delivery_challans" as never)
    .select("*, customers(name)")
    .order("created_at", { ascending: false })) as { data: any[] | null };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">
            Delivery Challans
          </h1>
          <p className="text-sm text-text-soft">
            Dispatch notes for goods sent out to customers.
          </p>
        </div>
        <Link
          href="/dashboard/delivery-challans/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + New challan
        </Link>
      </div>

      {!challans || challans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">No delivery challans yet.</p>
          <Link
            href="/dashboard/delivery-challans/new"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-light"
          >
            Create your first challan
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {challans.map((c: any) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 p-4 transition hover:bg-paper/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z M5.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-text">#{c.challan_number}</p>
                    <p className="text-xs text-text-soft">
                      {c.customers?.name ?? "Not specified"} · {c.challan_date}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ChallanStatusSelect challanId={c.id} status={c.status} />
                  <DownloadChallanButton challanId={c.id} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
