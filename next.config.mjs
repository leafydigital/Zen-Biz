import { execSync } from "node:child_process";

// Website version "1.00.N": N goes up by one with every commit/deployment, automatically.
// The first release after this was added is 1.00.1 (commits before it are not counted).
const VERSION_BASE_COMMITS = 60;

async function commitCount() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  // Vercel only clones part of the history, so ask GitHub for the real total.
  if (sha) {
    try {
      const r = await fetch(`https://api.github.com/repos/leafydigital/Zen-Biz/commits?per_page=1&sha=${sha}`);
      const m = /[?&]page=(\d+)>; rel="last"/.exec(r.headers.get("link") ?? "");
      if (m) return Number(m[1]);
    } catch {
      /* fall through */
    }
  }
  try {
    return Number(execSync("git rev-list --count HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim());
  } catch {
    return VERSION_BASE_COMMITS;
  }
}

const appVersion = `1.00.${Math.max(0, (await commitCount()) - VERSION_BASE_COMMITS)}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build id changes with every deployment, so open apps can tell a newer version is live.
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_ID || String(Date.now()),
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  experimental: {
    // Always fetch fresh data when moving between pages (no 30s client cache),
    // so changes made elsewhere show up without reopening the app.
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
