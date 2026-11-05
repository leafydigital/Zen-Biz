import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { getAppConfig } from "@/lib/getAppConfig";
import { getRazorpayConfig } from "@/lib/razorpayConfig";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESERVE_MINUTES, computeDiscount } from "@/lib/discounts";
import { getVisitorCurrency } from "@/lib/visitorLocation";
import type { BillingCycle, PayablePlan } from "@/types/database";

/**
 * Creates a Razorpay order for upgrading to Professional or Business, and
 * records a matching 'created' row in subscription_payments so the webhook
 * has something to update once payment completes. Requires
 * RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to be set — if they're missing,
 * responds with a clear error instead of a confusing crash, since Razorpay
 * credentials won't exist until the business owner sets up their account.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan = body?.plan as PayablePlan | undefined;
  const billingCycle = body?.billingCycle as BillingCycle | undefined;

  if (plan !== "professional" && plan !== "business") {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  if (billingCycle !== "monthly" && billingCycle !== "yearly") {
    return NextResponse.json({ error: "Invalid billing cycle." }, { status: 400 });
  }

  const gateway = await getRazorpayConfig();
  if (!gateway) {
    return NextResponse.json({ error: "Online payments are not switched on yet. Please try again later." }, { status: 503 });
  }

  // Prices the owner set in the console (/app → Plan prices), in the currency of the
  // visitor's country (found on the server, not sent by the browser).
  const currency = getVisitorCurrency();
  const cfg = await getAppConfig();
  const listPrice = (currency === "USD" ? cfg.pricingUsd : cfg.pricing)[plan][billingCycle];
  let amountInRupees = listPrice;

  // This person's earlier unpaid checkouts stop holding a place on a discount code.
  const admin = createAdminClient();
  await admin
    .from("subscription_payments" as never)
    .update({ status: "cancelled" } as never)
    .eq("owner_id", user.id)
    .eq("status", "created");

  // Discount code: decided here on the server, never trusted from the browser.
  const rawCode = typeof body?.discountCode === "string" ? body.discountCode.trim() : "";
  let discountCode: string | null = null;
  let discountAmount = 0;
  let maxUses: number | null = null;
  if (rawCode) {
    const d = await computeDiscount(rawCode, plan, listPrice, user.id, currency);
    if (!d.valid) return NextResponse.json({ error: d.message }, { status: 400 });
    amountInRupees = d.finalAmount;
    discountCode = d.code;
    discountAmount = d.discountAmount;
    maxUses = d.maxUses;
  }
  const amountInPaise = Math.round(amountInRupees * 100);
  if (!(amountInPaise >= 100)) {
    return NextResponse.json({ error: "The plan price is below the minimum payment of ₹1." }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: gateway.keyId,
    key_secret: gateway.keySecret,
  });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `zb_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { owner_id: user.id, plan, billing_cycle: billingCycle },
    });
  } catch (err) {
    console.error("Zen Biz: Razorpay order creation failed", err);
    if ((err as { statusCode?: number })?.statusCode === 401) {
      return NextResponse.json({ error: "Razorpay rejected the saved keys. Check them in the owner console." }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }

  const { error: dbError } = await supabase.from("subscription_payments" as never).insert({
    owner_id: user.id,
    plan,
    billing_cycle: billingCycle,
    amount: amountInRupees,
    currency,
    razorpay_order_id: order.id,
    status: "created",
    discount_code: discountCode,
    discount_amount: discountAmount,
    list_price: listPrice,
  } as never);

  if (dbError) {
    console.error("Zen Biz: failed to record pending payment", dbError);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }

  // "First N customers": if several people opened checkout at the same moment, only the
  // first N (by time) keep their place. Anyone later is told the code is used up.
  if (discountCode && maxUses !== null) {
    const cutoff = new Date(Date.now() - RESERVE_MINUTES * 60_000).toISOString();
    const { data: winners } = (await admin
      .from("subscription_payments" as never)
      .select("razorpay_order_id")
      .eq("discount_code", discountCode)
      .or(`status.eq.paid,and(status.eq.created,created_at.gte.${cutoff})`)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(maxUses)) as { data: { razorpay_order_id: string }[] | null };
    if (!(winners ?? []).some((w) => w.razorpay_order_id === order.id)) {
      await admin.from("subscription_payments" as never).update({ status: "cancelled" } as never).eq("razorpay_order_id", order.id);
      return NextResponse.json({ error: "This code has just been fully used." }, { status: 409 });
    }
  }

  return NextResponse.json({
    orderId: order.id,
    amount: amountInPaise,
    currency,
    keyId: gateway.keyId,
  });
}
