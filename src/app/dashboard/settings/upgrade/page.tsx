import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppConfig } from "@/lib/getAppConfig";
import { UpgradeCheckout } from "@/components/UpgradeCheckout";
import ComingSoon from "./upgrade-page";
import type { PayablePlan, Profile } from "@/types/database";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: { plan?: string; cycle?: string };
}) {
  // Until the owner connects Razorpay (console → Payments) there is nothing to pay into.
  if (!(await getAppConfig()).paymentsEnabled) return <ComingSoon />;

  const plan = searchParams.plan;
  const cycle = searchParams.cycle === "yearly" ? "yearly" : "monthly";

  if (plan !== "professional" && plan !== "business") {
    redirect("/dashboard/settings");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()) as { data: Profile | null };

  if (!profile) redirect("/onboarding");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/dashboard/settings"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-ink"
        >
          ← Back to Settings
        </Link>
        <h1 className="font-display text-2xl font-semibold text-text">Upgrade your plan</h1>
      </div>
      <div className="max-w-md">
        <UpgradeCheckout profile={profile} plan={plan as PayablePlan} billingCycle={cycle} />
      </div>
    </div>
  );
}
