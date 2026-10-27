import type { NextConfig } from "next";

// Static export: the whole app is client-side and deploys to Cloudflare Pages as plain files.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
