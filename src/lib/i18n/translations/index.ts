import en from "./en";
import hi from "./hi";
import ta from "./ta";
import es from "./es";
import ar from "./ar";
import ml from "./ml";
import kn from "./kn";
import te from "./te";
import bn from "./bn";
import mr from "./mr";
import gu from "./gu";
import pa from "./pa";
import fr from "./fr";
import de from "./de";
import pt from "./pt";
import it from "./it";
import nl from "./nl";
import zh from "./zh";
import ja from "./ja";
import ko from "./ko";
import tr from "./tr";
import ru from "./ru";
import id from "./id";

/**
 * The shape every translation dictionary must match, inferred from the
 * English file. Adding a new key: add it to en.ts, then TypeScript will
 * flag every other *fully-typed* dictionary that's missing it.
 */
export type Translations = typeof en;

export const TRANSLATIONS: Record<string, Translations> = {
  en,
  hi,
  ta,
  es,
  ar,
  ml,
  kn,
  te,
  bn,
  mr,
  gu,
  pa,
  fr,
  de,
  pt,
  it,
  nl,
  zh,
  ja,
  ko,
  tr,
  ru,
  id,
};

export function getTranslations(languageCode: string): Translations {
  return TRANSLATIONS[languageCode] ?? en;
}
