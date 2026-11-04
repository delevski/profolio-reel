import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v2 portfolio redesign (static, public/v2): served as the /en and /he home pages.
  // Every other route (/en/reel, /en/blog, /he/hermes, …) keeps using the Next app.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/en", destination: "/v2/index.html" },
        { source: "/he", destination: "/v2/he/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Vary", value: "Accept" }] }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "opengraph.githubassets.com",
      },
      {
        protocol: "https",
        hostname: "huggingface.co",
      },
      {
        protocol: "https",
        hostname: "cdn-thumbnails.huggingface.co",
      },
    ],
  },
};

export default nextConfig;
