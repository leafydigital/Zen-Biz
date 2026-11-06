import type { Metadata } from "next";
import { getAppConfig } from "@/lib/getAppConfig";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/siteConfig";
import { BarcodeScanDemo, BARCODE_STEPS } from "@/components/BarcodeScanDemo";
import { HeroFeatureChips } from "@/components/HeroFeatureChips";
import { localizeConfig } from "@/lib/visitorLocation";
import { formatPrice } from "@/lib/currency";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";
import { DownloadApps } from "@/components/DownloadApps";
import { DemoShowcase, HeroShowcase } from "@/components/DemoShowcase";

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
  {
    title: "Barcode scanning with your phone",
    body: "Scan product barcodes with your phone camera (or a USB / Bluetooth scanner) and the item lands in the bill instantly. No typing, no wrong prices, a much faster counter.",
    icon: (
      <path d="M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Auto barcodes and label printing",
    body: "Every item gets a unique barcode automatically. Print sticker labels in your paper size, single or double column, with a live preview, on any normal or label printer.",
    icon: (
      <path d="M4 5h16v14H4zM8 9v6M11 9v6M14 9v6M17 9v6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Stock you can trust",
    body: "Update stock in packs (5 packs of 250 g, not 5 grams), see what is low, change prices while you update, and let purchases and sales adjust counts for you.",
    icon: (
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5L20 8M12 12.5V21" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Works offline, syncs later",
    body: "No signal at the counter? Keep billing. Everything is saved on the phone and backed up to the cloud automatically when the internet comes back.",
    icon: (
      <path d="M3 15a4 4 0 0 0 4 4h10a4 4 0 0 0 1-7.9A6 6 0 0 0 6.5 9 4 4 0 0 0 3 15Z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "GST billing and reports",
    body: "CGST, SGST and IGST worked out for you, HSN codes on every item, a GST report and Profit & Loss report ready when your accountant asks.",
    icon: (
      <path d="M19 5 5 19M7.5 8a1.5 1.5 0 1 0 0 .01M16.5 17a1.5 1.5 0 1 0 0 .01" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "E-way bill and e-invoice help",
    body: "Add transport details to an invoice and download the file for the government GST portal. Generate the e-way bill or e-invoice free there, then save the number here so it prints on the invoice.",
    icon: (
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a1.5 1.5 0 1 0 0 .01M17 19a1.5 1.5 0 1 0 0 .01" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "20 document designs",
    body: "Pick from 10 invoice templates for A4 and A5 and 10 receipt styles for thermal printers. Add your logo, signature, bank details and payment QR.",
    icon: (
      <path d="M4 4h16v6H4zM4 14h7v6H4zM15 14h5v6h-5z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Quick category buttons",
    body: "Filter your items by category in Billing and Stock with one tap, for example Drinks, Snacks or Groceries, so the right item is always one touch away.",
    icon: (
      <path d="M3 12V4h8l10 10-8 8L3 12ZM7.5 8.5h.01" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "22 languages",
    body: "Use Zen Biz in the language your team is comfortable with, including Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati and more.",
    icon: (
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Share and print anywhere",
    body: "Send invoices by WhatsApp or email as a clean PDF, or print on A4, A5 or 58 / 80 mm thermal receipt printers.",
    icon: (
      <path d="M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Reports that make sense",
    body: "See sales, purchases, expenses and profit without a spreadsheet, and pick any date range.",
    icon: (
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Teams and many businesses",
    body: "Run more than one business from one login, and give staff their own access with roles, so each person sees only what they should.",
    icon: (
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

const FAQ = [
  {
    q: "Is Zen Biz really free to use?",
    a: "Yes. The Starter plan is free forever and includes products, customers, invoices, and quotations — no card required. It's capped at 75 customers, 75 products, and 50 invoices a month; Starter invoices also carry a small Zen Biz watermark. Both the limits and the watermark are removed on the Professional plan and above.",
  },
  {
    q: "How does barcode scanning work in Zen Biz?",
    a: "Every item gets its own unique barcode number automatically. Print the labels, stick them on your products, then open Billing and tap Scan barcode. Your phone camera reads the barcode and adds the item to the bill with its price; scanning it again adds one more. USB and Bluetooth barcode scanners work too. Camera scanning is on the Professional and Business plans.",
  },
  {
    q: "Can I print barcode labels for my products?",
    a: "Yes. Choose your label sticker size, one column or two, and the barcode design in Settings, see a live preview, then print labels from the Stock section. Products sold in packs, like 250 g and 500 g packets of rice, can be counted in packs so labels and stock stay simple.",
  },
  {
    q: "Does Zen Biz work without internet?",
    a: "Yes. The Android app keeps working when the connection drops: you can keep billing and your changes are saved on the phone, then synced to the cloud automatically when the internet is back.",
  },
  {
    q: "Does Zen Biz support GST invoices, e-way bills and e-invoices?",
    a: "Yes. GST billing and the GST report are part of the Business plan. On Professional and Business you can add e-way bill details to invoices, and Zen Biz prepares the file for the government GST portal so you can generate an e-way bill or an e-invoice (IRN) free of charge, then save the number back on the invoice so it prints.",
  },
  {
    q: "Can I use Zen Biz for any type of business?",
    a: "Yes. Whether you run a travel agency, jewellery shop, retail store, supermarket, restaurant, salon, or any other business, you can pick your business type on setup or type in your own — Zen Biz adapts to what you sell.",
  },
  {
    q: "Does buying and selling stock update automatically?",
    a: "Yes, for products you've marked as stock-tracked. Recording a purchase increases that product's stock; recording an invoice decreases it. Services or packages without a stock count — common for travel businesses — are left untouched. Purchases are available on the Professional plan and above.",
  },
  {
    q: "Which languages does Zen Biz support?",
    a: "Zen Biz is available in 22 languages including English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati and Punjabi. Change it any time in Settings.",
  },
  {
    q: "Can I change how my invoices look?",
    a: "Yes. Choose A4, A5 or thermal receipt paper, add your logo, signature, bank details and payment QR, and pick from ready-made templates: 10 invoice designs for A4/A5 and 10 receipt designs for thermal printers (Professional and Business plans).",
  },
  {
    q: "Is my business data private and secure?",
    a: "Yes. Every account's data is walled off at the database level using row-level security, not just hidden in the app. If you log in with a different Google account, it opens a completely fresh account — your data never mixes with anyone else's.",
  },
  {
    q: "Does Zen Biz work on mobile and tablet?",
    a: "Yes, on every plan. Zen Biz is a responsive web app that adjusts to your laptop, tablet or phone from the same link, and there is an Android app too, so you can scan barcodes and bill from your phone.",
  },
  {
    q: "Do I need a credit card to sign up?",
    a: "No. You can create a free Zen Biz account with just an email and password or your Google account — no payment details needed to start on the Starter plan.",
  },
];

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: SITE_URL, siteName: SITE_NAME, title: SITE_TITLE, description: SITE_DESCRIPTION, locale: "en_IN" },
};

export default async function HomePage() {
  const appConfig = localizeConfig(await getAppConfig());
  const rupees = (n: number) => formatPrice(n, appConfig.currency);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android",
        description: SITE_DESCRIPTION,
        featureList: FEATURES.map((x) => x.title),
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: appConfig.currency,
          lowPrice: 0,
          highPrice: appConfig.pricing.business.monthly,
          offerCount: 3,
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "HowTo",
        name: "How to bill with barcode scanning in Zen Biz",
        description: "Create item barcodes, scan them with your phone camera and add the items to a bill.",
        step: BARCODE_STEPS.map((st, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: st.title.replace(/^\d+\.\s*/, ""),
          text: st.body,
        })),
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
          </div>
          <p className="mt-5 text-xs text-text-soft">
            No card required. Works on laptop, tablet, and phone.
          </p>
          <HeroFeatureChips />
        </div>

        <HeroShowcase className="w-full max-w-[600px] justify-self-center drop-shadow-[0_20px_40px_rgba(15,61,62,0.12)]" />
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

      {/* Demo */}
      <section id="demo" className="border-t border-paper-fold bg-paper-card py-16" aria-labelledby="demo-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="inline-flex rounded-full bg-brass/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brass-dark">
              Demo
            </span>
            <h2 id="demo-heading" className="mt-3 font-display text-2xl font-semibold text-text sm:text-3xl">
              See Zen Biz in action
            </h2>
            <p className="mt-2 text-text-soft">
              Watch a bill being made from the first scan to the printed invoice, then look at each screen.
            </p>
          </div>
          <DemoShowcase />
        </div>
      </section>

      {/* Barcode: how it works */}
      <section id="barcode" className="border-t border-paper-fold bg-paper py-16" aria-labelledby="barcode-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="inline-flex rounded-full bg-brass/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brass-dark">
              Barcode billing
            </span>
            <h2 id="barcode-heading" className="mt-3 font-display text-2xl font-semibold text-text sm:text-3xl">
              Scan with your phone. The bill builds itself.
            </h2>
            <p className="mt-2 text-text-soft">
              No barcode machine needed. Your phone camera is the scanner, so every counter can bill in seconds.
            </p>
          </div>
          <BarcodeScanDemo />
          <p className="mt-6 text-center text-sm text-text-soft">
            Camera scanning is on the Professional and Business plans. Barcode labels, USB and Bluetooth scanners follow the same steps.
          </p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-paper-fold bg-paper-card py-16" aria-labelledby="about-heading">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 id="about-heading" className="font-display text-2xl font-semibold text-text sm:text-3xl">
              About Zen Biz
            </h2>
            <p className="mt-4 text-text-soft">
              Zen Biz is billing and stock software made for the people who actually run small businesses: shop owners, traders, wholesalers, service providers and growing teams. It replaces the account book, the stock register and the invoice pad with one calm, private place.
            </p>
            <p className="mt-3 text-text-soft">
              It is built to be quick at a busy counter: scan an item, take the payment, print or share the bill. It keeps working when the internet does not, speaks your language, and lets you move from the free plan to GST billing, e-way bills and reports only when your business needs them.
            </p>
            <Link href="/about-app" className="mt-5 inline-block text-sm font-semibold text-ink underline underline-offset-2">
              Read the full guide to Zen Biz
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              ["Made for small business", "Simple screens, big buttons, nothing you do not need on day one."],
              ["Private by design", "Your data is walled off at the database level and never mixes with anyone else's."],
              ["Fast at the counter", "Barcode scanning, category buttons and quick print for thermal receipt printers."],
              ["Works everywhere", "Laptop, tablet, phone and Android app, online or offline, in 22 languages."],
            ].map(([t, b]) => (
              <li key={t} className="rounded-xl2 border border-paper-fold bg-white p-5 shadow-card">
                <h3 className="font-display text-base font-semibold text-text">{t}</h3>
                <p className="mt-1.5 text-sm text-text-soft">{b}</p>
              </li>
            ))}
          </ul>
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
              <p className="mt-2 font-display text-3xl font-bold text-text">{rupees(0)}</p>
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
                {rupees(appConfig.pricing.professional.monthly)}<span className="text-base font-normal text-text-soft">/mo</span>
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
                  "Multiple users & roles",
                  "Low stock alerts",
                  "Barcode scanning with phone camera",
                  "E-way bill & e-invoice help",
                  "Colourful styles & 20 document templates",
                  "2 businesses, 4 users",
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
                {rupees(appConfig.pricing.business.monthly)}<span className="text-base font-normal text-text-soft">/mo</span>
              </p>
              <p className="mt-1 text-xs text-text-soft">Established SMEs</p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm text-text-soft">
                {[
                  "Everything in Professional",
                  "GST billing & GST report",
                  "Profit & Loss report",
                  "Colourful styles & 20 templates",
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

      <DownloadApps />

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
