import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/DashboardNav";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { PlanBadge } from "@/components/PlanBadge";
import { PLAN_LABELS } from "@/lib/planFeatures";
import type { Profile } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("profiles" as never)
    .select("*")
    .eq("id", user.id)
    .maybeSingle()) as { data: Profile | null };

  if (!profile || !profile.onboarding_complete) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-paper md:flex-row">
      <DashboardNav businessType={profile.business_type} plan={profile.plan} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-paper-fold bg-paper-card px-4 py-3.5 sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <Logo className="md:hidden" />
            <div className="hidden md:block">
              <p className="font-display text-lg font-semibold text-text">
                {profile.business_name || "Your business"}
              </p>
              <p className="text-xs capitalize text-text-soft">
                {profile.business_type} · {PLAN_LABELS[profile.plan]} plan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PlanBadge plan={profile.plan} />
            <SignOutButton className="hidden md:block" />
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 md:px-8 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
