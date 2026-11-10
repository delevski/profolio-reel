/**
 * Cover images for auto-generated blog posts (1200x630 WebP, also used as og:image).
 *
 *  1. If an image provider key is present (FAL_KEY, else GEMINI_API_KEY, else OPENAI_API_KEY)
 *     an editorial illustration is generated from an art-direction prompt built from the post.
 *  2. Otherwise — or if the provider fails for any reason — a deterministic branded cover is
 *     drawn in code (SVG → WebP via sharp): the title plus abstract shapes in the brand colors.
 *
 * generateCover() never throws: the daily run must not fail because of an image.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 630;
export const BRAND_BLUE = "#2563eb";
export const BRAND_ORANGE = "#dc5a2c";

export type CoverKind = "ai" | "generated";
export type CoverResult = {
  /** Path under /public, e.g. /blog/ai-trends/2026-11-10-foo.webp (use as imageUrl / og:image). */
  publicPath: string;
  file: string;
  kind: CoverKind;
  provider?: string;
  alt: string;
};

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

/* ---------- deterministic branded fallback ---------- */

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Greedy word wrap that also hard-splits very long tokens. */
export function wrapTitle(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (let w of words) {
    while (w.length > maxChars) {
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      lines.push(w.slice(0, maxChars));
      w = w.slice(maxChars);
    }
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/.{0,2}$/, "") + "…";
    return kept;
  }
  return lines;
}

function pickTitleLayout(title: string) {
  for (const size of [56, 50, 44, 38]) {
    const maxChars = Math.floor(620 / (size * 0.6));
    const lines = wrapTitle(title, maxChars, 4);
    if (lines.length <= (size >= 50 ? 3 : 4) && !lines.some((l) => l.endsWith("…"))) return { size, lines };
  }
  return { size: 38, lines: wrapTitle(title, Math.floor(620 / (38 * 0.6)), 4) };
}

