export type Currency = "INR" | "USD";

/** India pays in rupees; everywhere else pays in US dollars. No country known (e.g. local testing) = India. */
export function currencyForCountry(country?: string | null): Currency {
  const cc = (country ?? "").trim().toUpperCase();
  return !cc || cc === "IN" || cc === "XX" ? "INR" : "USD";
}

/** ₹7,999 or $90 — whole amounts without decimals, cents only when there are any. */
export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
