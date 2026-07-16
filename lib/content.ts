import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Locale } from "./i18n/config";
import { getSupabase, type DbAutoPost, type DbTrend } from "./supabase";
import type {
  App,
  Course,
  CourseView,
  LocalizedString,
  MdxDoc,
  Project,
  ProjectView,
  SiteConfig,
  Testimonial,
  TestimonialView,
  Trend,
  TrendRecord,
  Video,
} from "./types";

function pickLocalized(value: LocalizedString | string, locale: Locale): string {
  if (typeof value === "string") return value;
  return value[locale] ?? value.en;
}

const contentDir = path.join(process.cwd(), "content");

function readJson<T>(filename: string): T {
  const filePath = path.join(contentDir, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function getMdxDocs(subdir: string): MdxDoc[] {
  const dir = path.join(contentDir, subdir);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

  return files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
      const { data, content } = matter(raw);
      return {
        slug,
        title: data.title as string,
        excerpt: data.excerpt as string,
        date: data.date as string,
        readTime: data.readTime as string,
        tags: (data.tags as string[]) ?? [],
        lang: (data.lang as string) ?? "EN",
        featured: data.featured as boolean | undefined,
        isNew: data.isNew as boolean | undefined,
        difficulty: data.difficulty as string | undefined,
        category: data.category as string | undefined,
        emoji: data.emoji as string | undefined,
        imageUrl: (data.imageUrl as string | undefined) ?? (data.image as string | undefined),
        sourceHref: data.sourceHref as string | undefined,
        content,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function mapAutoPost(row: DbAutoPost, locale: Locale): MdxDoc {
  const useHe = locale === "he" && Boolean(row.title_he && row.content_he);
  return {
    slug: row.slug,
    title: useHe ? row.title_he! : row.title,
    excerpt: useHe ? row.excerpt_he ?? row.excerpt : row.excerpt,
    date: row.date,
    readTime: row.read_time,
    tags: row.tags ?? ["AI Trend Digest"],
    lang: useHe ? "HE" : row.lang ?? "EN",
    content: useHe ? row.content_he! : row.content,
    imageUrl: row.image_url ?? undefined,
    sourceHref: row.source_href,
  };
}

async function getAutoPosts(locale: Locale): Promise<MdxDoc[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("auto_posts")
      .select("*")
      .order("date", { ascending: false });

    if (error || !data) {
      console.error("Failed to load auto_posts:", error?.message);
      return [];
    }

    return (data as DbAutoPost[]).map((row) => mapAutoPost(row, locale));
  } catch (err) {
    console.error("Failed to load auto_posts:", err);
    return [];
  }
}

export function getSiteConfig(locale: Locale = "en"): SiteConfig {
  return readJson<SiteConfig>(`site.${locale}.json`);
}

export function getProjects(locale: Locale = "en"): ProjectView[] {
  const projects = readJson<Project[]>("projects.json");
  return projects.map((p) => ({
    ...p,
    description: pickLocalized(p.description, locale),
  }));
}

export function getApps(): App[] {
  return readJson<App[]>("apps.json");
}

export function getCourses(locale: Locale = "en"): CourseView[] {
  return readJson<Course[]>("courses.json").map((c) => ({
    ...c,
    title: pickLocalized(c.title, locale),
    description: pickLocalized(c.description, locale),
    level: pickLocalized(c.level, locale),
  }));
}

export function getVideos(): Video[] {
  return readJson<Video[]>("videos.json");
}

export function getTestimonials(locale: Locale = "en"): TestimonialView[] {
  return readJson<Testimonial[]>("testimonials.json").map((t) => ({
    ...t,
    role: pickLocalized(t.role, locale),
    quote: pickLocalized(t.quote, locale),
    relation: pickLocalized(t.relation, locale),
  }));
}

/**
 * Hebrew override for an MDX doc, from content/<subdir>/he/<slug>.mdx.
 * Text fields present in the override replace the English ones; other
 * metadata stays shared with the English file.
 */
function applyHebrewMdxOverride(subdir: string, doc: MdxDoc): MdxDoc {
  const hePath = path.join(contentDir, subdir, "he", `${doc.slug}.mdx`);
  if (!fs.existsSync(hePath)) return doc;

  const { data, content } = matter(fs.readFileSync(hePath, "utf-8"));
  return {
    ...doc,
    title: (data.title as string) || doc.title,
    excerpt: (data.excerpt as string) || doc.excerpt,
    difficulty: (data.difficulty as string | undefined) ?? doc.difficulty,
    category: (data.category as string | undefined) ?? doc.category,
    tags: (data.tags as string[] | undefined) ?? doc.tags,
    content,
    lang: "HE",
  };
}

function getLocalizedMdxDocs(subdir: string, locale: Locale): MdxDoc[] {
  const docs = getMdxDocs(subdir);
  if (locale !== "he") return docs;
  return docs.map((doc) => applyHebrewMdxOverride(subdir, doc));
}

/** MDX blog posts from the filesystem (sync). */
export function getMdxBlogPosts(locale: Locale = "en"): MdxDoc[] {
  return getLocalizedMdxDocs("blog", locale);
}

/** Merged MDX + Supabase auto-posts, newest first. */
export async function getBlogPosts(locale: Locale = "en"): Promise<MdxDoc[]> {
  const [mdx, auto] = await Promise.all([
    Promise.resolve(getMdxBlogPosts(locale)),
    getAutoPosts(locale),
  ]);

  const bySlug = new Map<string, MdxDoc>();
  for (const post of [...mdx, ...auto]) {
    if (!bySlug.has(post.slug)) bySlug.set(post.slug, post);
  }

  return [...bySlug.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getBlogPost(
  slug: string,
  locale: Locale = "en"
): Promise<MdxDoc | undefined> {
  const mdx = getMdxBlogPosts(locale).find((p) => p.slug === slug);
  if (mdx) return mdx;

  const supabase = getSupabase();
  if (!supabase) return undefined;

  try {
    const { data, error } = await supabase
      .from("auto_posts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return undefined;
    return mapAutoPost(data as DbAutoPost, locale);
  } catch {
    return undefined;
  }
}

export function getLearnGuides(locale: Locale = "en"): MdxDoc[] {
  return getLocalizedMdxDocs("learn", locale);
}

export function getLearnGuide(
  slug: string,
  locale: Locale = "en"
): MdxDoc | undefined {
  return getLearnGuides(locale).find((g) => g.slug === slug);
}

function normalizeTrendRecord(
  raw: TrendRecord & { description?: LocalizedString | string }
): TrendRecord {
  const description =
    typeof raw.description === "string"
      ? { en: raw.description, he: raw.description }
      : raw.description;
  return { ...raw, description };
}

function toTrendView(record: TrendRecord, locale: Locale): Trend {
  return {
    id: record.id,
    title: record.title,
    source: record.source,
    description: pickLocalized(record.description, locale),
    href: record.href,
    stars: record.stars,
    imageUrl: record.imageUrl,
  };
}

export function getMockTrends(locale: Locale = "en"): Trend[] {
  const records = readJson<(TrendRecord & { description?: LocalizedString | string })[]>(
    "trends.json"
  );
  return records.map((r) => toTrendView(normalizeTrendRecord(r), locale));
}

function mapDbTrend(row: DbTrend, locale: Locale): Trend {
  return {
    id: row.id,
    title: row.title,
    source: row.source === "github" ? "GitHub" : "Hugging Face",
    description: locale === "he" ? row.summary_he : row.description,
    href: row.href,
    stars: row.stars ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

/** Latest day's trends from Supabase, or mock JSON fallback. */
export async function getLiveTrends(locale: Locale = "en"): Promise<Trend[]> {
  const supabase = getSupabase();
  if (!supabase) return getMockTrends(locale);

  try {
    const { data: latestRows, error: latestError } = await supabase
      .from("trends")
      .select("day")
      .order("day", { ascending: false })
      .limit(1);

    if (latestError || !latestRows?.length) return getMockTrends(locale);

    const day = latestRows[0].day as string;
    const { data, error } = await supabase
      .from("trends")
      .select("*")
      .eq("day", day)
      .order("source", { ascending: true })
      .order("title", { ascending: true });

    if (error || !data?.length) return getMockTrends(locale);
    return (data as DbTrend[]).map((row) => mapDbTrend(row, locale));
  } catch (err) {
    console.error("Failed to load live trends:", err);
    return getMockTrends(locale);
  }
}
