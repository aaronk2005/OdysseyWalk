/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid empty nextjs-portal (0x0) in dev that can cause layout/accessibility noise
  devIndicators: { buildActivity: false },
};

module.exports = nextConfig;
