import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SettingsTabs } from "@/components/SettingsTabs";
import { getTranslations } from "@/lib/i18n/translations";
import type { Profile } from "@/types/database";

export default async function SettingsPage() {
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

  if (!profile) redirect("/onboarding");

  const t = getTranslations(profile.language);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          {t.settings.title}
        </h1>
        <p className="text-sm text-text-soft">
          {t.settings.subtitle}
        </p>
      </div>
      <Suspense>
        <SettingsTabs profile={profile} />
      </Suspense>
    </div>
  );
}
