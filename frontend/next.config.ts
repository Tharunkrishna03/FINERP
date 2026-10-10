import type { NextConfig } from "next";

const defaultBackendUrl = process.env.NODE_ENV === "development"
  ? "http://127.0.0.1:8000"
  : "https://finerp-wpku.onrender.com";
const backendUrl = (process.env.BACKEND_URL || defaultBackendUrl).replace(/\/+$/, "");

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
