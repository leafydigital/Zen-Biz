"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/I18nContext";

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={`text-left text-sm font-medium text-text-soft transition hover:text-alert ${className}`}
    >
      {t.header.signOut}
    </button>
  );
}
