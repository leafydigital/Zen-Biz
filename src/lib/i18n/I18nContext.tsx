"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, isRtlLanguage } from "@/lib/i18n/languages";
import { getTranslations, type Translations } from "@/lib/i18n/translations";

const STORAGE_KEY = "zenbiz-language";

interface I18nContextValue {
  language: string;
  setLanguage: (code: string) => void;
  t: Translations;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Wraps the app once, at the root layout. Reads the saved language from
 * localStorage on mount (so it survives a refresh even before any
 * server data loads) and, when `initialLanguage` is passed (the signed-in
 * user's saved profiles.language), prefers that — so the preference
 * follows the person across devices and after logout/login, not just
 * on the one browser they set it in.
 */
export function I18nProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: string | null;
}) {
  const [language, setLanguageState] = useState(initialLanguage || DEFAULT_LANGUAGE);

  useEffect(() => {
    if (initialLanguage) {
      setLanguageState(initialLanguage);
      return;
    }
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setLanguageState(stored);
  }, [initialLanguage]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const dir: "ltr" | "rtl" = isRtlLanguage(language) ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const t = useMemo(() => getTranslations(language), [language]);

  const value = useMemo(() => ({ language, setLanguage, t, dir }), [language, setLanguage, t, dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * The hook every component uses to read translated strings and the
 * current language. `t` is the nested dictionary object (e.g.
 * `t.nav.overview`) — see translations/en.ts for the full key list.
 */
export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return ctx;
}

/** Simple {placeholder} substitution for strings like "of {limit} used". */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}
