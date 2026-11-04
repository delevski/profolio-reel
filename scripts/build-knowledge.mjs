#!/usr/bin/env node
/**
 * Builds lib/agent/knowledge.generated.json — the site chatbot's knowledge.
 * Runs before `next build` (npm "prebuild") and can be run by hand:
 *   node scripts/build-knowledge.mjs
 * Sources = only what the site itself publishes: the v2 home pages (EN/HE,
 * incl. CV/experience), content/*.json (projects, apps, courses, profile…),
 * and the blog / learn MDX posts. Output is plain text chunks; retrieval is
 * keyword scoring at request time (lib/agent/retrieve.ts), no embeddings.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "lib/agent/knowledge.generated.json");
const chunks = [];
const MAX = 900;

const clean = (s) =>
  String(s)
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "’")
    .replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&middot;/g, "·").replace(/&[a-z]+;/g, " ")
    .trim();

function push(lang, source, title, url, text, boost = 1) {
  text = clean(text);
  if (text.length < 40) return;
  // split long text on sentence-ish boundaries
  const parts = [];
  let cur = "";
  for (const seg of text.split(/(?<=[.!?։׃])\s+|(?<=\s)·\s/)) {
    if ((cur + " " + seg).length > MAX && cur) { parts.push(cur); cur = seg; }
    else cur = cur ? cur + " " + seg : seg;
  }
  if (cur) parts.push(cur);
  parts.forEach((p, i) =>
    chunks.push({ id: `${source}#${chunks.length}`, lang, source, title: clean(title), url, text: p, boost, part: i }),
  );
}

// 1) v2 home pages (most current: CV, experience, services, work)
function htmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(br|\/p|\/li|\/h\d|\/div)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/(\.\s*){2,}/g, ". ");
}
for (const [lang, file, url] of [
  ["en", "public/v2/index.html", "/en"],
  ["he", "public/v2/he/index.html", "/he"],
]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, "utf8");
  const sections = html.split(/<section\b/i).slice(1);
  for (const sec of sections) {
    const id = (sec.match(/id="([^"]+)"/) || [])[1] || "home";
    const h = (sec.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || [])[1] || id;
    const body = sec.split(/<\/section>/i)[0];
    push(lang, `home:${id}`, `Home page — ${htmlText(h)}`, `${url}#${id}`, htmlText("<x " + body), 1.4);
  }
  const foot = html.split(/<footer/i)[1];
  if (foot) push(lang, "home:footer", "Home page — footer", url, htmlText("<x " + foot.split(/<\/footer>/i)[0]), 1.0);
}

// 2) content JSON (localized values pick the right language)
function flatten(v, lang, acc = []) {
  if (v == null) return acc;
  if (typeof v === "string") { if (!/^(https?:|\/)/.test(v) && v.length > 1) acc.push(v); return acc; }
  if (typeof v === "number" || typeof v === "boolean") return acc;
  if (Array.isArray(v)) { v.forEach((x) => flatten(x, lang, acc)); return acc; }
  if (typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length && keys.every((k) => k === "en" || k === "he")) return flatten(v[lang] ?? v.en, lang, acc);
    for (const k of keys) {
      if (/^(imageUrl|image|thumbnail|preview|href|url|demoUrl|playStoreUrl|slug|id|icon)$/i.test(k)) continue;
      const before = acc.length;
      flatten(v[k], lang, acc);
      if (acc.length > before && /^(name|title|role|company|period|stars|category)$/.test(k)) acc[before] = `${k}: ${acc[before]}`;
    }
  }
  return acc;
}
const jsonSources = [
  ["site", "Profile & contact (site settings)", "/about"],
  ["projects", "Projects", "/projects"],
  ["apps", "Apps", "/apps"],
  ["courses", "Academy courses", "/academy"],
  ["testimonials", "Testimonials", "/about"],
  ["videos", "Videos", "/"],
];
for (const lang of ["en", "he"]) {
  for (const [name, title, url] of jsonSources) {
    const f = [path.join(root, `content/${name}.${lang}.json`), path.join(root, `content/${name}.json`)].find((x) => fs.existsSync(x));
    if (!f) continue;
    const data = JSON.parse(fs.readFileSync(f, "utf8"));
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      const label = typeof item?.name === "string" ? item.name : typeof item?.title === "string" ? item.title : (item?.title?.[lang] ?? title);
      push(lang, `content:${name}`, `${title} — ${label}`, `/${lang}${url === "/" ? "" : url}`, flatten(item, lang).join(". "), name === "site" ? 0.8 : 1.1);
    }
  }
}

// 3) blog + learn MDX
function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return [{}, src];
  const meta = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) meta[mm[1]] = mm[2].replace(/^["']|["']$/g, "");
  }
  return [meta, m[2]];
}
for (const kind of ["blog", "learn"]) {
  for (const lang of ["en", "he"]) {
    const dir = path.join(root, "content", kind, lang === "he" ? "he" : "");
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".mdx") && !f.endsWith(".md")) continue;
      const [meta, body] = frontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
      const slug = f.replace(/\.mdx?$/, "");
      const text = `${meta.title || slug}. ${meta.excerpt || ""} ${body.replace(/```[\s\S]*?```/g, " ").replace(/<[^>]+>/g, " ").replace(/[#*_>`]/g, " ")}`;
      push(lang, `${kind}:${slug}`, `${kind === "blog" ? "Blog" : "Learn guide"} — ${meta.title || slug}${meta.date ? ` (${meta.date})` : ""}`, `/${lang}/${kind}/${slug}`, text, 0.9);
    }
  }
}

fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), count: chunks.length, chunks }) + "\n");
console.log(`knowledge: ${chunks.length} chunks → ${path.relative(root, out)}`);
