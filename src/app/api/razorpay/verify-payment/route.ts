import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getRazorpayConfig } from "@/lib/razorpayConfig";
import { activateSubscription } from "@/lib/activateSubscription";

/**
 * Called by the browser right after the Razorpay popup reports success.
 * Checks the checkout signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET).
 * Only a matching signature marks the payment as paid and switches the plan on.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const orderId = body?.razorpay_order_id;
  const paymentId = body?.razorpay_payment_id;
  const signature = body?.razorpay_signature;
  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string" || !orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  const gateway = await getRazorpayConfig();
  if (!gateway) return NextResponse.json({ error: "Online payments are not set up." }, { status: 503 });

  const expected = crypto.createHmac("sha256", gateway.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // The order must be one this signed-in user started.
  const { data: own } = (await supabase
    .from("subscription_payments" as never)
    .select("id")
    .eq("razorpay_order_id", orderId)
    .eq("owner_id", user.id)
    .maybeSingle()) as { data: { id: string } | null };
  if (!own) return NextResponse.json({ error: "Unknown order." }, { status: 404 });

  await activateSubscription(orderId, paymentId);
  return NextResponse.json({ success: true });
}
