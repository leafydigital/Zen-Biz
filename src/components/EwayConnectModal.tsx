"use client";

import { useEffect, useState } from "react";
import { deleteEwayCredentials, getEwayCredentialStatus, saveEwayCredentials } from "@/lib/actions/ewayActions";

const input = "w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-sm text-text focus:border-ink";

/** Gear → connect the business's e-way bill API login (the one made under "Registration → For GSP" on the GST portal). */
export function EwayConnectModal({ businessId, gstin, onClose }: { businessId: string; gstin: string | null; onClose: () => void }) {
  const [saved, setSaved] = useState<string | null | undefined>(undefined); // undefined = loading
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getEwayCredentialStatus(businessId).then((r) => {
      if (r.error) setMsg({ ok: false, text: r.error });
      setSaved(r.username);
      if (r.username) setUsername(r.username);
    });
  }, [businessId]);

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await saveEwayCredentials(businessId, username, password);
    setBusy(false);
    if (r.error) return setMsg({ ok: false, text: r.error });
    setSaved(username.trim());
    setPassword("");
    setMsg({ ok: true, text: "Saved. The password is stored encrypted and is never shown again." });
  }

  async function remove() {
    setBusy(true);
    const r = await deleteEwayCredentials(businessId);
    setBusy(false);
    if (r.error) return setMsg({ ok: false, text: r.error });
    setSaved(null);
    setUsername("");
    setPassword("");
    setMsg({ ok: true, text: "Login removed." });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text">Connect e-way bill account</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-text-soft hover:bg-paper">Close</button>
        </div>

        <p className="text-sm text-text-soft">
          Enter the <strong>API username and password</strong> you created on the e-way bill portal for GSTIN{" "}
          <span className="font-ledger">{gstin || "(add your GST number in Settings)"}</span>. This is not your normal portal login.
        </p>
        <ol className="list-decimal space-y-0.5 pl-5 text-xs text-text-soft">
          <li>Sign in at ewaybillgst.gov.in with your GST account.</li>
          <li>Open <strong>Registration → For GSP</strong>.</li>
          <li>Choose our provider, create an API username and password, and save.</li>
          <li>Type the same username and password below.</li>
        </ol>

        {saved === undefined ? (
          <p className="text-sm text-text-soft">Loading…</p>
        ) : (
          <>
            {saved && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Connected as <strong>{saved}</strong> (password saved).</p>}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">API username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">API password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={saved ? "Type a new password to change it" : ""} className={input} />
            </label>
          </>
        )}

        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-alert-bg text-alert"}`}>{msg.text}</p>}

        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={busy || !username.trim() || !password} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">
            {saved ? "Update login" : "Save login"}
          </button>
          {saved && (
            <button onClick={remove} disabled={busy} className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-alert disabled:opacity-50">
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-text-soft">
          Saving the login prepares your account. Generating the e-way bill inside Zen Biz switches on once the provider connection is added by the app owner; until then use “Make e-way bill (free)”.
        </p>
      </div>
    </div>
  );
}