export function coverSvg(opts: { title: string; seed: string; kicker?: string; date?: string }): string {
  const rand = rng(hashSeed(opts.seed));
  const cx = 905;
  const cy = 305;
  const gap = rand() * Math.PI * 2;
  const arc = (r: number, from: number, to: number) => {
    const x1 = cx + r * Math.cos(from);
    const y1 = cy + r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy + r * Math.sin(to);
    const large = to - from > Math.PI ? 1 : 0;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const ringR = 150;
  const gapSize = 0.9;
  const dotAngle = gap + gapSize / 2;
  const dot = { x: cx + ringR * Math.cos(dotAngle), y: cy + ringR * Math.sin(dotAngle) };

  // network of nodes around the ring
  const nodes: { x: number; y: number; r: number; hot: boolean }[] = [];
  const count = 9 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rand() * 0.5;
    const dist = 215 + rand() * 120;
    nodes.push({
      x: cx + dist * Math.cos(ang),
      y: cy + dist * 0.82 * Math.sin(ang),
      r: 5 + rand() * 9,
      hot: rand() < 0.22,
    });
  }
  const links: string[] = [];
  nodes.forEach((n, i) => {
    const m = nodes[(i + 1 + Math.floor(rand() * 3)) % nodes.length];
    const mx = (n.x + m.x) / 2 + (rand() - 0.5) * 80;
    const my = (n.y + m.y) / 2 + (rand() - 0.5) * 80;
    links.push(
      `<path d="M ${n.x.toFixed(1)} ${n.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)}" stroke="${BRAND_BLUE}" stroke-opacity="0.45" stroke-width="2" fill="none"/>`
    );
    // spokes toward the ring
    if (rand() < 0.5) {
      links.push(
        `<line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${cx}" y2="${cy}" stroke="#5b8cff" stroke-opacity="0.12" stroke-width="1.5"/>`
      );
    }
  });
  const nodeSvg = nodes
    .map(
      (n) =>
        `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}" fill="${n.hot ? BRAND_ORANGE : "#0b1020"}" stroke="${n.hot ? BRAND_ORANGE : "#5b8cff"}" stroke-width="2.5"/>`
    )
    .join("");

  // faint bars (a "chart" motif) along the bottom right
  const bars: string[] = [];
  for (let i = 0; i < 14; i++) {
    const h = 20 + rand() * 90;
    bars.push(
      `<rect x="${640 + i * 40}" y="${600 - h}" width="22" height="${h.toFixed(0)}" rx="5" fill="${i % 5 === 2 ? BRAND_ORANGE : BRAND_BLUE}" opacity="${i % 5 === 2 ? 0.55 : 0.28}"/>`
    );
  }

  const { size, lines } = pickTitleLayout(opts.title);
  const lineH = Math.round(size * 1.18);
  const titleTop = 215;
  const tspans = lines
    .map((l, i) => `<tspan x="72" y="${titleTop + i * lineH}">${esc(l)}</tspan>`)
    .join("");
  const kicker = esc((opts.kicker ?? "AI TREND DIGEST") + (opts.date ? `  ·  ${opts.date}` : ""));
  const font = "Inter, 'Helvetica Neue', 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_WIDTH}" height="${COVER_HEIGHT}" viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#080d1c"/><stop offset="1" stop-color="#14204a"/></linearGradient>
  <radialGradient id="glowB" cx="${cx}" cy="${cy}" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${BRAND_BLUE}" stop-opacity="0.38"/><stop offset="1" stop-color="${BRAND_BLUE}" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowO" cx="${dot.x.toFixed(0)}" cy="${dot.y.toFixed(0)}" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${BRAND_ORANGE}" stop-opacity="0.55"/><stop offset="1" stop-color="${BRAND_ORANGE}" stop-opacity="0"/></radialGradient>
  <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#8da2c9" fill-opacity="0.16"/></pattern>
</defs>
<rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#bg)"/>
<rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#dots)"/>
<rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#glowB)"/>
<rect width="${COVER_WIDTH}" height="${COVER_HEIGHT}" fill="url(#glowO)"/>
${bars.join("")}
<circle cx="${cx}" cy="${cy}" r="245" fill="none" stroke="#5b8cff" stroke-opacity="0.18" stroke-width="1.5"/>
<circle cx="${cx}" cy="${cy}" r="300" fill="none" stroke="#5b8cff" stroke-opacity="0.10" stroke-width="1.5" stroke-dasharray="3 9"/>
${links.join("")}
<path d="${arc(ringR, gap + gapSize, gap + Math.PI * 2)}" fill="none" stroke="${BRAND_BLUE}" stroke-width="40" stroke-linecap="round"/>
<circle cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="23" fill="${BRAND_ORANGE}"/>
${nodeSvg}
<text x="72" y="118" font-family="${font}" font-size="20" font-weight="700" letter-spacing="3.5" fill="${BRAND_ORANGE}">${kicker}</text>
<text font-family="${font}" font-size="${size}" font-weight="700" fill="#ffffff">${tspans}</text>
<g transform="translate(72 556)">
  <path d="${(() => {
    const r = 14;
    const a0 = -0.6;
    const a1 = Math.PI * 2 - 1.2;
    return `M ${(r * Math.cos(a0 + 0.9)).toFixed(1)} ${(r * Math.sin(a0 + 0.9)).toFixed(1)} A ${r} ${r} 0 1 1 ${(r * Math.cos(a1)).toFixed(1)} ${(r * Math.sin(a1)).toFixed(1)}`;
  })()}" fill="none" stroke="${BRAND_BLUE}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="${(14 * Math.cos(-0.15)).toFixed(1)}" cy="${(14 * Math.sin(-0.15)).toFixed(1)}" r="4.5" fill="${BRAND_ORANGE}"/>
  <text x="34" y="7" font-family="${font}" font-size="22" font-weight="700" letter-spacing="1.5" fill="#c9d6f2">ORDEL <tspan fill="#8da2c9" font-weight="400">· AI Trends</tspan></text>
