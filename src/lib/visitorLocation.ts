import { headers } from "next/headers";
import { currencyForCountry, type Currency } from "@/lib/currency";
import type { AppConfig } from "@/lib/appConfigDefaults";

/**
 * Country of the visitor, from the IP lookup the hosting platform already does
 * on every request (nothing is asked from the visitor, no permission prompt).
 * Vercel, Cloudflare and Netlify each use their own header.
 */
export function getVisitorCountry(): string | null {
  const h = headers();
  const direct = h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || h.get("x-country-code") || h.get("x-country");
  if (direct) return direct;
  const nf = h.get("x-nf-geo"); // Netlify: base64 JSON like {"country":{"code":"IN"}}
  if (nf) {
    try {
      return JSON.parse(Buffer.from(nf, "base64").toString("utf8"))?.country?.code ?? null;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function getVisitorCurrency(): Currency {
  return currencyForCountry(getVisitorCountry());
}

/** The app config with the plan prices (and currency) that this visitor should see. */
export function localizeConfig(cfg: AppConfig, currency: Currency = getVisitorCurrency()): AppConfig {
  return currency === "USD" ? { ...cfg, pricing: cfg.pricingUsd, currency } : { ...cfg, currency };
}
