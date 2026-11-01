import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SettingsTabs } from "@/components/SettingsTabs";
import { getTranslations } from "@/lib/i18n/translations";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getMyAccess } from "@/lib/getMyAccess";
import { getBusinessRoles } from "@/lib/getBusinessRoles";
import { getActiveBusiness, getUserBusinesses, getBusinessMembers } from "@/lib/getActiveBusiness";

import { getAuthUser } from "@/lib/getAuthUser";
export default async function SettingsPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  if (!user) redirect("/login");

  const [profile, business, businesses] = await Promise.all([
    getCurrentProfile(),
    getActiveBusiness(),
    getUserBusinesses(),
  ]);

  if (!profile || !business) redirect("/onboarding");

  const [members, access, roles] = await Promise.all([
    getBusinessMembers(business.id),
    getMyAccess(),
    getBusinessRoles(business.owner_id),
  ]);

  const t = getTranslations(profile.language);
  const isOwner = business.owner_id === user.id;

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
          roles={roles}
          permissions={access.permissions}
          isFullAccess={access.isFull}
          canViewLog={isOwner || (!access.isFull && access.permissions.includes("activity_log"))}
          canDeleteLog={isOwner || (!access.isFull && access.permissions.includes("activity_log_delete"))}
        />
      </Suspense>
    </div>
  );
}
