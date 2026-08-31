import type { MetadataRoute } from "next";

// Keep this in sync with SITE_URL in src/app/layout.tsx.
const SITE_URL = "https://zenbiz.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The dashboard is private, signed-in data — no reason for search
        // engines to try crawling it, and RLS would block them anyway.
        disallow: ["/dashboard", "/onboarding"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
