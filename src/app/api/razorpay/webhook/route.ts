import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Handles Razorpay webhook events. This is the ONLY place a plan upgrade
 * actually gets written to the database — the browser-side checkout flow
 * never marks itself as paid, since that would let anyone fake a payment
 * by just calling the API. Instead:
 *
 * 1. Razorpay's server calls this route directly after a payment succeeds
 *    or fails.
 * 2. We verify the request really came from Razorpay by checking its HMAC
 *    signature against RAZORPAY_WEBHOOK_SECRET.
 * 3. Only after that check passes do we update subscription_payments and
 *    the owner's plan.
 *
 * Configure this URL in the Razorpay Dashboard under Settings > Webhooks,
 * subscribed to the "payment.captured" and "payment.failed" events.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("Zen Biz: RAZORPAY_WEBHOOK_SECRET is not set — rejecting webhook.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("Zen Biz: Razorpay webhook signature mismatch — possible spoofed request.");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event as string;

  const admin = createAdminClient();

  if (eventType === "payment.captured" || eventType === "payment.failed") {
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id as string | undefined;
    const paymentId = payment?.id as string | undefined;

    if (!orderId) {
      return NextResponse.json({ error: "No order ID in payload." }, { status: 400 });
    }

    const { data: paymentRow } = await admin
      .from("subscription_payments")
      .select("*")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (!paymentRow) {
      console.error(`Zen Biz: webhook for unknown order ${orderId}`);
      return NextResponse.json({ error: "Unknown order." }, { status: 404 });
    }

    if (eventType === "payment.captured") {
      await admin
        .from("subscription_payments")
        .update({ status: "paid", razorpay_payment_id: paymentId })
        .eq("id", paymentRow.id);

      const renewsAt = new Date();
      if (paymentRow.billing_cycle === "yearly") {
        renewsAt.setFullYear(renewsAt.getFullYear() + 1);
      } else {
        renewsAt.setMonth(renewsAt.getMonth() + 1);
      }

      await admin
        .from("profiles")
        .update({
          plan: paymentRow.plan,
          billing_cycle: paymentRow.billing_cycle,
          plan_renews_at: renewsAt.toISOString(),
        })
        .eq("id", paymentRow.owner_id);
    } else {
      await admin
        .from("subscription_payments")
        .update({ status: "failed", razorpay_payment_id: paymentId })
        .eq("id", paymentRow.id);
    }
  }

  return NextResponse.json({ received: true });
}
