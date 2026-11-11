import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";

const baseUrl = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/products", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
