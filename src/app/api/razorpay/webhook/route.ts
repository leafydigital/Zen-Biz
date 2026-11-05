import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpayConfig } from "@/lib/razorpayConfig";
import { activateSubscription } from "@/lib/activateSubscription";

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

  const webhookSecret = (await getRazorpayConfig())?.webhookSecret;
  if (!webhookSecret) {
    console.error("Zen Biz: no Razorpay webhook secret is saved — rejecting webhook.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
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

    if (eventType === "payment.captured") {
      const r = await activateSubscription(orderId, paymentId);
      if (!r.found) {
        console.error(`Zen Biz: webhook for unknown order ${orderId}`);
        return NextResponse.json({ error: "Unknown order." }, { status: 404 });
      }
    } else {
      await admin
        .from("subscription_payments" as never)
        .update({ status: "failed", razorpay_payment_id: paymentId } as never)
        .eq("razorpay_order_id", orderId)
        .neq("status", "paid");
    }
  }

  return NextResponse.json({ received: true });
}
