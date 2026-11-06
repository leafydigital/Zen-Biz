"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BillingSettings } from "@/lib/billingLoyalty";
import { getBillingSettings } from "@/lib/billingLoyalty";

const inputCls = "w-full rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink";

/** Gear icon in Billing: loyalty points rules and the shop's UPI ID. */
export function BillingSettingsModal({
  businessId,
  settings,
  currency,
  onClose,
  onSaved,
}: {
  businessId: string;
  settings: BillingSettings;
  currency: string;
  onClose: () => void;
  onSaved: (s: BillingSettings) => void;
}) {
  const supabase = createClient();
  const sym = currency === "INR" ? "₹" : currency + " ";
  const [on, setOn] = useState(settings.loyaltyOn);
  const [per, setPer] = useState(String(settings.earnPerAmount));
  const [pts, setPts] = useState(String(settings.earnPoints));
  const [val, setVal] = useState(String(settings.pointValue));
  const [upi, setUpi] = useState(settings.upiId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const perN = Number(per);
    const ptsN = Number(pts);
    const valN = Number(val);
    if (on && !(perN > 0 && ptsN > 0 && valN > 0)) return setError("Enter numbers above 0 for the point rules.");
    const vpa = upi.trim();
    if (vpa && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(vpa)) return setError("UPI ID looks wrong. It should look like shopname@bank.");
    const next = getBillingSettings({ loyaltyOn: on, earnPerAmount: perN, earnPoints: ptsN, pointValue: valN, upiId: vpa });
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("businesses" as never)
      .update({ billing_settings: next } as never)
      .eq("id", businessId);
    setSaving(false);
    if (err) {
      setError(
        /billing_settings/.test(err.message)
          ? "The billing_settings column is missing. Run supabase/migration_54.sql in the Supabase SQL editor."
          : err.message
      );
      return;
    }
    onSaved(next);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2"
      >
        <h2 className="font-display text-lg font-semibold text-text">Billing settings</h2>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-text">Credit points</span>
              <span className="block text-xs text-text-soft">Give customers points on every bill and let them use points on a later bill.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label="Credit points on or off"
              onClick={() => setOn((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-ink" : "bg-paper-fold"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {on && (
            <div className="flex flex-col gap-3 rounded-xl border border-paper-fold bg-white p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-text">
                <span>For every {sym}</span>
                <input type="number" min="1" step="any" value={per} onChange={(e) => setPer(e.target.value)} className={inputCls + " !w-24"} aria-label="Spend amount" />
                <span>spent, give</span>
                <input type="number" min="0.01" step="any" value={pts} onChange={(e) => setPts(e.target.value)} className={inputCls + " !w-20"} aria-label="Points" />
                <span>point(s)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-text">
                <span>1 point is worth {sym}</span>
                <input type="number" min="0.01" step="any" value={val} onChange={(e) => setVal(e.target.value)} className={inputCls + " !w-24"} aria-label="Point value" />
                <span>when used</span>
              </div>
              <p className="text-xs text-text-soft">
                Example: a {sym}1000 bill gives {Math.floor(1000 / (Number(per) || 1)) * (Number(pts) || 0)} point(s).
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text">UPI ID for the payment QR</span>
          <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="shopname@okhdfcbank" className={inputCls} autoCapitalize="none" />
          <span className="text-xs text-text-soft">When a customer pays by UPI, a QR code with the exact amount is shown. Any UPI app can scan it.</span>
        </section>

        {error && <p className="text-sm text-alert">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
