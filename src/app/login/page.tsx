import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your Zen Biz account to manage your products, customers, and invoices.",
};

export default function LoginPage() {
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
        {/* Left panel — brand cover, hidden on small screens */}
        <div className="relative hidden flex-col justify-between bg-ink p-10 text-paper md:flex">
          <Logo className="[&_span]:text-paper" />
          <div>
            <p className="font-display text-[1.6rem] italic leading-snug text-paper/95">
              Every sale, every customer,
              <br />
              every rupee — in one place.
            </p>
            <p className="mt-4 text-sm text-paper/60">
              Zen Biz is your business's private CRM. Only you can ever see
              what's written in it.
            </p>
          </div>
          <div className="flex gap-6 text-xs text-paper/50">
            <span>Products</span>
            <span>Customers</span>
            <span>Invoices</span>
          </div>
        </div>

        {/* Right panel — the form, styled as the open page with a stitched fold */}
        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 md:shadow-fold">
          <div className="mb-2 md:hidden">
            <Logo />
          </div>
          <h1 className="mb-1 font-display text-2xl font-semibold text-text">
            Welcome back
          </h1>
          <p className="mb-6 text-sm text-text-soft">
            Log in to open your CRM.
          </p>

          <Suspense>
            <AuthForm mode="login" />
          </Suspense>

          <p className="mt-6 text-sm text-text-soft">
            New to Zen Biz?{" "}
            <Link href="/signup" className="font-medium text-ink underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </div>
        </div>
      </div>
    </main>
  );
}
