"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COUNTRY_CODES, DEFAULT_COUNTRY } from "@/lib/countryCodes";
import { passwordIssue } from "@/lib/passwordValidation";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const { showLoader, hideLoader } = useGlobalLoader();

  const [email, setEmail] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [countryDialCode, setCountryDialCode] = useState(DEFAULT_COUNTRY.dialCode);
  const [localPhone, setLocalPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = createClient();

  /**
   * The phone number's local part only needs to be real digits, 4–14 of
   * them — the country code prefix is a separate, guaranteed-correct
   * dropdown selection, so this no longer has to guess a country from
   * the number's shape the way a single free-text field did.
   */
  function isValidLocalPhone(value: string): boolean {
    const digitsOnly = value.replace(/[\s\-().]/g, "");
    return /^\d{4,14}$/.test(digitsOnly);
  }

  /**
   * HTML's own type="email" validation only checks for a loose x@y
   * shape — it happily accepts something like "name@g" mid-typing,
   * which is why an incomplete address (missing ".com" etc.) could get
   * submitted. This requires an actual domain with a dot and at least a
   * 2-letter extension, e.g. "name@gmail.com" — a real, complete
   * address, not just anything containing "@".
   */
  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value.trim());
  }

  /**
   * A shape like "name@gmail.co" or "name@gmial.com" passes the general
   * check above (it's still a real-looking domain), but is almost
   * always a typo of a well-known provider, not a real address someone
   * meant to use. This catches the common near-misses for major
   * providers and returns a specific correction, so the mistake is
   * caught before the account is created with an address that will
   * never actually receive the verification email.
   */
  function emailTypoSuggestion(value: string): string | null {
    const trimmed = value.trim().toLowerCase();
    const domain = trimmed.split("@")[1];
    if (!domain) return null;

    const KNOWN_DOMAIN_TYPOS: Record<string, string> = {
      "gmail.co": "gmail.com",
      "gmail.cm": "gmail.com",
      "gmail.con": "gmail.com",
      "gmial.com": "gmail.com",
      "gmai.com": "gmail.com",
      "gnail.com": "gmail.com",
      "yahoo.co": "yahoo.com",
      "yahoo.cm": "yahoo.com",
      "yaho.com": "yahoo.com",
      "outlook.co": "outlook.com",
      "hotmail.co": "hotmail.com",
      "hotmial.com": "hotmail.com",
    };

    return KNOWN_DOMAIN_TYPOS[domain] ?? null;
  }

  function fullPhoneNumber(): string {
    return `${countryDialCode}${localPhone.replace(/[\s\-().]/g, "")}`;
  }

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    showLoader("Connecting to Google…");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
      hideLoader();
    }
    // On success, the browser redirects to Google — nothing else to do here.
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading("email");
    showLoader(mode === "signup" ? "Creating your account…" : "Signing in…");

    // Every early return in this handler stops the loader through this
    // one function, so the global modal can never get stuck open by a
    // return path that forgot to call hideLoader() directly.
    function stopLoading() {
      setLoading(null);
      hideLoader();
    }

    if (mode === "signup") {
      if (!isValidEmail(email)) {
        setError("Please enter a complete email address (e.g. name@gmail.com).");
        stopLoading();
        return;
      }

      const typoSuggestion = emailTypoSuggestion(email);
      if (typoSuggestion) {
        setError(`Please check your email address — did you mean "${email.trim().split("@")[0]}@${typoSuggestion}"?`);
        stopLoading();
        return;
      }

      if (!isValidLocalPhone(localPhone)) {
        setError("Please enter a valid phone number.");
        stopLoading();
        return;
      }

      const pwIssue = passwordIssue(password);
      if (pwIssue) {
        setError(pwIssue);
        stopLoading();
        return;
      }

      const phone = fullPhoneNumber();

      // Supabase's signUp() does NOT return an error for an email that's
      // already registered — by design, so an attacker can't use signup
      // to discover which emails have accounts. That's normally fine,
      // but it meant a real returning user just saw "Account created,
      // check your email" and got quietly stuck, with no way to tell
      // they should have logged in instead. get_user_id_by_email is the
      // same narrow, already-existing lookup used elsewhere in the app
      // (never exposes anything beyond "does an account with this email
      // exist") — checking it here up front gives an honest, specific
      // message instead.
      const { data: existingUserForEmail } = await supabase.rpc(
        "get_user_id_by_email" as never,
        { lookup_email: email.trim().toLowerCase() } as never
      ) as unknown as { data: string | null };

      if (existingUserForEmail) {
        setError("This Gmail/email is already registered. Please log in instead.");
        stopLoading();
        return;
      }

      const { data: existingEmailForPhone } = await supabase.rpc(
        "get_email_by_phone" as never,
        { lookup_phone: phone } as never
      ) as unknown as { data: string | null };

      if (existingEmailForPhone) {
        setError(
          "An account with this phone number already exists. Please log in instead."
        );
        stopLoading();
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { phone },
        },
      });
      stopLoading();
      if (error) {
        setError(error.message);
        return;
      }
      setNotice(
        "Account created. Check your email for a verification link, then log in."
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginIdentifier.trim(),
      password,
    });
    stopLoading();
    if (error) {
      // Supabase's signInWithPassword() returns the same generic message
      // ("Invalid login credentials") whether the email has no account at
      // all or the password is simply wrong — a deliberate choice on
      // their end so a failed login attempt can't be used to discover
      // which emails are registered. Checking existence separately here
      // (via the same narrow, already-anon-accessible lookup used for
      // signup's duplicate check) lets a genuinely missing account get
      // an honest, more helpful message instead of being told its
      // password is wrong.
      const { data: existingUserId } = (await supabase.rpc("get_user_id_by_email" as never, {
        lookup_email: loginIdentifier.trim().toLowerCase(),
      } as never)) as unknown as { data: string | null };

      setError(
        existingUserId
          ? "Incorrect password. Please try again."
          : "Account not found. Please create an account."
      );
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
        {mode === "login" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="you@business.com"
              className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Email</span>
              <input
                type="email"
                required
                pattern="[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}"
                title="Enter a complete email address, e.g. name@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Phone Number</span>
              <div className="flex gap-2">
                <select
                  value={countryDialCode}
                  onChange={(e) => setCountryDialCode(e.target.value)}
                  aria-label="Country code"
                  className="w-[110px] shrink-0 rounded-xl border border-paper-fold bg-white px-2.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.iso} value={c.dialCode}>
                      {c.dialCode} {c.iso}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  autoComplete="tel-national"
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="min-w-0 flex-1 rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
                />
              </div>
            </label>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters, 1 capital, 1 symbol" : "Enter your password"}
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

        {mode === "login" && (
          <a
            href="/forgot-password"
            className="-mt-2 self-end text-sm font-medium text-ink hover:underline"
          >
            Forgot password?
          </a>
        )}

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
