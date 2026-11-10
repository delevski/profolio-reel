import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import matter from "gray-matter";
import sharp from "sharp";
import { countWords, formatMinutes, readingMinutes, readTimeString } from "../lib/reading-time";
import { extractHeadings, rehypeCollectHeadings, slugifyHeading, type TocHeading } from "../lib/headings";
import {
  checkStructure,
  ensureDiagram,
  getMermaidBlocks,
  parseArticleResponse,
  restoreDiagrams,
  sanitizeMermaid,
} from "../scripts/lib/article";
import { activeImageProvider, generateCover, renderFallbackCover, wrapTitle } from "../scripts/lib/cover";

const root = process.cwd();
const dir = path.join(root, "content", "ai-trends");
const blogDirs = [path.join(root, "content", "blog")];

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];

test("at least one digest exists", () => {
  assert.ok(files.length > 0);
});

for (const f of files) {
  test(`digest ${f} matches the schema`, () => {
    assert.match(f, /^\d{4}-\d{2}-\d{2}\.json$/);
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    assert.equal(`${d.date}.json`, f, "date must match the file name");
    assert.ok(Array.isArray(d.items) && d.items.length > 0);
    const ids = new Set<string>();
    for (const i of d.items) {
      assert.ok(!ids.has(i.id), `duplicate id ${i.id}`);
      ids.add(i.id);
      assert.ok(["github", "huggingface"].includes(i.source));
      assert.match(i.href, /^https:\/\//);
      assert.ok(i.title);
      assert.ok(i.summary && (i.summary.en || i.summary.he), "needs a summary");
    }
    if (d.trendOfTheDay) {
      const t = d.trendOfTheDay;
      assert.ok(t.slug && t.title && t.excerpt && /^https:\/\//.test(t.sourceHref));
      const exists = blogDirs.some((b) => fs.existsSync(path.join(b, `${t.slug}.mdx`)));
      // Supabase mode keeps posts in auto_posts instead of content/blog.
      if (!process.env.SUPABASE_URL) assert.ok(exists, `no blog post for ${t.slug}`);
    }
  });
}

/* ---------- reading time ---------- */

test("reading time comes from the word count and ignores code and diagrams", () => {
  const prose = Array.from({ length: 450 }, (_, i) => `word${i}`).join(" ");
  assert.equal(countWords(prose), 450);
  assert.equal(readingMinutes(prose), 3); // 450 / 200
  assert.equal(readingMinutes(prose, "he"), 3); // 450 / 180
  const withCode = `${prose}\n\n\`\`\`mermaid\nflowchart TD\n  A --> B\n\`\`\`\n\n\`\`\`js\n${"x ".repeat(2000)}\n\`\`\``;
  assert.equal(countWords(withCode), 450);
  assert.equal(readingMinutes("short"), 1);
  assert.equal(readTimeString(prose), "3 min read");
  assert.equal(formatMinutes(6, "he"), "6 דקות קריאה");
  assert.equal(formatMinutes(6, "en"), "6 min read");
});

/* ---------- headings / table of contents ---------- */

test("heading ids are unicode-safe and de-duplicated", () => {
  assert.equal(slugifyHeading("Why it matters"), "why-it-matters");
  assert.equal(slugifyHeading("למה זה חשוב?"), "למה-זה-חשוב");
  const tree = {
    type: "root",
    children: [
      { type: "element", tagName: "h2", children: [{ type: "text", value: "Links" }] },
      { type: "element", tagName: "h3", children: [{ type: "text", value: "Links" }] },
      { type: "element", tagName: "p", children: [{ type: "text", value: "ignored" }] },
    ],
  };
  const sink: TocHeading[] = [];
  rehypeCollectHeadings(sink)()(tree);
  assert.deepEqual(sink.map((h) => h.id), ["links", "links-2"]);
  assert.deepEqual(sink.map((h) => h.depth), [2, 3]);
  const md = "## A\n\n```md\n## not a heading\n```\n\n### B";
  assert.deepEqual(extractHeadings(md).map((h) => h.text), ["A", "B"]);
});

/* ---------- article parsing + diagrams ---------- */

test("article response parser and mermaid helpers", () => {
  const raw = "TITLE: Hello\nEXCERPT: Teaser\n---\nIntro.\n\n## One\n\ntext";
  const a = parseArticleResponse(raw);
  assert.equal(a?.title, "Hello");
  assert.equal(a?.excerpt, "Teaser");
  assert.ok(a?.content.startsWith("Intro."));
  assert.equal(parseArticleResponse("not in the format"), null);

  // unquoted labels with parentheses are quoted so mermaid can parse them
  const fixed = sanitizeMermaid("flowchart TD\n  A[Client (browser)] --> B[API]");
  assert.match(fixed, /A\["Client \(browser\)"\]/);

  // an article without a diagram gets the generic one; one with a diagram is left alone
  const none = ensureDiagram("Intro\n\n## One\n\na\n\n## Two\n\nb\n\n## Three\n\nc");
  assert.equal(none.added, true);
  assert.equal(getMermaidBlocks(none.content).length, 1);
  const has = ensureDiagram("## A\n\n```mermaid\nflowchart TD\n  A --> B\n  B --> C\n```\n");
  assert.equal(has.added, false);

  // the Hebrew translation keeps the English diagram byte for byte
  const original = getMermaidBlocks(has.content);
  const he = restoreDiagrams("## כותרת\n\n```mermaid\nflowchart TD\n  א --> ב\n  ב --> ג\n```\n", original);
  assert.deepEqual(getMermaidBlocks(he), original);
});

/* ---------- cover image ---------- */

test("fallback cover is a deterministic 1200x630 webp", async () => {
  const a = await renderFallbackCover({ title: "Nutlope/hallmark: Why It Matters", seed: "s1", date: "2026-07-15" });
  const b = await renderFallbackCover({ title: "Nutlope/hallmark: Why It Matters", seed: "s1", date: "2026-07-15" });
  const c = await renderFallbackCover({ title: "Nutlope/hallmark: Why It Matters", seed: "s2", date: "2026-07-15" });
  const meta = await sharp(a).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  assert.ok(a.equals(b), "same inputs → same bytes");
  assert.ok(!a.equals(c), "different seed → different artwork");
  assert.ok(a.length < 120_000, "cover stays light");
  assert.ok(wrapTitle("a-very-long-token-without-any-spaces-at-all-in-it", 20, 3).every((l) => l.length <= 21));
});

test("cover step: provider image when a key works, branded fallback otherwise, never throws", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cover-"));
  const base = { slug: "2026-01-01-demo", title: "Demo post", date: "2026-01-01", outDir: dir };

  assert.equal(activeImageProvider({}), null);
  assert.equal(activeImageProvider({ FAL_KEY: "k" }), "fal");

  // no key → branded cover
  const none = await generateCover({ ...base, env: {} });
  assert.equal(none?.kind, "generated");
  assert.equal(none?.publicPath, "/blog/ai-trends/2026-01-01-demo.webp");
  assert.ok(fs.existsSync(path.join(dir, "2026-01-01-demo.webp")));

  // key + working provider (mocked fal) → "ai"
  const png = await sharp({ create: { width: 640, height: 336, channels: 3, background: "#2563eb" } }).png().toBuffer();
  const okFetch = (async (url: string) => {
    if (String(url).includes("fal.run")) {
      return new Response(JSON.stringify({ images: [{ url: "https://cdn.example/img.png" }] }), { status: 200 });
    }
    return new Response(new Uint8Array(png), { status: 200 });
  }) as unknown as typeof fetch;
  const ai = await generateCover({ ...base, env: { FAL_KEY: "k" }, fetchImpl: okFetch });
  assert.equal(ai?.kind, "ai");
  assert.equal(ai?.provider, "fal");
  const meta = await sharp(path.join(dir, "2026-01-01-demo.webp")).metadata();
  assert.deepEqual([meta.width, meta.height], [1200, 630]);

  // key + provider error → falls back, does not throw
  const badFetch = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
  const fb = await generateCover({ ...base, env: { FAL_KEY: "k" }, fetchImpl: badFetch });
  assert.equal(fb?.kind, "generated");

  // provider answers garbage bytes → falls back
  const junkFetch = (async (url: string) =>
    String(url).includes("fal.run")
      ? new Response(JSON.stringify({ images: [{ url: "https://cdn.example/x" }] }), { status: 200 })
      : new Response("not an image", { status: 200 })) as unknown as typeof fetch;
  const junk = await generateCover({ ...base, env: { FAL_KEY: "k" }, fetchImpl: junkFetch });
  assert.equal(junk?.kind, "generated");
});

/* ---------- every post: cover file + frontmatter ---------- */

const blogFiles = fs.readdirSync(path.join(root, "content", "blog")).filter((f) => f.endsWith(".mdx"));

for (const f of blogFiles) {
  test(`post ${f}: any local cover exists and is 1200x630`, async () => {
    const { data } = matter.read(path.join(root, "content", "blog", f));
    const img = (data.imageUrl as string | undefined) || (data.image as string | undefined);
    if (img && img.startsWith("/")) {
      const file = path.join(root, "public", img);
      assert.ok(fs.existsSync(file), `missing cover ${img}`);
      if (img.startsWith("/blog/ai-trends/")) {
        const m = await sharp(file).metadata();
        assert.deepEqual([m.width, m.height], [1200, 630]);
      }
    }
  });
}

for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  if (!d.trendOfTheDay) continue;
  const slug = d.trendOfTheDay.slug as string;
  test(`trend post ${slug}: cover, frontmatter, structure and diagram`, () => {
    const mdx = path.join(root, "content", "blog", `${slug}.mdx`);
    if (!fs.existsSync(mdx)) return; // Supabase mode keeps posts in auto_posts
    const { data, content } = matter.read(mdx);
    assert.ok(data.imageUrl, "imageUrl");
    assert.ok(String(data.imageAlt ?? "").length > 5, "imageAlt");
    assert.match(String(data.readTime), /^\d+ min read$/);
    assert.equal(data.readTime, readTimeString(content), "readTime matches the word count");
    assert.ok(["ai", "generated", "source"].includes(String(data.coverKind)), "coverKind");
    if (String(data.imageUrl).startsWith("/")) {
      assert.ok(fs.existsSync(path.join(root, "public", String(data.imageUrl))), "cover file");
    }
    const s = checkStructure(content);
    assert.ok(s.h2 >= 4, `needs ≥4 sections, has ${s.h2}`);
    assert.ok(s.mermaid >= 1, "needs a mermaid diagram");
    // the Hebrew twin exists and keeps the same diagram
    const he = path.join(root, "content", "blog", "he", `${slug}.mdx`);
    if (fs.existsSync(he)) {
      const heContent = matter.read(he).content;
      assert.deepEqual(getMermaidBlocks(heContent), getMermaidBlocks(content));
    }
  });
}
