"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { passwordIssue } from "@/lib/passwordValidation";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const issue = passwordIssue(newPassword);
    if (issue) {
      setError(issue);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSaving(true);

    // Supabase's updateUser() doesn't ask for the current password
    // itself — it trusts the existing signed-in session. Re-verifying
    // the current password here first (by attempting a sign-in with it)
    // is what actually makes "current password" a real check rather
    // than a field that's collected but never used.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setSaving(false);
      setError("Could not verify your account. Please sign in again.");
      return;
    }

    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyErr) {
      setSaving(false);
      setError("Current password is incorrect.");
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-[420px] flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Current password</span>
        <input
          type={showPasswords ? "text" : "password"}
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">New password</span>
        <input
          type={showPasswords ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters, 1 capital, 1 symbol"
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Confirm new password</span>
        <input
          type={showPasswords ? "text" : "password"}
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-text-soft">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
          className="h-4 w-4 rounded border-paper-fold accent-ink"
        />
        Show passwords
      </label>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success" role="status">
          Password updated.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {saving ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
