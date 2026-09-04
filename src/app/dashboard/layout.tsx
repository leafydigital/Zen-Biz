import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/DashboardNav";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { PlanBadge } from "@/components/PlanBadge";
import { GlobalSearch } from "@/components/GlobalSearch";
import { I18nProvider } from "@/lib/i18n/I18nContext";
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
    <I18nProvider initialLanguage={profile.language}>
      <div className="flex min-h-screen flex-col bg-paper md:flex-row">
        <DashboardNav businessType={profile.business_type} plan={profile.plan} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-paper-fold bg-paper-card px-4 py-3.5 sm:px-6 md:px-8">
            <Logo className="shrink-0 md:hidden" />

            <GlobalSearch className="hidden min-w-0 flex-1 md:block md:max-w-md" />

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <PlanBadge plan={profile.plan} className="hidden sm:inline-flex" />
              <div className="hidden items-center gap-2 border-l border-paper-fold pl-3 md:flex">
                {profile.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                  src={profile.logo_url}
                  alt={profile.business_name || "Business logo"}
                  className="h-8 w-8 shrink-0 rounded-full border border-paper-fold object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold uppercase text-white">
                  {(profile.business_name || "Z").charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold leading-tight text-text">
                  {profile.business_name || "Your business"}
                </p>
                <p className="text-xs capitalize leading-tight text-text-soft">
                  {profile.business_type}
                </p>
              </div>
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
