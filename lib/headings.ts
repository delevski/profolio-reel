/**
 * Heading ids + table of contents for MDX articles.
 * `rehypeCollectHeadings` gives every h2/h3 a stable, unicode-safe id (Hebrew included,
 * duplicates get -2, -3…) and records them, so the ToC links always match the page.
 */

export type TocHeading = { id: string; text: string; depth: 2 | 3 };

export function slugifyHeading(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "section";
}

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/** rehype plugin factory: fills `sink` with the article's h2/h3 headings. */
export function rehypeCollectHeadings(sink: TocHeading[]) {
  return () => (tree: HastNode) => {
    const seen = new Map<string, number>();
    const walk = (node: HastNode) => {
      if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3")) {
        const text = textOf(node).trim();
        if (text) {
          const base = slugifyHeading(text);
          const n = (seen.get(base) ?? 0) + 1;
          seen.set(base, n);
          const id = n === 1 ? base : `${base}-${n}`;
          node.properties = { ...(node.properties ?? {}), id };
          sink.push({ id, text, depth: node.tagName === "h2" ? 2 : 3 });
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}

/** Plain-markdown heading scan (no MDX compile) — used by tests and tooling. */
export function extractHeadings(md: string): { text: string; depth: 2 | 3 }[] {
  const out: { text: string; depth: 2 | 3 }[] = [];
  let fenced = false;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (m) out.push({ depth: m[1].length as 2 | 3, text: m[2] });
  }
  return out;
}
