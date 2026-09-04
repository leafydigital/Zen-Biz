import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";
import { AppPreview } from "@/components/AppPreview";

const FEATURES = [
  {
    title: "Products & services",
    body: "List everything you sell — goods or services, priced however you like. Keep stock counts where they matter, skip them where they don't.",
    icon: (
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5M12 12.5 20 8M12 12.5V21" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Purchases & suppliers",
    body: "Record what you buy in and from whom. Stock-tracked items update automatically — buying adds to stock, selling takes it away.",
    icon: (
      <path d="M3 4h2l2.4 12.2a1.5 1.5 0 0 0 1.5 1.3h8.2a1.5 1.5 0 0 0 1.48-1.24L20 8H6.2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Invoices & quotations",
    body: "Build an invoice or send a quotation first — either way the total adds up as you go, and downloads as a clean PDF.",
    icon: (
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z M14 3.5V8h4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Private by design",
    body: "Every account's data is walled off at the database level. Log in with a different Gmail and it's a fresh account — nothing ever crosses over.",
    icon: (
      <path d="M6.5 10.5V8a5.5 5.5 0 0 1 11 0v2.5M5 10.5h14a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1Z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Works on any screen",
    body: "The same software adapts itself to your laptop, tablet, or phone automatically — no separate app to install to get started.",
    icon: (
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM9 20h6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Built for every business",
    body: "Pick your business type on setup and Zen Biz adjusts the details that matter — units in grams for jewellery, packages for travel, stock tracking on for a shop, off for services. Type your own if none fit.",
    icon: (
      <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

const FAQ = [
  {
    q: "Is Zen Biz really free to use?",
    a: "Yes. The Starter plan is free forever and includes products, customers, invoices, and quotations — no card required. It's capped at 75 customers, 75 products, and 50 invoices a month; Starter invoices also carry a small Zen Biz watermark. Both the limits and the watermark are removed on the Professional plan and above.",
  },
  {
    q: "Can I use Zen Biz for any type of business?",
    a: "Yes. Whether you run a travel agency, jewellery shop, retail store, restaurant, salon, or any other business, you can pick your business type on setup or type in your own — Zen Biz adapts to what you sell.",
  },
  {
    q: "Does buying and selling stock update automatically?",
    a: "Yes, for products you've marked as stock-tracked. Recording a purchase increases that product's stock; recording an invoice decreases it. Services or packages without a stock count — common for travel businesses — are left untouched. Purchases are available on the Professional plan and above.",
  },
  {
    q: "Is my business data private and secure?",
    a: "Yes. Every account's data is walled off at the database level using row-level security, not just hidden in the app. If you log in with a different Google account, it opens a completely fresh account — your data never mixes with anyone else's.",
  },
  {
    q: "Does Zen Biz work on mobile and tablet?",
    a: "Yes, on every plan. Zen Biz is a responsive web app that automatically adjusts to your screen size — laptop, tablet, or phone — from the same link, with no separate app to install.",
  },
  {
    q: "Do I need a credit card to sign up?",
    a: "No. You can create a free Zen Biz account with just an email and password or your Google account — no payment details needed to start on the Starter plan.",
  },
];

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingHeader />

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brass/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brass-dark">
            Free to start
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] text-text sm:text-5xl">
            Your business,
            <br />
            <span className="italic text-ink">kept like real billing software.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-text-soft sm:text-lg">
            Zen Biz replaces the paper account book — track what you sell,
            who you sell it to, and every invoice you raise. Private to your
            account, from day one.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
            >
              Start billing for free
            </Link>
            <Link
              href="#features"
              className="text-sm font-semibold text-ink underline underline-offset-2"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-xs text-text-soft">
            No card required. Works on laptop, tablet, and phone.
          </p>
        </div>

        <AppPreview className="w-full max-w-[560px] justify-self-center drop-shadow-[0_20px_40px_rgba(15,61,62,0.12)]" />
      </section>

      {/* Explainer strip */}
      <section className="border-y border-paper-fold bg-paper-card py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            Most small businesses run on three notebooks —
            <br className="hidden sm:block" /> one for stock, one for
            customers, one for bills.
          </h2>
          <p className="mt-4 text-text-soft">
            Zen Biz puts all three in one place you can reach from your
            counter, your phone, or your desk — and keeps it exactly as
            private as a locked drawer.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            Everything your billing needs
          </h2>
          <p className="mt-2 text-text-soft">
            Simple enough for day one, ready to grow with paid features later.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl2 border border-paper-fold bg-paper-card p-6 shadow-card"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-ink/[0.06] text-ink">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  {f.icon}
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-text">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-text-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-paper-fold bg-paper-card py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl font-semibold text-text sm:text-3xl">
              Start free. Upgrade when you need to.
            </h2>
            <p className="mt-2 text-text-soft">
              No trial countdown, no surprise charges.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl2 border border-paper-fold bg-white p-7 shadow-card">
              <p className="text-sm font-semibold uppercase tracking-wide text-text-soft">
                Starter
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-text">₹0</p>
              <p className="mt-1 text-xs text-text-soft">Freelancers & small shops</p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm text-text-soft">
                {[
                  "Up to 75 products & services",
                  "Up to 75 customers",
                  "50 invoices per month",
                  "Invoices (watermarked)",
                  "Quotations, convert to invoice",
                  "A4 / A5 / Thermal sizes",
                  "1 business, 1 user",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-success">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block rounded-xl border border-ink px-4 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                Start free
              </Link>
            </div>

            <div className="rounded-xl2 border-2 border-brass bg-white p-7 shadow-card">
              <p className="text-sm font-semibold uppercase tracking-wide text-brass-dark">
                Professional
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-text">
                ₹799<span className="text-base font-normal text-text-soft">/mo</span>
              </p>
              <p className="mt-1 text-xs text-text-soft">Growing small businesses</p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm text-text-soft">
                {[
                  "Everything in Starter, no watermark",
                  "Unlimited invoices",
                  "Unlimited customers & products",
                  "Purchases & Suppliers",
                  "Delivery Challan",
                  "Share via WhatsApp / email",
                  "Expense tracking",
                  "Invoice tracking (Sent/Viewed/Overdue)",
                  "2 businesses, 2 users",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-success">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block rounded-xl bg-ink px-4 py-2.5 text-center text-sm font-semibold text-paper transition hover:bg-ink-light"
              >
                Start free, upgrade anytime
              </Link>
            </div>

            <div className="rounded-xl2 border border-paper-fold bg-white p-7 shadow-card">
              <p className="text-sm font-semibold uppercase tracking-wide text-text-soft">
                Business
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-text">
                ₹1,999<span className="text-base font-normal text-text-soft">/mo</span>
              </p>
              <p className="mt-1 text-xs text-text-soft">Established SMEs</p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm text-text-soft">
                {[
                  "Everything in Professional",
                  "GST billing & GST report",
                  "Profit & Loss report",
                  "Colourful document styles",
                  "Multiple users & roles",
                  "Low stock alerts",
                  "Up to 5 businesses, 5+ users",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-success">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 block rounded-xl border border-ink px-4 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-ink/5"
              >
                Start free, upgrade anytime
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-text-soft">
            Yearly billing available at ~17% off. Prices shown in INR.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            Common questions
          </h2>
        </div>

        <div className="flex flex-col divide-y divide-paper-fold">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-semibold text-text">
                {item.q}
                <span className="shrink-0 text-text-soft transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-text-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
