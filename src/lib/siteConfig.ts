/**
 * One place for the public web address, used by canonical links, the sitemap,
 * robots.txt and structured data. Set NEXT_PUBLIC_SITE_URL in Vercel to the
 * real domain (no trailing slash); otherwise the default below is used.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://zenbiz.app").replace(/\/+$/, "");
export const SITE_NAME = "Zen Biz";
export const SITE_TITLE = "Zen Biz — Billing, GST Invoice & Barcode Stock Software for Small Business";
export const SITE_DESCRIPTION =
  "Zen Biz is free billing software for small businesses: GST invoices, quotations, barcode scanning with your phone camera, stock and label printing, e-way bill and e-invoice help, works offline. Free plan, no card needed.";
