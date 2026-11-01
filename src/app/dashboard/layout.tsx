import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMyAccess } from "@/lib/getMyAccess";
import { permissionForPath } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/DashboardNav";
import { MobileHeaderLead } from "@/components/MobileHeaderLead";
import { SignOutButton } from "@/components/SignOutButton";
import { PlanBadge } from "@/components/PlanBadge";
import { GlobalSearch } from "@/components/GlobalSearch";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
import { loginOtpRequired } from "@/lib/otp";
import { AppConfigProvider } from "@/lib/AppConfigContext";
import { getAppConfig } from "@/lib/getAppConfig";
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
  if (loginOtpRequired(user)) redirect("/login/verify");

  const profile = await getCurrentProfile();

  if (!profile || !profile.onboarding_complete) redirect("/onboarding");

  const [activeBusiness, businesses, appConfig] = await Promise.all([getActiveBusiness(), getUserBusinesses(), getAppConfig()]);

  // EMERGENCY FALLBACK: normally getActiveBusiness() should always find a
  // business for anyone with onboarding_complete = true (onboarding
  // itself creates one, and getActiveBusiness() self-heals a missing
  // link for an already-owned business). Some accounts have still hit a
  // redirect loop here despite that — the underlying cause hasn't been
  // pinned down yet. Rather than keep blocking dashboard access entirely
  // while that's investigated, fall back to a minimal business built
  // from the person's own profile data (business_name, GST, etc. still
  // live there) so the dashboard renders instead of bouncing them to
  // /onboarding indefinitely. This is a stopgap, not a real fix — a
  // business built this way has no real id and won't support switching,
  // inviting members, or any multi-business feature until the actual
  // business/business_members link is repaired.
  const resolvedBusiness =
    activeBusiness ??
    (profile.business_name
      ? {
          id: "",
          owner_id: user.id,
          business_name: profile.business_name,
          business_type: profile.business_type,
          logo_url: profile.logo_url,
          address: profile.address,
          state: profile.state,
          gst_number: profile.gst_number,
          phone: profile.phone,
          document_design: profile.document_design,
          signature_url: profile.signature_url,
          invoice_terms: profile.invoice_terms,
          quotation_terms: profile.quotation_terms,
          purchase_terms: profile.purchase_terms,
          bank_name: profile.bank_name,
          bank_account_name: profile.bank_account_name,
          bank_account_number: profile.bank_account_number,
          bank_ifsc_or_swift: profile.bank_ifsc_or_swift,
          payment_qr_url: profile.payment_qr_url,
          default_currency: profile.default_currency,
          created_at: profile.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : null);

  if (!resolvedBusiness) redirect("/onboarding");

  // Role-based access: block pages the person's role doesn't tick.
  const access = await getMyAccess();
  const needed = permissionForPath(headers().get("x-pathname") ?? "");
  if (needed && !access.permissions.includes(needed)) redirect("/dashboard");

  return (
    <AppConfigProvider config={appConfig}>
    <I18nProvider initialLanguage={profile.language}>
      <div className="flex min-h-screen flex-col bg-paper md:flex-row">
        <DashboardNav
          businessType={resolvedBusiness.business_type}
          plan={profile.plan}
          allowed={access.permissions}
          mobileExtras={
            <>
              <PlanBadge plan={profile.plan} />
              <BusinessSwitcher inline activeBusiness={resolvedBusiness} businesses={businesses.length > 0 ? businesses : [{ ...resolvedBusiness, role: "owner" as const }]} />
            </>
          }
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-paper-fold bg-paper-card px-4 py-3.5 sm:px-6 md:px-8">
            <MobileHeaderLead />

            <GlobalSearch className="hidden min-w-0 flex-1 md:block md:max-w-md" />

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <PlanBadge plan={profile.plan} className="hidden sm:inline-flex" />
              <div className="hidden md:block">
                <BusinessSwitcher activeBusiness={resolvedBusiness} businesses={businesses.length > 0 ? businesses : [{ ...resolvedBusiness, role: "owner" as const }]} />
              </div>
              <SignOutButton className="hidden md:block" />
            </div>
          </header>

        <div className="border-b border-paper-fold bg-paper-card px-4 py-3 sm:px-6 md:hidden">
          <GlobalSearch />
        </div>

        <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
    </I18nProvider>
    </AppConfigProvider>
  );
}
