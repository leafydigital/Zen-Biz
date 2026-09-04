import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
  display: "swap",
});

// Change this to your real domain once you have one (custom domain or your
// Netlify URL). It's the single source of truth for canonical links, the
// sitemap, and social preview cards — update it here and everything else
// (metadataBase, sitemap.ts, robots.ts) picks it up automatically.
const SITE_URL = "https://zenbiz.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Zen Biz — Free Business Billing Software for Products, Customers & Invoices",
    template: "%s · Zen Biz",
  },
  description:
    "Zen Biz is free online billing software for small businesses. Manage products & services, customers, and invoices in one private, secure dashboard — works on laptop, tablet, and mobile. No card required to start.",
  keywords: [
    "business billing software",
    "free invoice software India",
    "small business billing software",
    "customer management software",
    "invoice generator online free",
    "product inventory management free",
    "GST invoice software",
    "quotation software for small business",
    "billing software for shop",
    "billing app for small business",
  ],
  authors: [{ name: "Zen Biz" }],
  creator: "Zen Biz",
  publisher: "Zen Biz",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Zen Biz",
    title: "Zen Biz — Free Business Billing Software for Products, Customers & Invoices",
    description:
      "Track products, customers, and invoices in one private billing software built for small businesses. Free to start, works on any device.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Zen Biz — the private business billing software dashboard",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zen Biz — Free Business Billing Software",
    description:
      "Track products, customers, and invoices in one private billing software. Free to start, works on any device.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Zen Biz",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    description:
      "Zen Biz is free online billing software for small businesses to manage products, services, customers, and invoices in one private, secure dashboard.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
  };

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-body antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