</g>
</svg>`;
}

async function toWebp(input: Buffer | string): Promise<Buffer> {
  return sharp(input, { density: 144 })
    .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover", position: "attention" })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
}

/** The always-available cover. Deterministic: the same inputs give the same bytes. */
export async function renderFallbackCover(opts: {
  title: string;
  seed: string;
  date?: string;
}): Promise<Buffer> {
  return toWebp(Buffer.from(coverSvg(opts)));
}

/* ---------- AI illustration (optional) ---------- */

export function buildImagePrompt(opts: { title: string; excerpt?: string; concept?: string }): string {
  const concept =
    opts.concept?.trim() ||
    "interconnected nodes and glowing data streams converging into one luminous focal point, suggesting software tools working together";
  return [
    `Editorial abstract technology illustration for an article titled "${opts.title}".`,
    opts.excerpt ? `Theme: ${opts.excerpt.slice(0, 220)}` : "",
    `Visual concept: ${concept}.`,
    "Style: modern flat geometric vector art with soft depth and subtle glow, deep navy background, electric blue (#2563eb) and warm orange (#dc5a2c) accents, clean composition with generous negative space on the left, landscape 1200x630.",
    "Strictly no text, no letters, no numbers, no logos, no watermarks, no people, no screenshots of user interfaces.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function fetchBytes(url: string, fetchImpl: FetchLike): Promise<Buffer> {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

type Provider = {
  name: string;
  key: string;
  run: (prompt: string, key: string, fetchImpl: FetchLike) => Promise<Buffer>;
};

const PROVIDERS: { name: string; env: string; run: Provider["run"] }[] = [
  {
    // https://fal.ai/models/fal-ai/flux/schnell/api — about $0.003 per image
    name: "fal",
    env: "FAL_KEY",
    run: async (prompt, key, f) => {
      const res = await f("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image_size: { width: 1280, height: 672 },
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { images?: { url?: string }[] };
      const url = data.images?.[0]?.url;
      if (!url) throw new Error("fal returned no image url");
      return fetchBytes(url, f);
    },
  },
  {
    name: "gemini",
    env: "GEMINI_API_KEY",
    run: async (prompt, key, f) => {
      const res = await f(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: AbortSignal.timeout(90_000),
        }
      );
      if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
      };
      const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
      if (!b64) throw new Error("gemini returned no image");
      return Buffer.from(b64, "base64");
    },
  },
  {
    name: "openai",
    env: "OPENAI_API_KEY",
    run: async (prompt, key, f) => {
      const res = await f("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1536x1024", quality: "low", n: 1 }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
      const item = data.data?.[0];
      if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
      if (item?.url) return fetchBytes(item.url, f);
      throw new Error("openai returned no image");
    },
  },
];

/** Name of the provider that would be used with this env, or null (fallback cover). */
export function activeImageProvider(env: Env): string | null {
  return PROVIDERS.find((p) => env[p.env]?.trim())?.name ?? null;
}

export async function generateAiImage(
  prompt: string,
  env: Env,
  fetchImpl: FetchLike = fetch
): Promise<{ buffer: Buffer; provider: string }> {
  const p = PROVIDERS.find((x) => env[x.env]?.trim());
  if (!p) throw new Error("no image provider key set");
  const raw = await p.run(prompt, env[p.env]!.trim(), fetchImpl);
  const webp = await toWebp(raw); // also proves the bytes are a decodable image
  return { buffer: webp, provider: p.name };
}

/* ---------- orchestration ---------- */

export async function generateCover(opts: {
  slug: string;
  title: string;
  excerpt?: string;
  date: string;
  /** One-sentence visual metaphor for the AI prompt (optional, e.g. from the LLM). */
  concept?: string;
  /** Directory the file is written to; default <cwd>/public/blog/ai-trends. */
  outDir?: string;
  env?: Env;
  fetchImpl?: FetchLike;
  /** Skip the provider even if a key is set (used by the maintenance CLI and tests). */
  forceFallback?: boolean;
}): Promise<CoverResult | null> {
  const outDir = opts.outDir ?? path.join(process.cwd(), "public", "blog", "ai-trends");
  const file = path.join(outDir, `${opts.slug}.webp`);
  const publicPath = `/blog/ai-trends/${opts.slug}.webp`;
  const alt = `Abstract illustration for: ${opts.title}`;
  const env = opts.env ?? process.env;

  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    console.warn("[cover] cannot create output dir:", err instanceof Error ? err.message : err);
    return null;
  }

  if (!opts.forceFallback && activeImageProvider(env)) {
    try {
      const { buffer, provider } = await generateAiImage(
        buildImagePrompt({ title: opts.title, excerpt: opts.excerpt, concept: opts.concept }),
        env,
        opts.fetchImpl
      );
      fs.writeFileSync(file, buffer);
      console.log(`[cover] AI illustration via ${provider} → ${publicPath} (${Math.round(buffer.length / 1024)} KB)`);
      return { publicPath, file, kind: "ai", provider, alt };
    } catch (err) {
      console.warn(
        "[cover] AI image failed — using the branded fallback cover instead:",
        err instanceof Error ? err.message : err
      );
    }
  } else if (!opts.forceFallback) {
    console.log("[cover] no image provider key set (FAL_KEY / GEMINI_API_KEY / OPENAI_API_KEY) — drawing the branded cover in code");
  }

  try {
    const buffer = await renderFallbackCover({ title: opts.title, seed: opts.slug, date: opts.date });
    fs.writeFileSync(file, buffer);
    console.log(`[cover] branded cover → ${publicPath} (${Math.round(buffer.length / 1024)} KB)`);
    return { publicPath, file, kind: "generated", alt };
  } catch (err) {
    console.error("[cover] fallback cover failed too — post will use its source image:", err instanceof Error ? err.message : err);
    return null;
  }
}
