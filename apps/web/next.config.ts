import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mediterranea/shared"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mediterraneaskinlab.com',
      },
    ],
  },
};

export default nextConfig;
