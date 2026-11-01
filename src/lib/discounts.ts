import { createAdminClient } from "@/lib/supabase/admin";

export interface DiscountRow {
  id: string;
  code: string;
  kind: "percent" | "flat";
  value: number;
  plans: string[] | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
}

export type DiscountResult =
  | { valid: true; code: string; discountAmount: number; finalAmount: number; id: string }
  | { valid: false; message: string };

/**
 * Server-side check of a discount code against a plan price. Use this inside the
 * payment order route so the discounted amount is decided on the server, never
 * trusted from the browser.
 */
export async function computeDiscount(rawCode: string, plan: string, amount: number): Promise<DiscountResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, message: "Enter a code." };
  const { data } = (await createAdminClient()
    .from("discount_codes" as never)
    .select("*")
    .eq("code", code)
    .maybeSingle()) as { data: DiscountRow | null };
  if (!data || !data.active) return { valid: false, message: "This code isn't valid." };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, message: "This code has expired." };
  if (data.max_uses !== null && data.used_count >= data.max_uses) return { valid: false, message: "This code has been fully used." };
  if (data.plans && data.plans.length > 0 && !data.plans.includes(plan)) return { valid: false, message: "This code doesn't apply to that plan." };
  const off = data.kind === "percent" ? Math.round((amount * Number(data.value)) / 100) : Math.round(Number(data.value));
  const discountAmount = Math.min(off, amount);
  return { valid: true, code, id: data.id, discountAmount, finalAmount: amount - discountAmount };
}

/** Call once after a successful payment to count a use of the code. */
export async function redeemDiscount(id: string) {
  const admin = createAdminClient();
  const { data } = (await admin.from("discount_codes" as never).select("used_count").eq("id", id).maybeSingle()) as { data: { used_count: number } | null };
  if (data) await admin.from("discount_codes" as never).update({ used_count: data.used_count + 1 } as never).eq("id", id);
}
