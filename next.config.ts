import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger payloads for image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
