"use client";

import { useState } from "react";
import { TEAM_EMAIL_DOMAIN } from "@/lib/teamUsername";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (email.trim().toLowerCase().endsWith("@" + TEAM_EMAIL_DOMAIN)) {
      setLoading(false);
      setError("Team logins can't reset by email. Ask your business owner or admin to set a new password.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    // Deliberately shown the same way whether or not the email actually
    // has an account — confirming or denying that would let anyone probe
    // which emails are registered. If an account exists, a real reset
    // link is on its way; if not, nothing is sent, but the person typing
    // a wrong email can't tell the difference either way.
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success" role="status">
          If an account exists for {email}, a password reset link is on its way. Check your inbox
          (and spam folder).
        </p>
        <a href="/login" className="text-sm font-medium text-ink hover:underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[380px] flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-ink px-4 py-3 text-[0.95rem] font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>

      <a href="/login" className="text-center text-sm font-medium text-text-soft hover:text-ink">
        Back to login
      </a>
    </form>
  );
}
