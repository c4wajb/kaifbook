import type { NextConfig } from "next";
import { ALLOWED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin Turbopack's workspace root to the build dir. Without this it
  // sometimes infers the root as src/app on the server and then can't
  // resolve `next` ("set turbopack.root" build failure). `next build`
  // always runs from the project root, so cwd is the correct root.
  turbopack: { root: process.cwd() },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1280],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 2592000,
    // Built from the shared whitelist so config and validation cannot drift:
    // validation.ts rejects any host that next/image would refuse to serve.
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default nextConfig;
