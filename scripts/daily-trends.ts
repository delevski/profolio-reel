/**
 * Daily AI Trends pipeline.
 * Fetches 5 GitHub + 5 Hugging Face trends, summarizes with Mistral,
 * upserts Supabase, emails a Hebrew digest, and may publish one blog post.
 *
 * Mistral budget: ~3-4 calls per run (1 batched summaries+pick, 1 article, 1 Hebrew translation,
 * +1 optional cover concept), all through one rate-limit-aware client (scripts/lib/llm.ts).
 * Optional env: MISTRAL_MODEL_SUMMARY (mistral-small-latest), MISTRAL_MODEL_ARTICLE (mistral-large-latest),
 *   MISTRAL_MODEL_TRANSLATE (= article model), MISTRAL_MODEL_FALLBACK (mistral-small-latest),
 *   MISTRAL_MIN_INTERVAL_MS (2500), MISTRAL_MAX_ATTEMPTS (5), MISTRAL_TIME_BUDGET_MS (600000).
 * If Mistral stays rate-limited after its retries and ANTHROPIC_API_KEY (+ optional ANTHROPIC_MODEL) is set,
 * the same requests are served by Anthropic; without that secret nothing changes.
 * REGENERATE_DATE=YYYY-MM-DD: rebuild that existing day's post (same slug, same trend) from its digest.
 *
 * Required env: MISTRAL_API_KEY, RESEND_API_KEY (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY optional)
 * Optional: DIGEST_EMAIL, RESEND_FROM, SITE_URL, GITHUB_TOKEN (source README lookups, higher rate limit)
 * Optional cover-image provider — the first key present wins, none = branded cover drawn in code:
 *   FAL_KEY (recommended) · GEMINI_API_KEY · OPENAI_API_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { Resend } from "resend";
import {
  checkStructure,
  buildFallbackArticle,
  ensureDiagram,
  getMermaidBlocks,
  parseArticleResponse,
  restoreDiagrams,
} from "./lib/article";
import { generateCover, type CoverResult } from "./lib/cover";
import {
  LlmClient,
  LlmError,
  llmConfigFromEnv,
  mistralModelsFromEnv,
  type MistralModels,
} from "./lib/llm";
import {
  SUMMARY_SYSTEM,
  buildSummaryPrompt,
  parseSummaryResponse,
  type BatchResult,
} from "./lib/summaries";
import { readTimeString } from "../lib/reading-time";

const DIGEST_EMAIL =
  process.env.DIGEST_EMAIL?.trim() || "ordi21@walla.co.il";
const RESEND_FROM =
  process.env.RESEND_FROM ?? "AI Trends Digest <onboarding@resend.dev>";
const SITE_URL =
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://ordelwebsite.vercel.app";

const AI_KEYWORDS =
  /\b(ai|ml|llm|gpt|transformer|diffusion|neural|deep.?learning|machine.?learning|huggingface|openai|anthropic|agent|rag|embedding|inference|cuda|pytorch|tensorflow|whisper|llama|mistral|claude|gemini|vision|nlp|stable.?diffusion|flux)\b/i;

type RawTrend = {
  /** Set when the trend comes from an existing digest (REGENERATE_DATE). */
  id?: string;
  source: "github" | "huggingface";
  title: string;
  description: string;
  href: string;
  stars?: number;
  imageUrl?: string;
  /** GitHub: primary language from the trending page. */
  language?: string;
  /** Hugging Face: pipeline tag (e.g. text-generation). */
  tag?: string;
  /** Hugging Face: download count. */
  downloads?: number;
};

type EnrichedTrend = RawTrend & {
  id: string;
  summaryEn: string;
  summaryHe: string;
};

type BlogDraft = {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  content: string;
  imageUrl?: string;
  imageAlt?: string;
  coverKind?: "ai" | "generated";
  sourceHref: string;
  titleHe?: string;
  excerptHe?: string;
  contentHe?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent":
        "ordel-webside-daily-trends/1.0 (+https://ordelwebsite.vercel.app)",
      Accept: "text/html,application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${url}`);
  }
  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const text = await fetchText(url, {
    headers: { Accept: "application/json" },
  });
  return JSON.parse(text) as T;
}

