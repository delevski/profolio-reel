import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Locale } from "./i18n/config";
import { getSupabase, type DbAutoPost, type DbTrend } from "./supabase";
import type {
  App,
  Course,
  LocalizedString,
  MdxDoc,
  Project,
  ProjectView,
  SiteConfig,
  Testimonial,
  Trend,
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
        content,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function mapAutoPost(row: DbAutoPost): MdxDoc {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    date: row.date,
    readTime: row.read_time,
    tags: row.tags ?? ["AI Trend Digest"],
    lang: row.lang ?? "EN",
    content: row.content,
    imageUrl: row.image_url ?? undefined,
    sourceHref: row.source_href,
  };
}

async function getAutoPosts(): Promise<MdxDoc[]> {
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

    return (data as DbAutoPost[]).map(mapAutoPost);
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

export function getCourses(): Course[] {
  return readJson<Course[]>("courses.json");
}

export function getVideos(): Video[] {
  return readJson<Video[]>("videos.json");
}

export function getTestimonials(): Testimonial[] {
  return readJson<Testimonial[]>("testimonials.json");
}

/** MDX blog posts from the filesystem (sync). */
export function getMdxBlogPosts(): MdxDoc[] {
  return getMdxDocs("blog");
}

/** Merged MDX + Supabase auto-posts, newest first. */
export async function getBlogPosts(): Promise<MdxDoc[]> {
  const [mdx, auto] = await Promise.all([
    Promise.resolve(getMdxBlogPosts()),
    getAutoPosts(),
  ]);

  const bySlug = new Map<string, MdxDoc>();
  for (const post of [...mdx, ...auto]) {
    if (!bySlug.has(post.slug)) bySlug.set(post.slug, post);
  }

  return [...bySlug.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getBlogPost(slug: string): Promise<MdxDoc | undefined> {
  const mdx = getMdxBlogPosts().find((p) => p.slug === slug);
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
    return mapAutoPost(data as DbAutoPost);
  } catch {
    return undefined;
  }
}

export function getLearnGuides(): MdxDoc[] {
  return getMdxDocs("learn");
}

export function getLearnGuide(slug: string): MdxDoc | undefined {
  return getLearnGuides().find((g) => g.slug === slug);
}

export function getMockTrends(): Trend[] {
  return readJson<Trend[]>("trends.json");
}

function mapDbTrend(row: DbTrend): Trend {
  return {
    id: row.id,
    title: row.title,
    source: row.source === "github" ? "GitHub" : "Hugging Face",
    description: row.description,
    href: row.href,
    stars: row.stars ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

/** Latest day's trends from Supabase, or mock JSON fallback. */
export async function getLiveTrends(): Promise<Trend[]> {
  const supabase = getSupabase();
  if (!supabase) return getMockTrends();

  try {
    const { data: latestRows, error: latestError } = await supabase
      .from("trends")
      .select("day")
      .order("day", { ascending: false })
      .limit(1);

    if (latestError || !latestRows?.length) return getMockTrends();

    const day = latestRows[0].day as string;
    const { data, error } = await supabase
      .from("trends")
      .select("*")
      .eq("day", day)
      .order("source", { ascending: true })
      .order("title", { ascending: true });

    if (error || !data?.length) return getMockTrends();
    return (data as DbTrend[]).map(mapDbTrend);
  } catch (err) {
    console.error("Failed to load live trends:", err);
    return getMockTrends();
  }
}
