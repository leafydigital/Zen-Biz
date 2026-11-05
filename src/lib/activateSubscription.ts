import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marks a subscription payment as paid and switches the owner's plan on.
 * Called only after Razorpay has been proven to be the source (webhook
 * signature, or the checkout signature on /api/razorpay/verify-payment).
 * Safe to call twice for the same payment: the second call does nothing.
 */
export async function activateSubscription(orderId: string, paymentId: string | undefined) {
  const admin = createAdminClient();
  const { data: row } = (await admin
    .from("subscription_payments" as never)
    .select("*")
    .eq("razorpay_order_id", orderId)
    .maybeSingle()) as {
    data: { id: string; owner_id: string; plan: string; billing_cycle: string; status: string } | null;
  };
  if (!row) return { found: false as const };
  if (row.status === "paid") return { found: true as const, ownerId: row.owner_id, alreadyPaid: true };

  await admin
    .from("subscription_payments" as never)
    .update({ status: "paid", razorpay_payment_id: paymentId } as never)
    .eq("id", row.id);

  const renewsAt = new Date();
  if (row.billing_cycle === "yearly") renewsAt.setFullYear(renewsAt.getFullYear() + 1);
  else renewsAt.setMonth(renewsAt.getMonth() + 1);

  await admin
    .from("profiles" as never)
    .update({ plan: row.plan, billing_cycle: row.billing_cycle, plan_renews_at: renewsAt.toISOString() } as never)
    .eq("id", row.owner_id);

  return { found: true as const, ownerId: row.owner_id, alreadyPaid: false };
}
