import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppConfig } from "@/lib/getAppConfig";
import { computeDiscount } from "@/lib/discounts";
import { getVisitorCurrency } from "@/lib/visitorLocation";

/** Checkout screen: what would this code take off the chosen plan? (Nothing is reserved yet.) */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ valid: false, message: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const plan = body?.plan;
  const cycle = body?.billingCycle;
  if ((plan !== "professional" && plan !== "business") || (cycle !== "monthly" && cycle !== "yearly")) {
    return NextResponse.json({ valid: false, message: "Invalid plan." }, { status: 400 });
  }
  const cfg = await getAppConfig();
  const currency = getVisitorCurrency();
  const table = currency === "USD" ? cfg.pricingUsd : cfg.pricing;
  const price = table[plan as "professional" | "business"][cycle as "monthly" | "yearly"];
  const r = await computeDiscount(String(body?.code ?? ""), plan, price, user.id, currency);
  return NextResponse.json(r.valid ? { valid: true, code: r.code, discountAmount: r.discountAmount, finalAmount: r.finalAmount } : r);
}
