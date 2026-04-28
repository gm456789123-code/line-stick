import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
