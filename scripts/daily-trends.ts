/**
 * Daily AI Trends pipeline.
 * Fetches 5 GitHub + 5 Hugging Face trends, summarizes with Mistral,
 * upserts Supabase, emails a Hebrew digest, and may publish one blog post.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MISTRAL_API_KEY, RESEND_API_KEY
 * Optional: DIGEST_EMAIL, RESEND_FROM, SITE_URL
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { Resend } from "resend";

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
  source: "github" | "huggingface";
  title: string;
  description: string;
  href: string;
  stars?: number;
  imageUrl?: string;
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
  sourceHref: string;
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

    const blob = `${title} ${description}`;
    if (!AI_KEYWORDS.test(blob)) return;

    trends.push({
      source: "github",
      title,
      description,
      href: `https://github.com${hrefPath}`,
      stars: Number.isFinite(stars) ? stars : undefined,
      imageUrl: `https://opengraph.githubassets.com/1${hrefPath}`,
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
    };
  });
}

async function mistralChat(
  apiKey: string,
  system: string,
  user: string
): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mistral API ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Mistral returned empty content");
  return content;
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Could not find JSON object in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function enrichTrends(
  apiKey: string,
  trends: RawTrend[]
): Promise<EnrichedTrend[]> {
  const enriched: EnrichedTrend[] = [];

  for (const [index, trend] of trends.entries()) {
    const prompt = `Summarize this AI trend for a portfolio digest.

Source: ${trend.source}
Title: ${trend.title}
Description: ${trend.description}
URL: ${trend.href}

Return ONLY JSON:
{
  "summaryEn": "1-2 clear English sentences for the website card",
  "summaryHe": "1-2 short Hebrew sentences, simple language for beginners (for dummies)"
}`;

    try {
      const raw = await mistralChat(
        apiKey,
        "You write short plain-language AI trend summaries. Return valid JSON only.",
        prompt
      );
      const parsed = extractJsonObject(raw) as {
        summaryEn?: string;
        summaryHe?: string;
      };
      enriched.push({
        ...trend,
        id: `${todayIso()}-${trend.source}-${index + 1}`,
        summaryEn: parsed.summaryEn?.trim() || trend.description,
        summaryHe:
          parsed.summaryHe?.trim() ||
          `טרנד חדש: ${trend.title}. כדאי לעקוב אחרי העדכון הזה.`,
      });
    } catch {
      enriched.push({
        ...trend,
        id: `${todayIso()}-${trend.source}-${index + 1}`,
        summaryEn: trend.description,
        summaryHe: `טרנד חדש: ${trend.title}. כדאי לעקוב אחרי העדכון הזה.`,
      });
    }
  }

  return enriched;
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
  apiKey: string,
  trends: EnrichedTrend[],
  covered: Set<string>
): Promise<BlogDraft | null> {
  const candidates = trends.filter((t) => !covered.has(t.href));
  if (candidates.length === 0) return null;

  const list = candidates
    .map(
      (t, i) =>
        `${i + 1}. [${t.source}] ${t.title} — ${t.summaryEn} (${t.href})`
    )
    .join("\n");

  let chosen = candidates[0];
  try {
    const pickRaw = await mistralChat(
      apiKey,
      "You are an AI news editor. Choose the single most important trend for a developer/portfolio audience. Return JSON only.",
      `Pick the most important trend from this list. Return ONLY JSON: {"index": <1-based number>, "why": "one English sentence"}\n\n${list}`
    );
    const pick = extractJsonObject(pickRaw) as { index?: number };
    const index = Math.max(
      1,
      Math.min(candidates.length, Number(pick.index) || 1)
    );
    chosen = candidates[index - 1];
  } catch (err) {
    console.warn(
      "Trend pick JSON parse failed — defaulting to first uncovered trend.",
      err instanceof Error ? err.message : err
    );
  }

  let draft: {
    title?: string;
    excerpt?: string;
    readTime?: string;
    content?: string;
  } = {};
  try {
    const postRaw = await mistralChat(
      apiKey,
      "You write clear English tech-blog posts for a personal AI portfolio. Use markdown. No hype. Return JSON only.",
      `Write a short blog post about this trend:

Title: ${chosen.title}
Source: ${chosen.source}
Summary: ${chosen.summaryEn}
URL: ${chosen.href}

Return ONLY JSON:
{
  "title": "engaging but factual title",
  "excerpt": "1-2 sentence teaser",
  "readTime": "4 min",
  "content": "markdown body with ## headings, 400-700 words, explain why it matters, end with a link to the source"
}`
    );
    draft = extractJsonObject(postRaw) as typeof draft;
  } catch (err) {
    console.warn(
      "Blog draft JSON parse failed — writing a simple fallback post.",
      err instanceof Error ? err.message : err
    );
  }

  const title = draft.title?.trim() || `${chosen.title}: Why It Matters`;
  const slugBase = slugify(title) || slugify(chosen.title) || "ai-trend";
  const slug = `${todayIso()}-${slugBase}`.slice(0, 100);

  return {
    slug,
    title,
    excerpt: draft.excerpt?.trim() || chosen.summaryEn,
    readTime: draft.readTime?.trim() || "5 min",
    content:
      draft.content?.trim() ||
      `## Overview\n\n${chosen.summaryEn}\n\n## Why it matters\n\nThis is one of today's most watched AI trends across ${chosen.source}. It is worth following if you build with modern models, agents, or open-source tooling.\n\n## Source\n\n[${chosen.title}](${chosen.href})\n`,
    imageUrl: chosen.imageUrl,
    sourceHref: chosen.href,
  };
}

async function insertAutoPost(
  supabase: SupabaseClient,
  day: string,
  draft: BlogDraft
): Promise<void> {
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
    description: t.summaryEn,
    href: t.href,
    stars: t.stars,
    imageUrl: t.imageUrl,
  }));
  const filePath = path.join(process.cwd(), "content", "trends.json");
  fs.writeFileSync(filePath, `${JSON.stringify(out, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${out.length} trends → ${filePath}`);
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

function writeBlogToMdx(day: string, draft: BlogDraft): void {
  const filePath = path.join(
    process.cwd(),
    "content",
    "blog",
    `${draft.slug}.mdx`
  );
  if (fs.existsSync(filePath)) {
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
sourceHref: ${JSON.stringify(draft.sourceHref)}
---

${draft.content.trim()}
`;
  fs.writeFileSync(filePath, `${frontmatter}\n`, "utf-8");
  console.log(`Wrote blog post → ${filePath}`);
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

  const day = todayIso();
  console.log(`Daily trends pipeline starting for ${day}`);

  const [github, huggingface] = await Promise.all([
    scrapeGitHubTrending(),
    fetchHuggingFaceTrending(),
  ]);

  console.log(`Fetched GitHub=${github.length} HF=${huggingface.length}`);
  const raw = [...github, ...huggingface];
  if (raw.length === 0) {
    throw new Error("No trends fetched from GitHub or Hugging Face");
  }

  const trends = await enrichTrends(mistralKey, raw);

  if (supabase) {
    await upsertTrends(supabase, day, trends);
    console.log(`Upserted ${trends.length} trends for ${day}`);
  } else {
    writeTrendsToFiles(trends);
  }

  const covered = supabase
    ? await getCoveredHrefs(supabase)
    : getCoveredHrefsFromMdx();
  const blog = await pickAndWriteBlog(mistralKey, trends, covered);
  if (blog) {
    if (supabase) {
      await insertAutoPost(supabase, day, blog);
      console.log(`Published auto-post: ${blog.slug}`);
    } else {
      writeBlogToMdx(day, blog);
    }
  } else {
    console.log("Skipped blog post — all trends already covered.");
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