async function scrapeGitHubTrending(): Promise<RawTrend[]> {
  const html = await fetchText("https://github.com/trending?since=daily");
  const $ = cheerio.load(html);
  const trends: RawTrend[] = [];

  $("article.Box-row").each((_, el) => {
    const article = $(el);
    const hrefPath = article.find("h2 a").attr("href")?.trim();
    if (!hrefPath) return;

    const title = hrefPath.replace(/^\//, "").replace(/\s+/g, "");
    const description =
      article.find("p").first().text().trim() || "Trending GitHub repository";
    const starsText = article
      .find("a[href$='/stargazers']")
      .first()
      .text()
      .replace(/,/g, "")
      .trim();
    const stars = Number.parseInt(starsText, 10);
    const language =
      article.find("[itemprop='programmingLanguage']").first().text().trim() || undefined;

    const blob = `${title} ${description}`;
    if (!AI_KEYWORDS.test(blob)) return;

    trends.push({
      source: "github",
      title,
      description,
      href: `https://github.com${hrefPath}`,
      stars: Number.isFinite(stars) ? stars : undefined,
      imageUrl: `https://opengraph.githubassets.com/1${hrefPath}`,
      language,
    });
  });

  // If the AI filter is too strict, fall back to top repos by stars.
  if (trends.length < 5) {
    $("article.Box-row").each((_, el) => {
      if (trends.length >= 5) return;
      const article = $(el);
      const hrefPath = article.find("h2 a").attr("href")?.trim();
      if (!hrefPath) return;
      const title = hrefPath.replace(/^\//, "").replace(/\s+/g, "");
      if (trends.some((t) => t.title === title)) return;
      const description =
        article.find("p").first().text().trim() || "Trending GitHub repository";
      const starsText = article
        .find("a[href$='/stargazers']")
        .first()
        .text()
        .replace(/,/g, "")
        .trim();
      const stars = Number.parseInt(starsText, 10);
      trends.push({
        source: "github",
        title,
        description,
        href: `https://github.com${hrefPath}`,
        stars: Number.isFinite(stars) ? stars : undefined,
        imageUrl: `https://opengraph.githubassets.com/1${hrefPath}`,
        language: article.find("[itemprop='programmingLanguage']").first().text().trim() || undefined,
      });
    });
  }

  return trends.slice(0, 5);
}

async function fetchHuggingFaceTrending(): Promise<RawTrend[]> {
  type HfTrendingItem = {
    repoType?: string;
    repoData?: {
      id?: string;
      likes?: number;
      downloads?: number;
      pipeline_tag?: string;
    };
  };

  const payload = await fetchJson<{ recentlyTrending?: HfTrendingItem[] }>(
    "https://huggingface.co/api/trending?type=model&limit=20"
  );

  const models = (payload.recentlyTrending ?? [])
    .filter(
      (item) => item.repoType === "model" && Boolean(item.repoData?.id)
    )
    .slice(0, 5);

  if (models.length === 0) {
    // Fallback: most-liked models if trending payload shape changes
    type HfModel = {
      id: string;
      likes?: number;
      downloads?: number;
      pipeline_tag?: string;
    };
    const liked = await fetchJson<HfModel[]>(
      "https://huggingface.co/api/models?sort=likes&direction=-1&limit=5"
    );
    return liked.map((model) => {
      const tag = model.pipeline_tag ? ` (${model.pipeline_tag})` : "";
      return {
        source: "huggingface" as const,
        title: model.id,
        description: `Trending Hugging Face model${tag}. Likes: ${model.likes ?? 0}, downloads: ${model.downloads ?? 0}.`,
        href: `https://huggingface.co/${model.id}`,
        stars: model.likes,
        imageUrl: `https://cdn-thumbnails.huggingface.co/social-thumbnails/models/${model.id}.png`,
        tag: model.pipeline_tag,
        downloads: model.downloads,
      };
    });
  }

  return models.map((item) => {
    const model = item.repoData!;
    const id = model.id!;
    const tag = model.pipeline_tag ? ` (${model.pipeline_tag})` : "";
    return {
      source: "huggingface" as const,
      title: id,
      description: `Trending Hugging Face model${tag}. Likes: ${model.likes ?? 0}, downloads: ${model.downloads ?? 0}.`,
      href: `https://huggingface.co/${id}`,
      stars: model.likes,
      imageUrl: `https://cdn-thumbnails.huggingface.co/social-thumbnails/models/${id}.png`,
      tag: model.pipeline_tag,
      downloads: model.downloads,
    };
  });
}

/** Tracks why-not for the logs: which steps were skipped to protect the article + translation. */
const TRANSLATE_RESERVE_MS = 150_000;
const OPTIONAL_STEP_COST_MS = 60_000;

/** The configured model itself was refused (unknown model / no access), as opposed to a rate limit. */
function modelUnavailable(err: unknown): boolean {
  return err instanceof LlmError && err.kind === "http" && [400, 403, 404].includes(err.status ?? 0);
}

function fallbackSummaryHe(title: string): string {
  return `טרנד חדש: ${title}. כדאי לעקוב אחרי העדכון הזה.`;
}

/**
 * ONE call (JSON out) for all per-trend summaries and, when `wantPick`, the trend-of-the-day pick.
 * On any failure every trend keeps its raw description and the pick falls back to the first uncovered one.
 */
async function enrichTrends(
  client: LlmClient,
  models: MistralModels,
  trends: RawTrend[],
  day: string,
  covered: Set<string>,
  wantPick: boolean
): Promise<{ trends: EnrichedTrend[]; pick: number | null }> {
  const inputs = trends.map((t) => ({ ...t, covered: covered.has(t.href) }));
  let parsed: BatchResult | null = null;
  for (let attempt = 1; attempt <= 2 && !parsed; attempt++) {
    try {
      const raw = await client.chat(SUMMARY_SYSTEM, buildSummaryPrompt(inputs, { pick: wantPick }), {
        model: models.summary,
        // 10 trends x (EN + HE sentence) — Hebrew is token-hungry, leave headroom.
        maxTokens: 3500,
        temperature: 0.3,
        json: true,
        // The article and its translation come first: never spend their time on summaries.
        reserveMs: TRANSLATE_RESERVE_MS * 2,
        label: `summaries(${attempt})`,
      });
      parsed = parseSummaryResponse(raw, trends.length);
    } catch (err) {
      console.warn(
        `Batched summaries attempt ${attempt} failed:`,
        err instanceof Error ? err.message : err
      );
      // HTTP errors were already retried with backoff inside the client; only a malformed answer is worth one more call.
      if (err instanceof LlmError) break;
    }
  }

  const enriched = trends.map((trend, index): EnrichedTrend => {
    const item = parsed?.items[index];
    return {
      ...trend,
      id: trend.id ?? `${day}-${trend.source}-${index + 1}`,
      summaryEn: item?.summaryEn || trend.description,
      summaryHe: item?.summaryHe || fallbackSummaryHe(trend.title),
    };
  });
  const got = parsed?.items.filter(Boolean).length ?? 0;
  console.log(`Summaries: ${got}/${trends.length} from the model (1 batched call${got < trends.length ? ", rest use fallback text" : ""}).`);
  return { trends: enriched, pick: parsed?.pick ?? null };
}

async function upsertTrends(
  supabase: SupabaseClient,
  day: string,
  trends: EnrichedTrend[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("trends")
    .delete()
    .eq("day", day);
  if (deleteError) throw new Error(`Supabase delete trends: ${deleteError.message}`);

  const rows = trends.map((t) => ({
    id: t.id,
    day,
    source: t.source,
    title: t.title,
    description: t.summaryEn,
    href: t.href,
    stars: t.stars ?? null,
    image_url: t.imageUrl ?? null,
    summary_he: t.summaryHe,
  }));

  const { error: insertError } = await supabase.from("trends").insert(rows);
  if (insertError) throw new Error(`Supabase insert trends: ${insertError.message}`);
}

async function getCoveredHrefs(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase.from("auto_posts").select("source_href");
  if (error) throw new Error(`Supabase read auto_posts: ${error.message}`);
  return new Set((data ?? []).map((row) => row.source_href as string));
}

async function pickAndWriteBlog(
  client: LlmClient,
  models: MistralModels,
  trends: EnrichedTrend[],
  covered: Set<string>,
  options: { pick: number | null; forcedHref?: string; forcedSlug?: string; day: string }
): Promise<BlogDraft | null> {
  const candidates = trends.filter((t) => !covered.has(t.href));
  const forced = options.forcedHref ? trends.find((t) => t.href === options.forcedHref) : undefined;
  if (!forced && candidates.length === 0) return null;

  // The pick came with the batched summaries (no extra call).
  const picked = options.pick !== null ? trends[options.pick] : undefined;
  const chosen = forced ?? (picked && !covered.has(picked.href) ? picked : candidates[0]);
  if (!forced && !picked) console.warn("No usable trend pick from the model — defaulting to the first uncovered trend.");

  // Ground the article in the project's own README / model card, not only a one-line summary.
  const material = await fetchSourceMaterial(chosen);
  const day = options.day;

  const articleSystem =
    "You are a senior engineer writing a long-form article for a personal AI/engineering blog. " +
    "Be clear, concrete and calm — no hype, no marketing language. " +
    "Use ONLY facts present in the SOURCE MATERIAL. Never invent features, numbers, benchmarks, versions, " +
    "licenses or quotes; when a detail is not in the material, say to check the README instead. " +
    "Return plain markdown in the exact response format requested — no JSON.";
  const articlePrompt = `Write a real article about this trending project.

Name: ${chosen.title}
Source: ${chosen.source}
URL: ${chosen.href}
${chosen.language ? `Language: ${chosen.language}\n` : ""}${chosen.tag ? `Task type: ${chosen.tag}\n` : ""}${typeof chosen.stars === "number" ? `${chosen.source === "github" ? "Stars" : "Likes"}: ${chosen.stars}\n` : ""}Summary: ${chosen.summaryEn}

SOURCE MATERIAL (README / model card excerpt):
"""
${material || "(not available — rely on the summary above and stay general)"}
"""

Response format — exactly this, nothing before it:
TITLE: an engaging but factual title (no clickbait)
EXCERPT: 1-2 sentence teaser
---
(markdown article body)

Article requirements:
- 800-1100 words when the material supports it; never pad with filler.
- Start with a short intro paragraph (no heading before it), then these ## sections in order:
  ## Why it matters
  ## How it works
  ## How to try it
  ## Who it's for (and limits)
  ## Links
- Use ### sub-headings inside "How it works" where useful. Short paragraphs, bullet lists where natural.
- "How to try it": real install/usage steps ONLY if they appear in the material, in a fenced code block; otherwise say where to look in the README.
- "How it works" MUST include exactly one \`\`\`mermaid diagram (flowchart TD, top-down, 5-9 nodes, short English labels in double quotes) showing the architecture or flow of the project, based only on the material.
- "Links" lists the repo/model URL (${chosen.href}) and the README/docs if known.
- Do not use first-person claims of having tested it.`;

  // Priority 1: the article. Keep enough budget in reserve for priority 2 (the translation).
  let parsed: ReturnType<typeof parseArticleResponse> = null;
  // A rate-limit failure was already retried with backoff inside the client, so a second draft is only
  // worth a call when the answer was malformed (same model) or the model itself is unavailable (smaller model).
  let articleModel = models.article;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const raw = await client.chat(articleSystem, articlePrompt, {
        model: articleModel,
        maxTokens: 4500,
        temperature: attempt === 0 ? 0.4 : 0.2,
        reserveMs: TRANSLATE_RESERVE_MS,
        label: `article(${attempt + 1})`,
      });
      const candidate = parseArticleResponse(raw);
      if (candidate && checkStructure(candidate.content).words >= 250) parsed = candidate;
      else console.warn(`Article draft #${attempt + 1} was unusable (format/length) — ${attempt === 0 ? "retrying" : "using fallback"}.`);
    } catch (err) {
      console.warn(
        `Article draft #${attempt + 1} failed:`,
        err instanceof Error ? err.message : err
      );
      if (modelUnavailable(err) && articleModel !== models.fallback) articleModel = models.fallback;
      else break;
    }
  }

  let title: string;
  let excerpt: string;
  let rawContent: string;
  if (parsed) {
    title = parsed.title.trim();
    excerpt = parsed.excerpt?.trim() || chosen.summaryEn;
    rawContent = parsed.content;
  } else {
    // Still a real, structured article: built from the README / model card we already fetched.
    const fb = buildFallbackArticle({
      title: chosen.title,
      href: chosen.href,
      source: chosen.source,
      summary: chosen.summaryEn,
      language: chosen.language,
      tag: chosen.tag,
      stars: chosen.stars,
      downloads: chosen.downloads,
      material,
    });
    console.warn("Using the README-based fallback article (the model did not deliver one).");
    title = fb.title;
    excerpt = fb.excerpt;
    rawContent = fb.content;
  }
  const slugBase = slugify(title) || slugify(chosen.title) || "ai-trend";
  const slug = options.forcedSlug ?? `${day}-${slugBase}`.slice(0, 100);

  const withDiagram = ensureDiagram(rawContent, "en");
  if (withDiagram.added) console.warn("Article had no valid Mermaid diagram — inserted the generic evaluation flow.");
  const structure = checkStructure(withDiagram.content);
  console.log(`Article: ${structure.words} words, ${structure.h2} sections, ${structure.mermaid} diagram(s)${parsed ? "" : " [fallback]"}.`);

  const result: BlogDraft = {
    slug,
    title,
    excerpt,
    readTime: readTimeString(withDiagram.content, "en"),
    content: withDiagram.content,
    imageUrl: chosen.imageUrl,
    sourceHref: chosen.href,
  };

  // Priority 2: the Hebrew version (also for a fallback article) — diagrams are copied from the
  // English article, never re-typed by the model.
  const translateSystem =
    "You translate English tech-blog articles to natural, simple Hebrew. Keep product names, code, URLs and markdown structure (every heading, list and table) unchanged. Copy every ```mermaid block exactly as it is. Return plain markdown in the requested format — no JSON.";
  const translatePrompt = `Translate this article to Hebrew.

Response format — exactly this, nothing before it:
TITLE: Hebrew title
EXCERPT: Hebrew excerpt
---
(Hebrew markdown body)

English title: ${result.title}
English excerpt: ${result.excerpt}
English body:
${result.content}`;
  let translateModel = models.translate;
  for (let i = 0; i < 2; i++) {
    try {
      const heRaw = await client.chat(translateSystem, translatePrompt, {
        model: translateModel,
        maxTokens: 6000,
        temperature: 0.2,
        label: `translation(${i + 1})`,
      });
      const he = parseArticleResponse(heRaw);
      if (!he) throw new Error("Hebrew translation did not follow the response format");
      result.titleHe = he.title;
      result.excerptHe = he.excerpt || he.title;
      result.contentHe = restoreDiagrams(he.content, getMermaidBlocks(result.content));
      break;
    } catch (err) {
      // One more try: a malformed answer (same model) or an unavailable model (smaller model).
      // A rate limit was already retried with backoff inside the client.
      const malformed = !(err instanceof LlmError);
      const retry = i === 0 && (malformed || (modelUnavailable(err) && translateModel !== models.fallback));
      console.warn(
        retry ? "Hebrew translation failed — trying once more." : "Hebrew translation failed — post will be English-only.",
        err instanceof Error ? err.message : err
      );
      if (!retry) break;
      if (!malformed) translateModel = models.fallback;
    }
  }

  // Optional (last): art direction for an AI cover. Skipped when the budget is low — the branded
  // cover drawn in code needs no model call. Never throws.
  let concept: string | undefined;
  if (process.env.FAL_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
    if (!client.canAfford(OPTIONAL_STEP_COST_MS)) {
      console.warn("Skipping the cover-concept call: not enough Mistral time budget left (the default concept is used).");
    } else {
      try {
        concept = (
          await client.chat(
            "You are an art director. Reply with ONE sentence only.",
            `Describe one abstract visual metaphor (shapes, light, structure — no text, no logos, no people, no screenshots) for an editorial illustration of this article.\nTitle: ${result.title}\nSummary: ${chosen.summaryEn}`,
            { model: models.summary, maxTokens: 80, temperature: 0.7, label: "cover-concept" }
          )
        ).split("\n")[0].slice(0, 300);
      } catch {
        /* the prompt builder has its own default concept */
      }
    }
  }
  let cover: CoverResult | null = null;
  try {
    cover = await generateCover({
      slug,
      title: result.title,
      excerpt: result.excerpt,
      date: day,
      concept,
    });
  } catch (err) {
    console.warn("Cover step crashed (ignored):", err instanceof Error ? err.message : err);
  }
  if (cover) {
    result.imageUrl = cover.publicPath;
    result.imageAlt = cover.alt;
    result.coverKind = cover.kind;
  } else {
    result.imageAlt = `Illustration for ${result.title}`;
  }

  return result;
}

/** README (GitHub) or model card (Hugging Face), trimmed — the article's only source of facts. */
async function fetchSourceMaterial(trend: EnrichedTrend): Promise<string> {
  try {
    const url = new URL(trend.href);
    let readmeUrl: string | null = null;
    const headers: Record<string, string> = { "User-Agent": "profolio-daily-trends" };
    if (url.hostname === "github.com") {
      const [owner, repo] = url.pathname.split("/").filter(Boolean);
      if (owner && repo) {
        readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
        headers.Accept = "application/vnd.github.raw+json";
        if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }
    } else if (url.hostname === "huggingface.co") {
      readmeUrl = `https://huggingface.co${url.pathname}/raw/main/README.md`;
    }
    if (!readmeUrl) return "";
    const res = await fetch(readmeUrl, { headers, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text())
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/<img[^>]*>/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text.slice(0, 9000);
  } catch (err) {
    console.warn(
      "Could not fetch the project README (continuing with the summary only):",
      err instanceof Error ? err.message : err
    );
    return "";
  }
}

async function insertAutoPost(
  supabase: SupabaseClient,
  day: string,
  draft: BlogDraft,
  replace = false
): Promise<void> {
  if (replace) {
    const { error: delError } = await supabase.from("auto_posts").delete().eq("slug", draft.slug);
    if (delError) throw new Error(`Supabase delete auto_posts: ${delError.message}`);
  }
  const { error } = await supabase.from("auto_posts").insert({
    slug: draft.slug,
    title: draft.title,
    excerpt: draft.excerpt,
    date: day,
    read_time: draft.readTime,
    tags: ["AI Trend Digest"],
    image_url: draft.imageUrl ?? null,
    content: draft.content,
    source_href: draft.sourceHref,
    lang: "EN",
    title_he: draft.titleHe ?? null,
    excerpt_he: draft.excerptHe ?? null,
    content_he: draft.contentHe ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      console.warn("Auto-post already exists (dedupe), skipping insert.");
      return;
    }
    throw new Error(`Supabase insert auto_posts: ${error.message}`);
  }
}

function writeTrendsToFiles(trends: EnrichedTrend[]): void {
  const out = trends.map((t) => ({
    id: t.id,
    title: t.title,
    source: t.source === "github" ? "GitHub" : "Hugging Face",
    description: {
      en: t.summaryEn,
      he: t.summaryHe,
    },
    href: t.href,
    stars: t.stars,
    imageUrl: t.imageUrl,
  }));
  const filePath = path.join(process.cwd(), "content", "trends.json");
  fs.writeFileSync(filePath, `${JSON.stringify(out, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${out.length} trends → ${filePath}`);
}

/**
 * One file per day: content/ai-trends/YYYY-MM-DD.json — read at build time by the
 * /ai-trends page (schema: docs/daily-trends.md). The workflow commits it to main.
 */
function writeDigestFile(
  day: string,
  trends: EnrichedTrend[],
  blog: BlogDraft | null
): void {
  const digest: { date: string; trendOfTheDay: unknown; items: unknown[] } = {
    date: day,
    trendOfTheDay: blog
      ? {
          slug: blog.slug,
          title: blog.title,
          ...(blog.titleHe ? { titleHe: blog.titleHe } : {}),
          excerpt: blog.excerpt,
          ...(blog.excerptHe ? { excerptHe: blog.excerptHe } : {}),
          sourceHref: blog.sourceHref,
          ...(blog.imageUrl?.startsWith("/") ? { image: blog.imageUrl, imageAlt: blog.imageAlt } : {}),
        }
      : null,
    items: trends.map((t) => ({
      id: t.id,
      source: t.source,
      title: t.title,
      href: t.href,
      stars: t.stars ?? null,
      ...(t.language ? { language: t.language } : {}),
      ...(t.tag ? { tag: t.tag } : {}),
      ...(typeof t.downloads === "number" ? { downloads: t.downloads } : {}),
      imageUrl: t.imageUrl ?? null,
      summary: { en: t.summaryEn, he: t.summaryHe },
    })),
  };
  const dir = path.join(process.cwd(), "content", "ai-trends");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${day}.json`);
  // A second run on the same day finds today's post already covered (blog = null):
  // keep the trend of the day the first run chose instead of erasing it.
  if (!digest.trendOfTheDay && fs.existsSync(filePath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (prev?.trendOfTheDay) digest.trendOfTheDay = prev.trendOfTheDay;
    } catch {
      /* unreadable previous file: write fresh */
    }
  }
  fs.writeFileSync(filePath, `${JSON.stringify(digest, null, 2)}\n`, "utf-8");
  console.log(`Wrote digest → ${filePath}`);
}

function getCoveredHrefsFromMdx(): Set<string> {
  const dir = path.join(process.cwd(), "content", "blog");
  const covered = new Set<string>();
  if (!fs.existsSync(dir)) return covered;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const match = raw.match(/^sourceHref:\s*["']?([^"'\n]+)["']?/m);
    if (match?.[1]) covered.add(match[1].trim());
    // Also treat existing posts as covered if they link the same URL in content
    for (const url of raw.matchAll(/https?:\/\/[^\s)"']+/g)) {
      if (
        url[0].includes("github.com/") ||
        url[0].includes("huggingface.co/")
      ) {
        covered.add(url[0]);
      }
    }
  }
  return covered;
}

function writeBlogToMdx(day: string, draft: BlogDraft, overwrite = false): void {
  const filePath = path.join(
    process.cwd(),
    "content",
    "blog",
    `${draft.slug}.mdx`
  );
  if (fs.existsSync(filePath) && !overwrite) {
    console.warn(`MDX already exists, skipping: ${filePath}`);
    return;
  }
  const frontmatter = `---
title: ${JSON.stringify(draft.title)}
excerpt: ${JSON.stringify(draft.excerpt)}
date: "${day}"
readTime: ${JSON.stringify(draft.readTime)}
tags: ["AI Trend Digest"]
lang: "EN"
imageUrl: ${JSON.stringify(draft.imageUrl ?? "")}
imageAlt: ${JSON.stringify(draft.imageAlt ?? draft.title)}
coverKind: ${JSON.stringify(draft.coverKind ?? "source")}
sourceHref: ${JSON.stringify(draft.sourceHref)}
---

${draft.content.trim()}
`;
  fs.writeFileSync(filePath, `${frontmatter}\n`, "utf-8");
  console.log(`Wrote blog post → ${filePath}`);

  if (draft.titleHe && draft.contentHe) {
    const heDir = path.join(process.cwd(), "content", "blog", "he");
    fs.mkdirSync(heDir, { recursive: true });
    const hePath = path.join(heDir, `${draft.slug}.mdx`);
    const heFrontmatter = `---
title: ${JSON.stringify(draft.titleHe)}
excerpt: ${JSON.stringify(draft.excerptHe ?? draft.titleHe)}
---

${draft.contentHe.trim()}
`;
    fs.writeFileSync(hePath, `${heFrontmatter}\n`, "utf-8");
    console.log(`Wrote Hebrew blog post → ${hePath}`);
  }
}

function buildDigestHtml(
  day: string,
  trends: EnrichedTrend[],
  blog: BlogDraft | null
): string {
  const items = trends
    .map(
      (t) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${t.source}</div>
          <div style="font-size:16px;font-weight:700;color:#111827;margin:4px 0;">${escapeHtml(t.title)}</div>
          <div style="font-size:14px;line-height:1.5;color:#374151;direction:rtl;text-align:right;">${escapeHtml(t.summaryHe)}</div>
          <a href="${t.href}" style="display:inline-block;margin-top:8px;font-size:13px;color:#4f46e5;text-decoration:none;">קישור ←</a>
        </td>
      </tr>`
    )
    .join("");

  const highlight = blog
    ? `<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px;margin:20px 0;direction:rtl;text-align:right;">
        <div style="font-size:12px;color:#4338ca;font-weight:700;">הטרנד החשוב של היום</div>
        <div style="font-size:18px;font-weight:700;color:#111827;margin:6px 0;">${escapeHtml(blog.title)}</div>
        <div style="font-size:14px;color:#374151;margin-bottom:10px;">${escapeHtml(blog.excerpt)}</div>
        <a href="${SITE_URL}/en/blog/${blog.slug}" style="color:#4f46e5;font-weight:600;text-decoration:none;">לקריאת הפוסט באנגלית ←</a>
      </div>`
    : `<div style="background:#f3f4f6;border-radius:12px;padding:14px;margin:20px 0;direction:rtl;text-align:right;font-size:14px;color:#374151;">
        היום לא פרסמתי פוסט חדש — כל 10 הטרנדים כבר כוסו קודם.
      </div>`;

  return `<!doctype html>
<html lang="he" dir="rtl">
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e5e7eb;">
          <tr>
            <td style="direction:rtl;text-align:right;">
              <div style="font-size:12px;color:#6b7280;">AI Trends Daily · ${day}</div>
              <h1 style="margin:8px 0 4px;font-size:24px;color:#111827;">סיכום יומי קצר ופשוט</h1>
              <p style="margin:0 0 8px;font-size:15px;color:#4b5563;line-height:1.6;">
                5 טרנדים מ-GitHub + 5 מ-Hugging Face, בעברית פשוטה — בלי ז'argon מיותר.
              </p>
              ${highlight}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${items}
              </table>
              <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
                נשלח אוטומטית מ-${escapeHtml(SITE_URL)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendDigestEmail(
  resendKey: string,
  day: string,
  trends: EnrichedTrend[],
  blog: BlogDraft | null
): Promise<void> {
  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: DIGEST_EMAIL,
    subject: `AI Trends יומי · ${day}`,
    html: buildDigestHtml(day, trends, blog),
  });
  if (error) throw new Error(`Resend digest failed: ${error.message}`);
}

async function sendFailureEmail(
  resendKey: string | undefined,
  message: string
): Promise<void> {
  if (!resendKey) {
    console.error("No RESEND_API_KEY; cannot send failure alert.");
    return;
  }
  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: RESEND_FROM,
      to: DIGEST_EMAIL,
      subject: "❌ AI Trends daily pipeline failed",
      html: `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap;padding:16px;">${escapeHtml(message)}</pre>`,
    });
  } catch (err) {
    console.error("Failure-alert email also failed:", err);
  }
}

