import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
