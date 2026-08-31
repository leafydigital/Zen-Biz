import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign Up Free",
  description: "Create your free Zen Biz account and start managing your products, customers, and invoices in one private CRM.",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10 sm:px-6">
      <div className="w-full max-w-[880px]">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-soft transition hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to home
        </Link>
        <div className="grid overflow-hidden rounded-xl2 bg-paper-card shadow-card md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-ink p-10 text-paper md:flex">
          <Logo className="[&_span]:text-paper" />
          <div>
            <p className="font-display text-[1.6rem] italic leading-snug text-paper/95">
              Open your first CRM
              <br />
              in under a minute.
            </p>
            <p className="mt-4 text-sm text-paper/60">
              Free to start. No card needed. Your data stays private to your
              account, always.
            </p>
          </div>
          <div className="flex gap-6 text-xs text-paper/50">
            <span>Products</span>
            <span>Customers</span>
            <span>Invoices</span>
          </div>
        </div>

        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 md:shadow-fold">
          <div className="mb-2 md:hidden">
            <Logo />
          </div>
          <h1 className="mb-1 font-display text-2xl font-semibold text-text">
            Create your account
          </h1>
          <p className="mb-6 text-sm text-text-soft">
            Start your free Zen Biz CRM.
          </p>

          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>

          <p className="mt-6 text-sm text-text-soft">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
        </div>
      </div>
    </main>
  );
}