type StoredDigest = {
  date: string;
  trendOfTheDay?: { slug?: string; sourceHref?: string } | null;
  items: {
    id?: string;
    source: "github" | "huggingface";
    title: string;
    href: string;
    stars?: number | null;
    language?: string;
    tag?: string;
    downloads?: number;
    imageUrl?: string | null;
    summary?: { en?: string; he?: string };
  }[];
};

/** REGENERATE_DATE (YYYY-MM-DD) or null. Throws on a malformed value so a typo never rebuilds the wrong day. */
function regenerateDate(): string | null {
  const value = process.env.REGENERATE_DATE?.trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`REGENERATE_DATE must look like 2026-11-10, got "${value}"`);
  }
  return value;
}

function readStoredDigest(day: string): StoredDigest {
  const file = path.join(process.cwd(), "content", "ai-trends", `${day}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`REGENERATE_DATE=${day}, but ${file} does not exist — nothing to regenerate.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf-8")) as StoredDigest;
}

function rawFromDigest(digest: StoredDigest): RawTrend[] {
  return digest.items.map((i) => ({
    id: i.id,
    source: i.source,
    title: i.title,
    description: i.summary?.en || i.title,
    href: i.href,
    stars: typeof i.stars === "number" ? i.stars : undefined,
    imageUrl: i.imageUrl ?? undefined,
    language: i.language,
    tag: i.tag,
    downloads: i.downloads,
  }));
}

async function main(): Promise<void> {
  const mistralKey = requireEnv("MISTRAL_API_KEY");
  const resendKey = requireEnv("RESEND_API_KEY");
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const useSupabase = Boolean(supabaseUrl && supabaseKey);

  const supabase = useSupabase
    ? createClient(supabaseUrl!, supabaseKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  if (!useSupabase) {
    console.warn(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — writing trends + blog to content/ files (deployable fallback)."
    );
  }

  const regenDay = regenerateDate();
  const day = regenDay ?? todayIso();
  console.log(regenDay ? `Regenerating the post for ${day} from its stored digest` : `Daily trends pipeline starting for ${day}`);

  let raw: RawTrend[];
  let stored: StoredDigest | null = null;
  if (regenDay) {
    // The trending pages have moved on: rebuild from the digest that day's run saved.
    stored = readStoredDigest(regenDay);
    raw = rawFromDigest(stored);
  } else {
    const [github, huggingface] = await Promise.all([
      scrapeGitHubTrending(),
      fetchHuggingFaceTrending(),
    ]);
    console.log(`Fetched GitHub=${github.length} HF=${huggingface.length}`);
    raw = [...github, ...huggingface];
  }
  if (raw.length === 0) {
    throw new Error("No trends fetched from GitHub or Hugging Face");
  }

  // Regenerating deliberately overwrites the day's own post, so nothing counts as "already covered".
  const covered: Set<string> = regenDay
    ? new Set<string>()
    : supabase
      ? await getCoveredHrefs(supabase)
      : getCoveredHrefsFromMdx();

  const client = new LlmClient(llmConfigFromEnv(process.env, mistralKey));
  const models = mistralModelsFromEnv(process.env);
  console.log(
    `LLM client: models summary=${models.summary} article=${models.article} translate=${models.translate}; ` +
      `spacing ${client.cfg.minIntervalMs} ms, ${client.cfg.maxAttempts} attempts, budget ${Math.round(client.cfg.budgetMs / 1000)} s; ` +
      (client.hasFallback ? `Anthropic fallback on (${client.cfg.anthropic?.model}).` : "no Anthropic fallback (ANTHROPIC_API_KEY not set).")
  );

  const forcedHref = stored?.trendOfTheDay?.sourceHref;
  const forcedSlug = forcedHref && raw.some((t) => t.href === forcedHref) ? stored?.trendOfTheDay?.slug : undefined;
  const wantPick = !forcedSlug;
  const enrichedResult = await enrichTrends(client, models, raw, day, covered, wantPick);
  const trends = enrichedResult.trends;

  const blog = await pickAndWriteBlog(client, models, trends, covered, {
    pick: enrichedResult.pick,
    forcedHref: forcedSlug ? forcedHref : undefined,
    forcedSlug,
    day,
  });
  console.log(
    `LLM usage: ${client.stats.calls} call(s) = ${client.stats.served.mistral} by Mistral + ${client.stats.served.anthropic} by Anthropic; ` +
      `${client.stats.requests} request(s), ${client.stats.retries} retr${client.stats.retries === 1 ? "y" : "ies"}, ${client.stats.rateLimited} rate-limited.`
  );

  if (supabase) {
    await upsertTrends(supabase, day, trends);
    console.log(`Upserted ${trends.length} trends for ${day}`);
  } else {
    // Regenerating an older day must not replace the home-page list of today's trends.
    const newerDigest = regenDay
      ? fs.readdirSync(path.join(process.cwd(), "content", "ai-trends")).some((f) => f.endsWith(".json") && f.slice(0, 10) > regenDay)
      : false;
    if (newerDigest) console.log("Skipping content/trends.json — a newer digest exists.");
    else writeTrendsToFiles(trends);
  }

  if (blog) {
    if (supabase) {
      await insertAutoPost(supabase, day, blog, Boolean(regenDay));
      console.log(`Published auto-post: ${blog.slug}`);
    } else {
      writeBlogToMdx(day, blog, Boolean(regenDay));
    }
  } else {
    console.log("Skipped blog post — all trends already covered.");
  }

  writeDigestFile(day, trends, blog);

  if (regenDay) {
    console.log("Regeneration run: not re-sending the digest email.");
    return;
  }

  try {
    await sendDigestEmail(resendKey, day, trends, blog);
    console.log(`Digest emailed to ${DIGEST_EMAIL}`);
  } catch (err) {
    // Content is already persisted — email should not block deployable output.
    console.error(
      "Digest email failed (content still saved):",
      err instanceof Error ? err.message : err
    );
  }
}

main().catch(async (err) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error(message);
  await sendFailureEmail(process.env.RESEND_API_KEY, message);
  process.exit(1);
});
