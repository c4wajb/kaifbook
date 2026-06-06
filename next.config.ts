import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1280],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kaifbook.ru",
      },
      {
        protocol: "https",
        hostname: "www.kaifbook.ru",
      },
      {
        protocol: "https",
        hostname: "stolix.ru",
      },
      {
        protocol: "https",
        hostname: "www.stolix.ru",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "welcomekursk.ru",
      },
      {
        protocol: "https",
        hostname: "static.tildacdn.com",
      },
      {
        protocol: "https",
        hostname: "butylochnaya.ru",
      },
    ],
  },
};

export default nextConfig;
