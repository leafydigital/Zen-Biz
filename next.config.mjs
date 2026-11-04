/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Always fetch fresh data when moving between pages (no 30s client cache),
    // so changes made elsewhere show up without reopening the app.
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
