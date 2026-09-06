import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { OnboardingForm } from "@/components/OnboardingForm";
import { BackToHomeLink } from "@/components/BackToHomeLink";
import { getUserBusinesses } from "@/lib/getActiveBusiness";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Look up this account's profile. If the row doesn't exist yet (e.g. the
  // database trigger that creates it on signup hasn't caught up), create it
  // now instead of silently treating the account as brand new — this is
  // what previously made returning users see a blank "set up your business"
  // screen even though their data was safe all along.
  const { data: existingProfile } = await supabase
    .from("profiles" as never)
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle() as { data: { onboarding_complete: boolean } | null; error: unknown };

  if (existingProfile?.onboarding_complete) {
    // onboarding_complete alone isn't enough to trust — an account that
    // finished onboarding before businesses/business_members existed (or
    // hit a partial failure) can have that flag set with no actual
    // business behind it. getUserBusinesses() is the SAME function the
    // dashboard layout uses, and it self-heals this exact case (a real
    // owned business with a missing business_members link) rather than
    // just counting membership rows directly — using a separate,
    // non-healing count query here (as this page previously did) meant
    // a genuinely onboarded user could still see this form again even
    // right after the self-heal fix shipped, since that fix only ever
    // ran from the dashboard side.
    const businesses = await getUserBusinesses();
    if (businesses.length > 0) {
      redirect("/dashboard");
    }
  }

  if (!existingProfile) {
    // Self-heal: create the missing profile row rather than losing track of
    // this account. If it already exists (a race with the trigger), this is
    // a no-op thanks to the ON CONFLICT rule in the database.
    // The phone number collected at signup is passed through as auth
    // metadata (Supabase's own user record has no phone field wired up
    // for email/password auth), so it's picked up here the first time
    // this account's profile row is actually created.
    const signupPhone =
      typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null;
    await supabase
      .from("profiles" as never)
      .insert({ id: user.id, onboarding_complete: false, phone: signupPhone } as never);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10 sm:px-6">
      <div className="w-full max-w-[560px]">
        <BackToHomeLink className="mb-4" />
        <div className="rounded-xl2 bg-paper-card p-6 shadow-card sm:p-10">
          <Logo className="mb-6" />
          <h1 className="mb-1 font-display text-2xl font-semibold text-text">
            Let's set up your business
          </h1>
          <p className="mb-7 text-sm text-text-soft">
            This only appears once. You can change these details later in
            Settings.
          </p>
          <OnboardingForm userId={user.id} />
        </div>
      </div>
    </main>
  );
}