"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { passwordIssue } from "@/lib/passwordValidation";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const issue = passwordIssue(password);
    if (issue) {
      setError(issue);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    // At this point Supabase has already validated the reset link and
    // established a temporary session for this browser (it does this
    // automatically when the person arrives here via the emailed link),
    // so updateUser() is what actually sets the new password.
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  if (done) {
    return (
      <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success" role="status">
        Password updated. Taking you to login…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[380px] flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">New password</span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters, 1 capital, 1 symbol"
            className="w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 pr-11 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-text-soft transition hover:text-text"
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.4A9.9 9.9 0 0 1 12 5c5.5 0 9.3 4.2 10.5 6.5a1.8 1.8 0 0 1 0 1c-.4.8-1.3 2.2-2.6 3.6M6.3 6.9C4 8.4 2.3 10.5 1.5 11.5a1.8 1.8 0 0 0 0 1c1.2 2.3 5 6.5 10.5 6.5.9 0 1.8-.1 2.6-.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M1.5 12.5a1.8 1.8 0 0 1 0-1C2.7 9.2 6.5 5 12 5s9.3 4.2 10.5 6.5a1.8 1.8 0 0 1 0 1C21.3 14.8 17.5 19 12 19S2.7 14.8 1.5 12.5Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Confirm new password</span>
        <input
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
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
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
