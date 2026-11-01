"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Cfg = { professional: { monthly: number; yearly: number }; business: { monthly: number; yearly: number } };
type Lim = { invoicesPerMonth: number | null; customers: number | null; products: number | null; businesses: number | null; users: number | null };

const TABS = [
  ["about", "About"],
  ["how", "How to use"],
  ["features", "Features"],
  ["pricing", "Pricing"],
] as const;
type Tab = (typeof TABS)[number][0];

const FEATURES: [string, string][] = [
  ["GST invoices & bills", "Create tax invoices and billing records with CGST/SGST/IGST worked out for you."],
  ["Quotations", "Send a quotation and convert it into an invoice in one tap."],
  ["Customers & items", "Keep your customers, products and stock in one place."],
  ["Purchases & suppliers", "Record what you buy and who you buy it from."],
  ["Delivery challans", "Make delivery challans for goods you send out."],
  ["Share anywhere", "Download a neat PDF, or send it by WhatsApp or Email."],
  ["GST & Profit-and-Loss reports", "Pick any date range and download the report as PDF or Word."],
  ["Many businesses, one login", "Switch between your businesses without logging out."],
  ["Team users & roles", "Give staff their own login and choose what each can see or edit."],
  ["Low-stock alerts", "Get warned before an item runs out."],
  ["Your design", "Choose paper size, style, logo, signature, bank details and QR."],
  ["Private & secure", "Only the people you allow can see your business data."],
];

const STEPS: [string, string][] = [
  ["Create your account", "Sign up with your Gmail address and enter the 6-digit code we email you."],
  ["Set up your business", "Open Settings and fill in your business name, address, GST number, logo and bank details."],
  ["Add customers and items", "Add the people you sell to and the things you sell. You can also add them while making a bill."],
  ["Make an invoice or quotation", "Tap + New Invoice, choose the customer, add items, and save."],
  ["Share it", "Open the invoice and tap WhatsApp, Email, Print or Download."],
  ["Track your money", "Mark invoices as paid, and open Reports to see GST and profit-and-loss."],
  ["Add your team (Professional plan)", "In Settings, invite staff and tick the pages each person may view or edit."],
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const lim = (n: number | null) => (n === null ? "Unlimited" : String(n));

export function AboutAppTabs({ pricing, starter, professional, business, initialTab }: { pricing: Cfg; starter: Lim; professional: Lim; business: Lim; initialTab?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((TABS.find(([id]) => id === initialTab)?.[0] as Tab) ?? "about");
  const card = "rounded-xl border border-paper-fold bg-white p-4 shadow-card";

  const plans = [
    { name: "Starter", price: "Free", note: "For getting going", lim: starter, tone: "border-slate-200", extra: ["Invoices with a Zen Biz footer", "Quotations"] },
    { name: "Professional", price: `${inr(pricing.professional.monthly)}/month`, note: `or ${inr(pricing.professional.yearly)}/year`, lim: professional, tone: "border-sky-300", extra: ["GST billing & reports", "Purchases & delivery challans", "Profit & Loss", "WhatsApp sharing", "Team users & roles", "Low-stock alerts"] },
    { name: "Business", price: `${inr(pricing.business.monthly)}/month`, note: `or ${inr(pricing.business.yearly)}/year`, lim: business, tone: "border-violet-300", extra: ["Everything in Professional", "Higher limits", "Barcode scanning (coming)"] },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-10">
      <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/login"))} className="flex w-fit items-center gap-0.5 rounded-lg bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium text-text shadow-card">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        Back
      </button>

      <h1 className="font-display text-2xl font-semibold text-text">Zen Biz</h1>

      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${tab === id ? "bg-ink text-paper" : "bg-white text-text"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "about" && (
        <div className={`${card} flex flex-col gap-3 text-sm text-text`}>
          <p className="font-display text-lg font-semibold">Billing made simple for Indian small businesses</p>
          <p>Zen Biz is your private billing and business book. Make GST invoices, quotations and purchase records, keep track of customers and stock, and share neat PDFs with your customers in seconds.</p>
          <p>It works on your phone, tablet and computer, and everything stays in sync — the data you enter on the website is the same data you see in the app.</p>
          <p className="text-text-soft">Made by Leafy Digital.</p>
        </div>
      )}

      {tab === "how" && (
        <ol className="flex flex-col gap-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className={`${card} flex gap-3`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold text-text">{title}</p>
                <p className="mt-0.5 text-sm text-text-soft">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {tab === "features" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(([title, body]) => (
            <div key={title} className={card}>
              <p className="font-semibold text-text">✓ {title}</p>
              <p className="mt-0.5 text-sm text-text-soft">{body}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "pricing" && (
        <div className="flex flex-col gap-3">
          {plans.map((p) => (
            <div key={p.name} className={`${card} border-2 ${p.tone}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-lg font-semibold text-text">{p.name}</p>
                <p className="font-ledger text-lg font-semibold text-text">{p.price}</p>
              </div>
              <p className="text-xs text-text-soft">{p.name === "Starter" ? p.note : p.note}</p>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-text">
                <li>• Invoices per month: {lim(p.lim.invoicesPerMonth)}</li>
                <li>• Customers: {lim(p.lim.customers)}</li>
                <li>• Items: {lim(p.lim.products)}</li>
                <li>• Businesses: {lim(p.lim.businesses)}</li>
                <li>• Users: {lim(p.lim.users)}</li>
                {p.extra.map((e) => <li key={e}>• {e}</li>)}
              </ul>
            </div>
          ))}
          <p className="text-xs text-text-soft">Prices are in Indian rupees. Upgrade any time from inside the app.</p>
        </div>
      )}
    </div>
  );
}
