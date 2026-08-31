import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { OnboardingForm } from "@/components/OnboardingForm";
import { BackToHomeLink } from "@/components/BackToHomeLink";

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
    const { data: existingProfile } = (await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle()) as { data: { onboarding_complete: boolean } | null };

  if (existingProfile?.onboarding_complete) {
    redirect("/dashboard");
  }

  if (!existingProfile) {
    // Self-heal: create the missing profile row rather than losing track of
    // this account. If it already exists (a race with the trigger), this is
    // a no-op thanks to the ON CONFLICT rule in the database.
           await supabase.from("profiles" as never).insert({ id: user.id, onboarding_complete: false } as never);
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
