import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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
