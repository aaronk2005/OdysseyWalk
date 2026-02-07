/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid empty nextjs-portal (0x0) in dev that can cause layout/accessibility noise
  devIndicators: { buildActivity: false },
  // Don't bundle ws (and its optional deps) so bufferUtil.mask works in Node (avoids "bufferUtil.mask is not a function")
  experimental: {
    serverComponentsExternalPackages: ["ws", "bufferutil", "utf-8-validate"],
  },
};

module.exports = nextConfig;
