import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { getAppConfig } from "@/lib/getAppConfig";
import { getRazorpayConfig } from "@/lib/razorpayConfig";
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

  // Prices the owner set in the console (/app → Plan prices).
  const amountInRupees = (await getAppConfig()).pricing[plan][billingCycle];
  const amountInPaise = amountInRupees * 100;

  const razorpay = new Razorpay({
    key_id: gateway.keyId,
    key_secret: gateway.keySecret,
  });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `zb_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { owner_id: user.id, plan, billing_cycle: billingCycle },
    });
  } catch (err) {
    console.error("Zen Biz: Razorpay order creation failed", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }

  const { error: dbError } = await supabase.from("subscription_payments" as never).insert({
    owner_id: user.id,
    plan,
    billing_cycle: billingCycle,
    amount: amountInRupees,
    currency: "INR",
    razorpay_order_id: order.id,
    status: "created",
  } as never);

  if (dbError) {
    console.error("Zen Biz: failed to record pending payment", dbError);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: amountInPaise,
    currency: "INR",
    keyId: gateway.keyId,
  });
}
