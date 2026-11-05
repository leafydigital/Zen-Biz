import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The browser reports a failed attempt from the Razorpay popup, so Payment
 * history shows it even if the webhook is not set up. It only ever records a
 * failure on the signed-in user's own unpaid order; it cannot change a paid one.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 300) : null;
  if (!orderId) return NextResponse.json({ error: "Missing order." }, { status: 400 });

  await createAdminClient()
    .from("subscription_payments" as never)
    .update({ status: "failed", failure_reason: reason } as never)
    .eq("razorpay_order_id", orderId)
    .eq("owner_id", user.id)
    .neq("status", "paid");
  return NextResponse.json({ ok: true });
}
