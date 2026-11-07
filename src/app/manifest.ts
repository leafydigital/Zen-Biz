import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zen Biz — Billing & Stock",
    short_name: "Zen Biz",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F5F0",
    theme_color: "#2563EB",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
