import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Disable trailing slash for cleaner URLs
  trailingSlash: false,
};

export default nextConfig;
