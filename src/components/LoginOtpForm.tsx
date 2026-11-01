"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearLoginVerification, sendLoginOtp, verifyLoginOtp } from "@/lib/actions/otpActions";

export function LoginOtpForm({ email, next }: { email: string; next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sent = useRef(false);

  async function send() {
    setBusy(true);
    const r = await sendLoginOtp();
    setBusy(false);
    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: `We sent a 6-digit code to ${email}.` });
  }

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await verifyLoginOtp(code);
    if (r.error) {
      setBusy(false);
      return setMsg({ ok: false, text: r.error });
    }
    router.push(next);
    router.refresh();
  }

  async function cancel() {
    await clearLoginVerification();
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <form onSubmit={verify} className="flex w-full max-w-sm flex-col gap-4 rounded-xl2 border border-paper-fold bg-white p-6 shadow-card">
      <div>
        <h1 className="font-display text-xl font-semibold text-text">Verify it&apos;s you</h1>
        <p className="text-sm text-text-soft">Enter the code we emailed to {email}.</p>
      </div>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="6-digit code"
        className="rounded-xl border border-paper-fold px-3.5 py-3 text-center font-ledger text-xl tracking-[0.4em] text-text focus:border-ink"
      />
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-success-bg text-success" : "bg-alert-bg text-alert"}`}>{msg.text}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60">
        {busy ? "Please wait…" : "Verify and continue"}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={send} disabled={busy} className="font-medium text-ink hover:underline disabled:opacity-60">Resend code</button>
        <button type="button" onClick={cancel} className="text-text-soft hover:text-alert">Use another account</button>
      </div>
    </form>
  );
}
