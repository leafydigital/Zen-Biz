import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-paper-fold bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" aria-label="Zen Biz home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 sm:flex" aria-label="Main">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-text-soft transition hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 11.5 12 5l8 6.5M6 10v9h5v-5h2v5h5v-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-text-soft transition hover:text-ink"
          >
            Pricing
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-text-soft transition hover:text-ink"
          >
            Features
          </Link>
          <Link
            href="#faq"
            className="text-sm font-medium text-text-soft transition hover:text-ink"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-text-soft transition hover:text-ink"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-light"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
