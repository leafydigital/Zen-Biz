"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = createClient();

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
    // On success, the browser redirects to Google — nothing else to do here.
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading("email");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(null);
      if (error) {
        setError(error.message);
        return;
      }
      setNotice(
        "Account created. Check your email to confirm it, then log in."
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="w-full max-w-[380px]">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-paper-fold bg-white px-4 py-3 text-[0.95rem] font-medium text-text transition hover:border-ink/30 hover:shadow-card disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-text-soft">
        <span className="h-px flex-1 bg-paper-fold" />
        or with email
        <span className="h-px flex-1 bg-paper-fold" />
      </div>

      <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success" role="status">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={loading !== null}
          className="mt-1 rounded-xl bg-ink px-4 py-3 text-[0.95rem] font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
        >
          {loading === "email"
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Log in"}
        </button>
      </form>
    </div>
  );
}
