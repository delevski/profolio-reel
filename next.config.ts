import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v2 portfolio redesign (static, public/v2): served as the /en and /he home pages.
  // Every other route (/en/reel, /en/blog, /he/hermes, …) keeps using the Next app.
  // The old Academy section was replaced by AI Trends: keep inbound links alive.
  async redirects() {
    return [
      { source: "/:locale(en|he)/academy", destination: "/:locale/ai-trends", permanent: true },
      { source: "/academy", destination: "/en/ai-trends", permanent: true },
      // Private products hub lives on the ordel-products Worker behind a login.
      // Trailing slash keeps the Worker's relative form/links under /products/.
      { source: "/products", destination: "/products/", permanent: false },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/en", destination: "/v2/index.html" },
        { source: "/he", destination: "/v2/he/index.html" },
        // Proxy /products/* to the gated ordel-products Cloudflare Worker.
        { source: "/products/", destination: "https://ordel-products.orworkdelevski.workers.dev/" },
        { source: "/products/:path+", destination: "https://ordel-products.orworkdelevski.workers.dev/:path+" },
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
