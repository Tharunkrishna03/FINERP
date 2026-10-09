import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL || "https://finerp-wpku.onrender.com").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  turbopack: {
    root: process.cwd(),
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return ["api", "admin", "media", "static"].map((path) => ({
      source: `/${path}/:path*`,
      destination: `${backendUrl}/${path}/:path*`,
    }));
  },
};

export default nextConfig;
