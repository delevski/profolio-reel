import type { MetadataRoute } from "next";
import { getBlogPosts, getLearnGuides } from "@/lib/content";
import { locales } from "@/lib/i18n/config";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ordel.dev";

const staticRoutes = [
  "",
  "/about",
  "/blog",
  "/learn",
  "/academy",
  "/projects",
  "/apps",
  "/contact",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = locales.flatMap((locale) =>
    staticRoutes.map((route) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.8,
    }))
  );

  const blogRoutes = locales.flatMap((locale) =>
    getBlogPosts().map((post) => ({
      url: `${baseUrl}/${locale}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  const learnRoutes = locales.flatMap((locale) =>
    getLearnGuides().map((guide) => ({
      url: `${baseUrl}/${locale}/learn/${guide.slug}`,
      lastModified: new Date(guide.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  return [...staticEntries, ...blogRoutes, ...learnRoutes];
}
