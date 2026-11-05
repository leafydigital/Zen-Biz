"use client";

import { useEffect, useState, useTransition } from "react";
import { getPaymentSettings, savePaymentSettings } from "@/lib/actions/adminActions";

const input = "rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none";
const primary = "rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60";
const card = "rounded-xl2 border border-paper-fold bg-white p-5 shadow-card";

type Settings = { keyId: string; hasSecret: boolean; hasWebhookSecret: boolean; enabled: boolean; fromEnv: boolean };

/** Owner console → Payments: the Razorpay account that plan payments are collected into. */
export function PaymentsPanel({
  canEdit,
  setMsg,
}: {
  canEdit: boolean;
  setMsg: (m: { ok: boolean; text: string } | null) => void;
}) {
  const [s, setS] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  function apply(x: Settings) {
    setS(x);
    setKeyId(x.keyId);
    setEnabled(x.enabled);
    setKeySecret("");
    setWebhookSecret("");
  }

  useEffect(() => {
    getPaymentSettings().then((r) => (r.settings ? apply(r.settings) : setLoadError(r.error)));
  }, []);

  const webhookUrl = typeof window === "undefined" ? "" : `${window.location.origin}/api/razorpay/webhook`;

  function save() {
    setMsg(null);
    start(async () => {
      const r = await savePaymentSettings({ keyId, keySecret, webhookSecret, enabled });
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: enabled ? "Razorpay connected. Plan payments are ON." : "Saved. Plan payments are OFF." });
      if (!r.error) {
        const fresh = await getPaymentSettings();
        if (fresh.settings) apply(fresh.settings);
      }
    });
  }

  if (loadError) return <p className={`${card} text-sm text-alert`}>{loadError}</p>;
  if (!s) return <p className={`${card} text-sm text-text-soft`}>Loading…</p>;

  return (
    <fieldset disabled={!canEdit} className="flex flex-col gap-4">
      <div className={`${card} flex flex-col gap-4`}>
        <div>
          <h2 className="font-semibold text-text">Razorpay account</h2>
          <p className="text-sm text-text-soft">
            Customers pay for Professional / Business plans into this Razorpay account. Get the keys from Razorpay Dashboard → Settings → API Keys.
          </p>
          {s.fromEnv && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Currently using the keys from the server settings (environment variables). Saving here replaces them.
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-soft">Key ID</span>
          <input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_xxxxxxxxxxxx" autoComplete="off" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-soft">
            Key Secret {s.hasSecret && <span className="text-green-700">· saved (leave blank to keep)</span>}
          </span>
          <input type="password" value={keySecret} onChange={(e) => setKeySecret(e.target.value)} placeholder={s.hasSecret ? "••••••••••••" : "Key secret"} autoComplete="new-password" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-soft">
            Webhook secret {s.hasWebhookSecret && <span className="text-green-700">· saved (leave blank to keep)</span>}
          </span>
          <input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder={s.hasWebhookSecret ? "••••••••••••" : "Any strong text, same as in Razorpay webhook"} autoComplete="new-password" className={input} />
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-paper-fold p-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm text-text">
            Accept plan payments
            <span className="block text-xs text-text-soft">Off = the Upgrade buttons in the app show “Coming soon”.</span>
          </span>
        </label>

        <button type="button" disabled={pending} onClick={save} className={`${primary} self-start`}>
          {pending ? "Checking with Razorpay…" : "Save & test connection"}
        </button>
        <p className="text-xs text-text-soft">The secrets are stored encrypted on the server and are never shown again after saving.</p>
      </div>

      <div className={`${card} flex flex-col gap-2`}>
        <h2 className="font-semibold text-text">Set up the webhook in Razorpay (one time)</h2>
        <p className="text-sm text-text-soft">
          Razorpay Dashboard → Settings → Webhooks → Add. Without this, a payment is taken but the plan is not switched on.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-text">
          <li>
            Webhook URL:{" "}
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(webhookUrl);
                setCopied(true);
              }}
              className="break-all rounded bg-paper px-2 py-0.5 font-ledger text-xs underline"
            >
              {webhookUrl}
            </button>
            {copied && <span className="ml-2 text-xs text-green-700">copied</span>}
          </li>
          <li>Secret: the same “Webhook secret” you typed above.</li>
          <li>
            Events: tick <strong>payment.captured</strong> and <strong>payment.failed</strong>.
          </li>
        </ol>
      </div>
    </fieldset>
  );
}
