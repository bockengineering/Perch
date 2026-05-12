import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
