import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_APP_CONFIG, type AppConfig } from "@/lib/appConfigDefaults";

/** App-wide settings edited from the owner console (/app). Falls back to defaults. */
export const getAppConfig = cache(async (): Promise<AppConfig> => {
  try {
    const supabase = createClient();
    const { data } = (await supabase.from("app_settings" as never).select("key, value")) as {
      data: { key: string; value: any }[] | null;
    };
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    const pricing = map.get("pricing") ?? {};
    const num = (v: any, d: number) => (typeof v === "number" && v >= 0 ? v : d);
    return {
      version: typeof map.get("version") === "string" ? map.get("version") : DEFAULT_APP_CONFIG.version,
      contact: { ...DEFAULT_APP_CONFIG.contact, ...(map.get("contact") ?? {}) },
      pricing: {
        professional: {
          monthly: num(pricing.professional?.monthly, DEFAULT_APP_CONFIG.pricing.professional.monthly),
          yearly: num(pricing.professional?.yearly, DEFAULT_APP_CONFIG.pricing.professional.yearly),
        },
        business: {
          monthly: num(pricing.business?.monthly, DEFAULT_APP_CONFIG.pricing.business.monthly),
          yearly: num(pricing.business?.yearly, DEFAULT_APP_CONFIG.pricing.business.yearly),
        },
      },
    };
  } catch {
    return DEFAULT_APP_CONFIG;
  }
});
