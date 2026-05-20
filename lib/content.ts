import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Locale } from "./i18n/config";
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

export function getBlogPosts(): MdxDoc[] {
  return getMdxDocs("blog");
}

export function getBlogPost(slug: string): MdxDoc | undefined {
  return getBlogPosts().find((p) => p.slug === slug);
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

