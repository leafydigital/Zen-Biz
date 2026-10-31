"use client";

import { useEffect, useState } from "react";
import { getEmailConnection, removeEmailConnection, saveEmailConnection, shareEmailConnection } from "@/lib/actions/emailActions";

export function EmailConnectionForm({ businessId }: { businessId: string }) {
  const [connected, setConnected] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [others, setOthers] = useState<{ id: string; name: string }[]>([]);
  const [sameForAll, setSameForAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setConnected(undefined);
    getEmailConnection(businessId)
      .then((r) => {
        if (!alive) return;
        setConnected(r.email);
        setOthers((r.businesses ?? []).filter((b) => b.id !== businessId));
        setSameForAll(false);
        if (r.error) setMsg({ ok: false, text: `Couldn't check the connection: ${r.error}` });
      })
      .catch(() => {
        if (!alive) return;
        setConnected(null);
        setMsg({ ok: false, text: "Couldn't reach the server. Make sure nodemailer is installed (npm install nodemailer) and restart npm run dev." });
      });
    return () => {
      alive = false;
    };
  }, [businessId]);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const wantsAll = sameForAll && others.length > 0;
    if (!pass.trim() && connected && email.trim() && email.trim().toLowerCase() !== connected) {
      setBusy(false);
      return setMsg({ ok: false, text: "To change the Gmail address, also enter its App Password." });
    }
    if (!pass.trim() && connected) {
      // Only the same/different choice changed.
      const r = wantsAll ? await shareEmailConnection(businessId) : { error: null };
      setBusy(false);
      return setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: wantsAll ? "Saved. All your businesses now use this Gmail." : "Saved." });
    }
    const r = await saveEmailConnection({
      businessId,
      email,
      appPassword: pass,
      alsoBusinessIds: wantsAll ? others.map((o) => o.id) : [],
    });
    setBusy(false);
    if (r.error) return setMsg({ ok: false, text: r.error });
    setConnected(email.trim().toLowerCase());
    setPass("");
    setMsg({ ok: true, text: wantsAll ? "Connected. All your businesses now use this Gmail." : "Connected. Invoices will now be sent from this Gmail." });
  }

  async function disconnect() {
    setBusy(true);
    const r = await removeEmailConnection(businessId);
    setBusy(false);
    if (r.error) return setMsg({ ok: false, text: r.error });
    setConnected(null);
    setMsg(null);
  }

  const field =
    "rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink disabled:opacity-70";

  return (
    <section className="mt-8 flex flex-col gap-4 border-t border-paper-fold pt-6">
      <div>
        <h3 className="text-base font-semibold text-text">Email sending</h3>
        <p className="text-sm text-text-soft">
          Connect your Gmail once, and invoices go to your customers straight from your own email address.
        </p>
      </div>

      {connected === undefined ? (
        <p className="text-sm text-text-soft">Checking…</p>
      ) : connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-fold bg-white px-4 py-3">
          <p className="text-sm text-text">
            <span className="mr-2 rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Connected</span>
            {connected}
          </p>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert-bg disabled:opacity-60"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <p className="text-sm text-text-soft">Not connected yet.</p>
      )}

      {connected !== undefined && (
        <form onSubmit={connect} className="flex flex-col gap-3">
          {others.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-paper-fold bg-white px-4 py-3">
              <label className="flex items-center gap-2 text-sm font-medium text-text">
                <input
                  type="checkbox"
                  checked={sameForAll}
                  onChange={(e) => setSameForAll(e.target.checked)}
                  className="h-4 w-4 accent-ink"
                />
                Use the same Gmail for all my businesses
              </label>
              <p className="text-xs text-text-soft">
                Untick to keep a different Gmail for this business — each business can have its own.
              </p>
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Gmail address</span>
            <input
              type="email"
              required={!connected}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={connected ?? "yourbusiness@gmail.com"}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Google App Password</span>
            <input
              type="password"
              required={!connected}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder={connected ? "Leave empty to keep the current one" : "16-letter app password"}
              autoComplete="new-password"
              className={field}
            />
          </label>
          <details className="text-xs text-text-soft">
            <summary className="cursor-pointer font-medium text-text">How do I get an App Password?</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Open{" "}
                <a href="https://myaccount.google.com/signinoptions/twosv" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">
                  Google 2-Step Verification
                </a>{" "}
                and turn it on (skip if already on).
              </li>
              <li>
                Open{" "}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">
                  Google App Passwords
                </a>
                , type the name &ldquo;Zen Biz&rdquo; and click Create.
              </li>
              <li>Copy the 16 letters Google shows and paste them above.</li>
            </ol>
          </details>
          {msg && (
            <p className={`rounded-lg px-3 py-2 text-xs ${msg.ok ? "bg-green-50 text-green-700" : "bg-alert-bg text-alert"}`}>{msg.text}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
          >
            {busy ? "Saving…" : connected ? "Save" : "Connect Gmail"}
          </button>
        </form>
      )}
    </section>
  );
}
