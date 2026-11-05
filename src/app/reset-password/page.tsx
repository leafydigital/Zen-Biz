import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your Zen Biz account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10 sm:px-6">
      <div className="w-full max-w-[440px]">
        <div className="rounded-xl2 bg-paper-card p-6 shadow-card sm:p-10">
          <Logo className="mb-6" />
          <h1 className="mb-1 font-display text-2xl font-semibold text-text">
            Set a new password
          </h1>
          <p className="mb-7 text-sm text-text-soft">
            Choose a new password for your account.
          </p>
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
