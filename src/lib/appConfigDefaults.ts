import { PLAN_PRICING } from "@/lib/planFeatures";
import type { Currency } from "@/lib/currency";

export interface AppConfig {
  version: string;
  contact: {
    email: string;
    whatsapp: string;
    address: string;
    message: string;
    /** Working days, e.g. ["Mon","Tue"]. */
    days: string[];
    /** 24-hour "HH:MM" strings from the time pickers. */
    openTime: string;
    closeTime: string;
  };
  /** True once the owner has connected Razorpay and switched plan payments on (console → Payments). */
  paymentsEnabled: boolean;
  /** Plan prices in INR (shown in India). */
  pricing: Record<"professional" | "business", { monthly: number; yearly: number }>;
  /** Plan prices in USD (shown everywhere else). */
  pricingUsd: Record<"professional" | "business", { monthly: number; yearly: number }>;
  /** Currency of `pricing` as handed to the screen (the visitor's). */
  currency: Currency;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  version: "1.00",
  paymentsEnabled: false,
  contact: { email: "", whatsapp: "", address: "", message: "", days: [], openTime: "", closeTime: "" },
  pricing: {
    professional: { ...PLAN_PRICING.professional },
    business: { ...PLAN_PRICING.business },
  },
  pricingUsd: {
    professional: { monthly: 9, yearly: 90 },
    business: { monthly: 24, yearly: 240 },
  },
  currency: "INR",
};

export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** "Mon – Sat · 10:00 AM – 6:00 PM" (days grouped as a range when they run in a row). */
export function formatWorkingHours(c: AppConfig["contact"]): string {
  const days = WEEK_DAYS.filter((d) => c.days?.includes(d));
  let dayText = "";
  if (days.length) {
    const idx = days.map((d) => WEEK_DAYS.indexOf(d));
    const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    dayText = days.length > 2 && consecutive ? `${days[0]} – ${days[days.length - 1]}` : days.join(", ");
  }
  const time = c.openTime && c.closeTime ? `${to12h(c.openTime)} – ${to12h(c.closeTime)}` : "";
  return [dayText, time].filter(Boolean).join(" · ");
}
