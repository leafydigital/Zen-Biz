"use client";

import { useTranslation } from "@/lib/i18n/I18nContext";

/** Settings page title. Client-side so it follows the language picked on screen at once (before it is saved). */
export function SettingsHeader() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-text">{t.settings.title}</h1>
      <p className="text-sm text-text-soft">{t.settings.subtitle}</p>
    </div>
  );
}
