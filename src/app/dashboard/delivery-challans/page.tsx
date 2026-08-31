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
    .from("profiles")
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
    .from("delivery_challans")
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
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-text">#{c.challan_number}</p>
                  <p className="text-xs text-text-soft">
                    {c.customers?.name ?? "Not specified"} · {c.challan_date}
                  </p>
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
