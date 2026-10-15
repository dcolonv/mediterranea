import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mediterranea/shared"],
  // The local preview (scripts/local-preview.sh) builds into its own folder so
  // it can run next to a normal `next dev`, which locks .next.
  ...(process.env.NEXT_DIST_DIR && { distDir: process.env.NEXT_DIST_DIR }),
};

export default nextConfig;
