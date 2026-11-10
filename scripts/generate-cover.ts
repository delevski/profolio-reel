/**
 * Maintenance CLI: (re)generate the cover image and reading time of an existing blog post.
 *
 *   npm run cover -- <slug>            # AI illustration if FAL_KEY/GEMINI_API_KEY/OPENAI_API_KEY is set, else branded cover
 *   npm run cover -- <slug> --fallback # always the branded cover drawn in code
 *
 * Updates imageUrl / imageAlt / coverKind / readTime in content/blog/<slug>.mdx.
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { generateCover } from "./lib/cover";
import { readTimeString } from "../lib/reading-time";

async function main() {
  const slug = process.argv[2];
  const fallbackOnly = process.argv.includes("--fallback");
  if (!slug || slug.startsWith("--")) {
    console.error("usage: npm run cover -- <slug> [--fallback]");
    process.exit(2);
  }
  const file = path.join(process.cwd(), "content", "blog", `${slug}.mdx`);
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);

  const cover = await generateCover({
    slug,
    title: String(data.title),
    excerpt: String(data.excerpt ?? ""),
    date: String(data.date),
    forceFallback: fallbackOnly,
  });

  const lines = raw.split("\n");
  const end = lines.indexOf("---", 1);
  const set = (key: string, value: string) => {
    const line = `${key}: ${JSON.stringify(value)}`;
    const idx = lines.slice(0, end).findIndex((l) => l.startsWith(`${key}:`));
    if (idx >= 0) lines[idx] = line;
    else lines.splice(end, 0, line);
  };
  set("readTime", readTimeString(content, "en"));
  if (cover) {
    set("imageUrl", cover.publicPath);
    set("imageAlt", cover.alt);
    set("coverKind", cover.kind);
  }
  fs.writeFileSync(file, lines.join("\n"), "utf-8");
  console.log(`Updated ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
