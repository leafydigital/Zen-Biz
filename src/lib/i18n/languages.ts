/**
 * The single source of truth for every language Zen Biz supports. To add
 * a new language: add its entry here, then create a matching dictionary
 * file in ./translations and register it in ./translations/index.ts. No
 * other file needs to change — every page reads strings through
 * useTranslation(), which looks them up by the `code` used here.
 */
export interface LanguageOption {
  code: string;
  /** The language's own name, in its own script — shown in the picker. */
  nativeName: string;
  /** English name, shown as a secondary hint in the picker. */
  englishName: string;
  rtl?: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  // Indian languages
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil" },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam" },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi" },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi" },
  // International languages
  { code: "es", nativeName: "Español", englishName: "Spanish" },
  { code: "fr", nativeName: "Français", englishName: "French" },
  { code: "de", nativeName: "Deutsch", englishName: "German" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese" },
  { code: "it", nativeName: "Italiano", englishName: "Italian" },
  { code: "nl", nativeName: "Nederlands", englishName: "Dutch" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", rtl: true },
  { code: "zh", nativeName: "简体中文", englishName: "Chinese (Simplified)" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese" },
  { code: "ko", nativeName: "한국어", englishName: "Korean" },
  { code: "tr", nativeName: "Türkçe", englishName: "Turkish" },
  { code: "ru", nativeName: "Русский", englishName: "Russian" },
  { code: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian" },
];

export const DEFAULT_LANGUAGE = "en";

export function isRtlLanguage(code: string): boolean {
  return LANGUAGES.find((l) => l.code === code)?.rtl ?? false;
}
