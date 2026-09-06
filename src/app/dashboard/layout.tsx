import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/DashboardNav";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { PlanBadge } from "@/components/PlanBadge";
import { GlobalSearch } from "@/components/GlobalSearch";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness, getUserBusinesses } from "@/lib/getActiveBusiness";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // auth.getUser() reads the session from cookies (no database round-trip
  // for the profiles table), so checking it here alongside the cached
  // profile fetch below costs nothing extra — it's the only way to tell
  // "not signed in" apart from "signed in but onboarding not finished
  // yet", since both cases return a null profile.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

  if (!profile || !profile.onboarding_complete) redirect("/onboarding");

  const [activeBusiness, businesses] = await Promise.all([getActiveBusiness(), getUserBusinesses()]);

  // A signed-in, onboarded user with zero businesses shouldn't be
  // possible under normal signup — onboarding itself creates the first
  // one — but if it ever happens (a very old account from before this
  // feature, a partially-failed backfill), send them back through
  // onboarding rather than rendering a dashboard with no business to
  // scope any of its data to.
  if (!activeBusiness) redirect("/onboarding");

  return (
    <I18nProvider initialLanguage={profile.language}>
      <div className="flex min-h-screen flex-col bg-paper md:flex-row">
        <DashboardNav businessType={activeBusiness.business_type} plan={profile.plan} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-paper-fold bg-paper-card px-4 py-3.5 sm:px-6 md:px-8">
            <Logo className="shrink-0 md:hidden" />

            <GlobalSearch className="hidden min-w-0 flex-1 md:block md:max-w-md" />

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <PlanBadge plan={profile.plan} className="hidden sm:inline-flex" />
              <div className="hidden md:block">
                <BusinessSwitcher activeBusiness={activeBusiness} businesses={businesses} />
              </div>
              <SignOutButton className="hidden md:block" />
            </div>
          </header>

        <div className="border-b border-paper-fold bg-paper-card px-4 py-3 sm:px-6 md:hidden">
          <GlobalSearch />
        </div>

        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 md:px-8 md:pb-8">
          {children}
        </main>
      </div>
    </div>
    </I18nProvider>
  );
}
