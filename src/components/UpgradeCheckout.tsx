"use client";

import { useAppConfig } from "@/lib/AppConfigContext";
import { formatPrice } from "@/lib/currency";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { PLAN_LABELS } from "@/lib/planFeatures";
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
  const { pricing: allPricing, currency } = useAppConfig();
  const router = useRouter();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const listPrice = allPricing[plan][billingCycle];
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const amount = applied ? applied.finalAmount : listPrice;

  async function applyCode() {
    setCodeMsg(null);
    if (!codeInput.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("/api/razorpay/check-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle, code: codeInput }),
      });
      const data = await res.json();
      if (data.valid) setApplied({ code: data.code, discountAmount: data.discountAmount, finalAmount: data.finalAmount });
      else {
        setApplied(null);
        setCodeMsg(data.message || "This code isn't valid.");
      }
    } catch {
      setCodeMsg("Could not check the code. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handlePay() {
    setError(null);
    setStarting(true);

    const res = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, billingCycle, discountCode: applied?.code }),
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
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        // Never trust the popup alone: the server checks the signature first.
        try {
          const v = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (!v.ok) {
            const d = await v.json().catch(() => ({}));
            setError(d.error || "We could not confirm your payment. If money was deducted, contact support.");
            return;
          }
          setPaid(true);
        } catch {
          setError("Could not reach the server to confirm your payment. If money was deducted, contact support.");
        } finally {
          setStarting(false);
        }
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
          {formatPrice(amount, currency)}
          <span className="text-base font-normal text-text-soft">
            /{billingCycle === "monthly" ? "month" : "year"}
          </span>
        </p>
        {applied && (
          <p className="mt-1 text-sm text-success">
            <span className="text-text-soft line-through">{formatPrice(listPrice, currency)}</span> · Code {applied.code} saves{" "}
            {formatPrice(applied.discountAmount, currency)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl2 border border-paper-fold bg-paper-card p-4">
        <span className="text-sm font-medium text-text">Discount code</span>
        {applied ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
            <span>Applied: {applied.code}</span>
            <button
              type="button"
              onClick={() => {
                setApplied(null);
                setCodeInput("");
              }}
              className="text-xs font-semibold underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && void applyCode()}
              placeholder="Have a code?"
              className="min-w-0 flex-1 rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-sm text-text focus:border-ink"
            />
            <button
              type="button"
              onClick={applyCode}
              disabled={checking || !codeInput.trim()}
              className="rounded-xl border border-paper-fold bg-white px-4 text-sm font-semibold text-text hover:bg-paper disabled:opacity-60"
            >
              {checking ? "Checking…" : "Apply"}
            </button>
          </div>
        )}
        {codeMsg && <p className="text-xs text-alert">{codeMsg}</p>}
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
        {starting ? "Opening payment window…" : `Pay ${formatPrice(amount, currency)}`}
      </button>

      <p className="text-xs text-text-soft">
        Secure checkout via Razorpay. Your plan updates automatically once
        payment is confirmed.
      </p>
    </div>
  );
}
