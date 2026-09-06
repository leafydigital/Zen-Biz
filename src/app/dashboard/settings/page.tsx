import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SettingsTabs } from "@/components/SettingsTabs";
import { getTranslations } from "@/lib/i18n/translations";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness, getUserBusinesses, getBusinessMembers } from "@/lib/getActiveBusiness";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, business, businesses] = await Promise.all([
    getCurrentProfile(),
    getActiveBusiness(),
    getUserBusinesses(),
  ]);

  if (!profile || !business) redirect("/onboarding");

  const members = await getBusinessMembers(business.id);

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
        <SettingsTabs
          profile={profile}
          business={business}
          businesses={businesses}
          members={members}
          currentUserId={user.id}
        />
      </Suspense>
    </div>
  );
}
