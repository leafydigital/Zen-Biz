import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { BackToHomeLink } from "@/components/BackToHomeLink";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Zen Biz account password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10 sm:px-6">
      <div className="w-full max-w-[440px]">
        <BackToHomeLink className="mb-4" />
        <div className="rounded-xl2 bg-paper-card p-6 shadow-card sm:p-10">
          <Logo className="mb-6" />
          <h1 className="mb-1 font-display text-2xl font-semibold text-text">
            Reset your password
          </h1>
          <p className="mb-7 text-sm text-text-soft">
            Enter your account email and we'll send you a link to set a new password.
          </p>
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
