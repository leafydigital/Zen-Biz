import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

// Bump this date when the public pages change in a way worth re-crawling.
const UPDATED = new Date("2026-11-05");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about-app`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/signup`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/login`, lastModified: UPDATED, changeFrequency: "monthly", priority: 0.4 },
  ];
}
