import "server-only";
import fs from "fs";
import path from "path";
import type { Locale } from "./i18n/config";
import type { TrendDigest, TrendDigestFile, TrendDigestItem } from "./types";

const digestDir = path.join(process.cwd(), "content", "ai-trends");
const DATE_FILE = /^\d{4}-\d{2}-\d{2}\.json$/;

/** Minimal shape check so one malformed file can never break the page. */
export function isTrendDigestFile(value: unknown): value is TrendDigestFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    Array.isArray(v.items) &&
    v.items.every((i) => {
      const it = i as Record<string, unknown>;
      return (
        it &&
        typeof it.title === "string" &&
        typeof it.href === "string" &&
        (it.source === "github" || it.source === "huggingface") &&
        typeof it.summary === "object" &&
        it.summary !== null
      );
    })
  );
}

function pick(value: { en?: string; he?: string } | undefined, locale: Locale): string {
  if (!value) return "";
  return (locale === "he" ? value.he || value.en : value.en || value.he) ?? "";
}

function localize(file: TrendDigestFile, locale: Locale): TrendDigest {
  const t = file.trendOfTheDay;
  const items: TrendDigestItem[] = file.items.map((i) => ({
    id: i.id,
    source: i.source,
    title: i.title,
    href: i.href,
    stars: i.stars,
    language: i.language,
    tag: i.tag,
    downloads: i.downloads,
    imageUrl: i.imageUrl,
    summary: pick(i.summary, locale),
  }));
  return {
    date: file.date,
    trendOfTheDay: t
      ? {
          slug: t.slug,
          title: locale === "he" ? t.titleHe || t.title : t.title,
          excerpt: locale === "he" ? t.excerptHe || t.excerpt : t.excerpt,
          sourceHref: t.sourceHref,
          image: t.image,
          imageAlt: t.imageAlt,
        }
      : null,
    items,
  };
}

/**
 * Daily digests written by the "Daily AI Trends" GitHub Action to
 * content/ai-trends/YYYY-MM-DD.json (schema: docs/daily-trends.md), newest first.
 */
export function getTrendDigests(locale: Locale = "en"): TrendDigest[] {
  if (!fs.existsSync(digestDir)) return [];
  const out: TrendDigestFile[] = [];
  for (const f of fs.readdirSync(digestDir).filter((n) => DATE_FILE.test(n))) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(path.join(digestDir, f), "utf-8"));
      if (isTrendDigestFile(parsed)) out.push(parsed);
      else console.warn(`ai-trends: ${f} does not match the digest schema, skipped`);
    } catch (err) {
      console.warn(`ai-trends: could not read ${f}:`, err);
    }
  }
  return out
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((f) => localize(f, locale));
}

/** The digest whose trend-of-the-day is this blog post (null for ordinary posts). */
export function getDigestForPost(slug: string, locale: Locale = "en"): TrendDigest | null {
  return getTrendDigests(locale).find((d) => d.trendOfTheDay?.slug === slug) ?? null;
}
