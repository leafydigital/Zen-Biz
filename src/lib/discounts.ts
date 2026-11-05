import { createAdminClient } from "@/lib/supabase/admin";

export interface DiscountRow {
  id: string;
  code: string;
  kind: "percent" | "flat";
  value: number;
  plans: string[] | null;
  max_uses: number | null;
  used_count: number;
  starts_at?: string | null;
  expires_at: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
}

export type DiscountResult =
  | { valid: true; code: string; discountAmount: number; finalAmount: number; id: string; maxUses: number | null }
  | { valid: false; message: string };

/** An unpaid checkout holds its place for this long, then the place is free again. */
export const RESERVE_MINUTES = 30;

const reserveCutoff = () => new Date(Date.now() - RESERVE_MINUTES * 60_000).toISOString();

/**
 * Places in use for a code: payments that are paid, plus checkouts opened in the
 * last 30 minutes that are still waiting for payment. Counted from the payments
 * table itself, so the number is always exact.
 */
export async function usedPlaces(code: string): Promise<number> {
  const admin = createAdminClient();
  const [paid, pending] = await Promise.all([
    admin.from("subscription_payments" as never).select("id", { count: "exact", head: true }).eq("discount_code", code).eq("status", "paid"),
    admin.from("subscription_payments" as never).select("id", { count: "exact", head: true }).eq("discount_code", code).eq("status", "created").gte("created_at", reserveCutoff()),
  ]);
  return (paid.count ?? 0) + (pending.count ?? 0);
}

/**
 * Server-side check of a discount code against a plan price. The payment order
 * route uses it so the discounted amount is decided on the server, never
 * trusted from the browser. `ownerId` makes it one use per customer.
 */
export async function computeDiscount(rawCode: string, plan: string, amount: number, ownerId?: string, currency: string = "INR"): Promise<DiscountResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, message: "Enter a code." };
  const admin = createAdminClient();
  const { data } = (await admin.from("discount_codes" as never).select("*").eq("code", code).maybeSingle()) as { data: DiscountRow | null };
  if (!data || !data.active) return { valid: false, message: "This code isn't valid." };
  // A flat amount is set in rupees, so it can't be taken off a dollar price.
  if (data.kind === "flat" && currency !== "INR") return { valid: false, message: "This code is only for payments in rupees." };
  const now = new Date();
  if (data.starts_at && new Date(data.starts_at) > now) {
    return { valid: false, message: `This code starts on ${new Date(data.starts_at).toLocaleDateString("en-IN")}.` };
  }
  if (data.expires_at && new Date(data.expires_at) < now) return { valid: false, message: "This code has expired." };
  if (data.plans && data.plans.length > 0 && !data.plans.includes(plan)) return { valid: false, message: "This code doesn't apply to that plan." };

  if (ownerId) {
    const { count } = await admin
      .from("subscription_payments" as never)
      .select("id", { count: "exact", head: true })
      .eq("discount_code", code)
      .eq("owner_id", ownerId)
      .eq("status", "paid");
    if ((count ?? 0) > 0) return { valid: false, message: "You have already used this code." };
  }
  if (data.max_uses !== null && (await usedPlaces(code)) >= data.max_uses) {
    return { valid: false, message: "This code has been fully used." };
  }

  const off = data.kind === "percent" ? Math.round((amount * Number(data.value)) / 100 * 100) / 100 : Math.round(Number(data.value));
  // Razorpay cannot charge less than ₹1, so a discount never takes the price below that.
  const discountAmount = Math.round(Math.max(0, Math.min(off, amount - 1)) * 100) / 100;
  return { valid: true, code, id: data.id, maxUses: data.max_uses, discountAmount, finalAmount: Math.round((amount - discountAmount) * 100) / 100 };
}

/** Keeps the "used" number shown in the console equal to the real count of paid uses. */
export async function syncUsedCount(code: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("subscription_payments" as never)
    .select("id", { count: "exact", head: true })
    .eq("discount_code", code)
    .eq("status", "paid");
  await admin.from("discount_codes" as never).update({ used_count: count ?? 0 } as never).eq("code", code);
}
