/** Billing (POS) loyalty points, billing customers and UPI helpers. */

export type BillingSettings = {
  loyaltyOn: boolean;
  /** Spend this much ... */
  earnPerAmount: number;
  /** ... to earn this many points. */
  earnPoints: number;
  /** One point is worth this much when redeemed. */
  pointValue: number;
  /** Shop UPI ID (VPA) used to make the payment QR code. */
  upiId: string;
};

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  loyaltyOn: false,
  earnPerAmount: 100,
  earnPoints: 1,
  pointValue: 1,
  upiId: "",
};

export function getBillingSettings(raw: Partial<BillingSettings> | null | undefined): BillingSettings {
  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return {
    loyaltyOn: Boolean(raw?.loyaltyOn),
    earnPerAmount: num(raw?.earnPerAmount, DEFAULT_BILLING_SETTINGS.earnPerAmount),
    earnPoints: num(raw?.earnPoints, DEFAULT_BILLING_SETTINGS.earnPoints),
    pointValue: num(raw?.pointValue, DEFAULT_BILLING_SETTINGS.pointValue),
    upiId: (raw?.upiId ?? "").trim(),
  };
}

export interface BillingCustomerLite {
  id: string;
  name: string;
  phone: string;
  points: number;
}

export const phoneDigits = (s: string) => s.replace(/\D/g, "");

/** Points earned on a bill of this amount (whole points). */
export function pointsEarned(s: BillingSettings, amount: number): number {
  if (!s.loyaltyOn || amount <= 0) return 0;
  return Math.floor(amount / s.earnPerAmount) * s.earnPoints;
}

/** Most points that can be used on a bill: what the customer has, and no more than the bill is worth. */
export function maxRedeemable(s: BillingSettings, balance: number, billTotal: number): number {
  if (!s.loyaltyOn || balance <= 0 || billTotal <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(balance), Math.floor(billTotal / s.pointValue)));
}

/** UPI deep link; a QR code of it opens GPay / PhonePe / Paytm with the amount filled in. */
export function upiLink(opts: { vpa: string; name: string; amount: number; note?: string }): string {
  // The UPI ID is written as is (with its @); only the free-text parts are encoded.
  const parts = [
    "pa=" + opts.vpa.trim(),
    "pn=" + encodeURIComponent(opts.name || "Shop"),
    "am=" + opts.amount.toFixed(2),
    "cu=INR",
  ];
  if (opts.note) parts.push("tn=" + encodeURIComponent(opts.note));
  return "upi://pay?" + parts.join("&");
}

/** Bill number shown on receipts and records, e.g. B0007. Falls back to a short id if the number is not known yet. */
export function formatBillNo(n: number | string | null | undefined, fallbackId?: string): string {
  const num = Number(n);
  if (Number.isFinite(num) && num > 0) return "B" + String(Math.floor(num)).padStart(4, "0");
  return fallbackId ? fallbackId.slice(0, 6).toUpperCase() : "";
}
