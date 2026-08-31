import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-paper-fold bg-paper-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-text-soft">
            The private CRM for businesses who'd rather run their shop
            than fight their spreadsheet.
          </p>
        </div>
        <nav className="flex gap-6 text-sm text-text-soft" aria-label="Footer">
          <Link href="#features" className="hover:text-ink">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-ink">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-ink">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-ink">
            Sign up
          </Link>
        </nav>
      </div>
      <div className="border-t border-paper-fold px-4 py-4 text-center text-xs text-text-soft sm:px-6">
        © {new Date().getFullYear()} Zen Biz. Built for small businesses.
      </div>
    </footer>
  );
}
