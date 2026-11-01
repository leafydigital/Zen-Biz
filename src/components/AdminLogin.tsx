"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { adminLogin } from "@/lib/actions/adminActions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function AdminLogin({ configured }: { configured: boolean }) {
  const [state, action] = useFormState(adminLogin, { error: null as string | null });
  const [show, setShow] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <form action={action} className="flex w-full max-w-sm flex-col gap-4 rounded-xl2 border border-paper-fold bg-white p-6 shadow-card">
        <div>
          <h1 className="font-display text-xl font-semibold text-text">Zen Biz owner console</h1>
          <p className="text-sm text-text-soft">Authorised access only.</p>
        </div>
        {!configured && (
          <p className="rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert">
            Not set up: add ADMIN_USERNAME and ADMIN_PASSWORD to the server environment, then restart.
          </p>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Username</span>
          <input name="username" required autoComplete="username" className="rounded-xl border border-paper-fold px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Password</span>
          <div className="relative">
            <input name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="w-full rounded-xl border border-paper-fold px-3.5 py-2.5 pr-11 text-[0.95rem] text-text focus:border-ink" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-text-soft hover:text-text">
              {show ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.4A9.9 9.9 0 0 1 12 5c5.5 0 9.3 4.2 10.5 6.5a1.8 1.8 0 0 1 0 1c-.4.8-1.3 2.2-2.6 3.6M6.3 6.9C4 8.4 2.3 10.5 1.5 11.5a1.8 1.8 0 0 0 0 1c1.2 2.3 5 6.5 10.5 6.5.9 0 1.8-.1 2.6-.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M1.5 12.5a1.8 1.8 0 0 1 0-1C2.7 9.2 6.5 5 12 5s9.3 4.2 10.5 6.5a1.8 1.8 0 0 1 0 1C21.3 14.8 17.5 19 12 19S2.7 14.8 1.5 12.5Z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
        </label>
        {state.error && <p className="rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert">{state.error}</p>}
        <Submit />
      </form>
    </div>
  );
}
