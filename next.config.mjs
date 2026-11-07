/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Changes with every deployment, so open apps can tell a newer version is live.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_ID || String(Date.now()) },
  experimental: {
    // Always fetch fresh data when moving between pages (no 30s client cache),
    // so changes made elsewhere show up without reopening the app.
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
