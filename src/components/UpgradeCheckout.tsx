"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { PLAN_LABELS, PLAN_PRICING } from "@/lib/planFeatures";
import type { BillingCycle, PayablePlan, Profile } from "@/types/database";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function UpgradeCheckout({
  profile,
  plan,
  billingCycle,
}: {
  profile: Profile;
  plan: PayablePlan;
  billingCycle: BillingCycle;
}) {
  const router = useRouter();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const amount = PLAN_PRICING[plan][billingCycle];

  async function handlePay() {
    setError(null);
    setStarting(true);

    const res = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, billingCycle }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStarting(false);
      setError(data.error || "Could not start checkout. Please try again.");
      return;
    }

    if (!window.Razorpay) {
      setStarting(false);
      setError("Payment window failed to load. Please refresh and try again.");
      return;
    }

    const razorpay = new window.Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      order_id: data.orderId,
      name: "Zen Biz",
      description: `${PLAN_LABELS[plan]} — ${billingCycle}`,
      prefill: {
        name: profile.business_name || undefined,
        contact: profile.phone || undefined,
      },
      theme: { color: "#2563EB" },
      handler: function () {
        setPaid(true);
        setStarting(false);
      },
      modal: {
        ondismiss: function () {
          setStarting(false);
        },
      },
    });

    razorpay.on("payment.failed", function () {
      setStarting(false);
      setError("Payment failed or was cancelled. You can try again.");
    });

    razorpay.open();
  }

  useEffect(() => {
    if (paid) {
      const timer = setTimeout(() => {
        router.push("/dashboard/settings");
        router.refresh();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [paid, router]);

  if (paid) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl2 border border-success/30 bg-success-bg p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
          ✓
        </span>
        <h2 className="font-display text-xl font-semibold text-text">Payment received</h2>
        <p className="max-w-sm text-sm text-text-soft">
          Your {PLAN_LABELS[plan]} plan will be active within a minute or two,
          once we confirm the payment. Redirecting you to Settings…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />

      <div className="rounded-xl2 border border-paper-fold bg-paper-card p-6 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-wide text-text-soft">
          {PLAN_LABELS[plan]} plan
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-text">
          ₹{amount.toLocaleString("en-IN")}
          <span className="text-base font-normal text-text-soft">
            /{billingCycle === "monthly" ? "month" : "year"}
          </span>
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={starting || !scriptLoaded}
        className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {starting ? "Opening payment window…" : `Pay ₹${amount.toLocaleString("en-IN")}`}
      </button>

      <p className="text-xs text-text-soft">
        Secure checkout via Razorpay. Your plan updates automatically once
        payment is confirmed.
      </p>
    </div>
  );
}
