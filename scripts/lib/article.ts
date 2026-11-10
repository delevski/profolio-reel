/**
 * Helpers for the LLM-written article: parse the model's answer, make sure the Mermaid
 * diagram is safe/valid-looking, keep diagrams identical in the Hebrew translation.
 * Pure functions (no network, no fs) so they are unit-tested.
 */
import { countWords } from "../../lib/reading-time";

export type ParsedArticle = { title: string; excerpt: string; content: string };

const MERMAID_FENCE = /```mermaid[ \t]*\n([\s\S]*?)\n?```/g;
const DIAGRAM_START =
  /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|mindmap|timeline|pie)\b/;

/** "TITLE: …\nEXCERPT: …\n---\n<markdown>" (the format the prompts ask for). */
export function parseArticleResponse(raw: string): ParsedArticle | null {
  let text = raw.trim();
  // Models like to wrap the whole answer in a code fence.
  const wrapped = text.match(/^```(?:markdown|md|text)?\n([\s\S]*)\n```$/);
  if (wrapped) text = wrapped[1].trim();

  const title = text.match(/^\s*(?:TITLE|Title|TITLE_HE|Title_HE)\s*:\s*(.+)$/m)?.[1]?.trim();
  const excerpt = text.match(/^\s*(?:EXCERPT|Excerpt|EXCERPT_HE|Excerpt_HE)\s*:\s*(.+)$/m)?.[1]?.trim();
  const sep = text.search(/^---\s*$/m);
  if (!title || sep < 0) return null;
  const content = text.slice(sep).replace(/^---\s*\n/, "").trim();
  if (!content) return null;
  return {
    title: title.replace(/^["“]|["”]$/g, ""),
    excerpt: (excerpt ?? "").replace(/^["“]|["”]$/g, ""),
    content,
  };
}

/** Quote bracketed flowchart labels so (), :, / and non-ASCII text can't break the parser. */
export function sanitizeMermaid(code: string): string {
  let out = code.trim();
  out = out.replace(/<\/?script[\s\S]*?>/gi, "").replace(/^\s*click\s.*$/gim, "");
  if (/^(flowchart|graph)\b/.test(out)) {
    out = out.replace(/(\b[A-Za-z_][\w-]*)\[([^\]\[\n"]+)\]/g, (_m, id, label) => `${id}["${label.replace(/"/g, "'")}"]`);
    out = out.replace(/(\b[A-Za-z_][\w-]*)\{([^}\n"]+)\}/g, (_m, id, label) => `${id}{"${label.replace(/"/g, "'")}"}`);
    // edge labels: -->|text (x)| → -->|"text (x)"|
    out = out.replace(/\|([^|\n"]+)\|/g, (_m, label) => `|"${label.replace(/"/g, "'")}"|`);
  }
  return out;
}

export function isPlausibleMermaid(code: string): boolean {
  const first = code.trim().split("\n")[0]?.trim() ?? "";
  return DIAGRAM_START.test(first) && code.trim().split("\n").length >= 3;
}

export function getMermaidBlocks(md: string): string[] {
  return [...md.matchAll(MERMAID_FENCE)].map((m) => m[1]);
}

/** Sanitise every mermaid block; drop the ones that cannot be diagrams at all. */
export function cleanMermaidBlocks(md: string): string {
  return md.replace(MERMAID_FENCE, (_m, code: string) => {
    const cleaned = sanitizeMermaid(code);
    return isPlausibleMermaid(cleaned) ? "```mermaid\n" + cleaned + "\n```" : "";
  });
}

/** A generic, always-true flow for evaluating any trending repo (used only if the LLM gave no diagram). */
export function fallbackDiagram(locale: "en" | "he" = "en"): string {
  const labels =
    locale === "he"
      ? ["נתקלים בטרנד", "קוראים את ה-README", "מריצים דוגמה מקומית", "בודקים התאמה לפרויקט", "מאמצים או מדלגים"]
      : ["Spot the trend", "Read the README", "Run the example locally", "Check fit for your project", "Adopt or skip"];
  return (
    "```mermaid\nflowchart TD\n" +
    labels.map((l, i) => `  S${i}["${l}"]`).join("\n") +
    "\n  S0 --> S1 --> S2 --> S3 --> S4\n```"
  );
}

/** Insert `block` before the last "Source/Links/Try" style H2, or append it. */
export function insertDiagram(md: string, block: string): string {
  const parts = md.split(/\n(?=## )/);
  if (parts.length > 2) {
    // after the second section, which is where "how it works" normally sits
    parts.splice(2, 0, block);
    return parts.join("\n\n").replace(/\n{3,}/g, "\n\n");
  }
  return `${md.trim()}\n\n${block}\n`;
}

/** Make sure the article carries at least one valid-looking diagram. Returns whether one was added. */
export function ensureDiagram(md: string, locale: "en" | "he" = "en"): { content: string; added: boolean } {
  const cleaned = cleanMermaidBlocks(md);
  if (getMermaidBlocks(cleaned).length > 0) return { content: cleaned, added: false };
  return { content: insertDiagram(cleaned, fallbackDiagram(locale)), added: true };
}

/**
 * The translation must keep the English diagrams (labels stay English, syntax can't drift):
 * replace the translated blocks, in order, with the originals.
 */
export function restoreDiagrams(translated: string, originalBlocks: string[]): string {
  if (originalBlocks.length === 0) return cleanMermaidBlocks(translated);
  let i = 0;
  const count = getMermaidBlocks(translated).length;
  if (count === originalBlocks.length) {
    return translated.replace(MERMAID_FENCE, () => "```mermaid\n" + originalBlocks[i++] + "\n```");
  }
  const stripped = translated.replace(MERMAID_FENCE, "");
  return insertDiagram(stripped, originalBlocks.map((b) => "```mermaid\n" + b + "\n```").join("\n\n"));
}

export type StructureReport = { words: number; h2: number; mermaid: number; ok: boolean };
export function checkStructure(md: string): StructureReport {
  const words = countWords(md);
  let fenced = false;
  let h2 = 0;
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (!fenced && /^## /.test(line)) h2++;
  }
  const mermaid = getMermaidBlocks(md).length;
  return { words, h2, mermaid, ok: h2 >= 4 && mermaid >= 1 && words >= 300 };
}


/* ---------- fallback article (used only when the model could not write one) ---------- */

export type FallbackInput = {
  title: string;
  href: string;
  source: "github" | "huggingface";
  summary: string;
  language?: string;
  tag?: string;
  stars?: number;
  downloads?: number;
  /** README / model-card text already fetched for the prompt (may be empty). */
  material?: string;
};

/** MDX treats { } and < as syntax; turn them into entities in prose (code fences and `inline code` stay untouched). */
export function escapeMdxProse(md: string): string {
  let fenced = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced) return line;
      return line
        .split(/(`[^`]*`)/)
        .map((part, i) =>
          i % 2 === 1 ? part : part.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;").replace(/</g, "&lt;")
        )
        .join("");
    })
    .join("\n");
}

type ReadmeSection = { heading: string; paragraphs: string[]; code: string[] };

function cleanReadmeLine(line: string): string {
  return line
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Split a README / model card into headed sections with their prose paragraphs and code blocks. */
export function parseReadme(material: string): { intro: string[]; sections: ReadmeSection[] } {
  const text = material.replace(/^---\n[\s\S]*?\n---\n/, ""); // HF front matter
  const intro: string[] = [];
  const sections: ReadmeSection[] = [];
  let current: ReadmeSection | null = null;
  let para: string[] = [];
  let code: string[] | null = null;

  const flush = () => {
    const p = para.join(" ").replace(/\s{2,}/g, " ").trim();
    para = [];
    if (p.length < 25 || /^[|\-=*_\s]+$/.test(p)) return;
    (current ? current.paragraphs : intro).push(p);
  };

  for (const rawLine of text.split("\n")) {
    if (/^\s*```/.test(rawLine)) {
      if (code) {
        if (current && code.length > 0 && code.length <= 30 && !/mermaid/i.test(code[0] ?? "")) current.code.push(code.join("\n"));
        code = null;
      } else {
        flush();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(rawLine.replace(/\s+$/, ""));
      continue;
    }
    const h = rawLine.match(/^#{1,4}\s+(.+?)\s*#*$/);
    if (h) {
      flush();
      current = { heading: cleanReadmeLine(h[1]).replace(/[*_`]/g, ""), paragraphs: [], code: [] };
      if (current.heading) sections.push(current);
      continue;
    }
    if (!rawLine.trim()) {
      flush();
      continue;
    }
    if (/^\s*\|/.test(rawLine)) continue; // tables
    const cleaned = cleanReadmeLine(rawLine);
    if (cleaned) para.push(cleaned);
  }
  flush();
  return { intro, sections: sections.filter((s) => s.paragraphs.length > 0 || s.code.length > 0) };
}

function clip(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  const cut = words.slice(0, maxWords).join(" ");
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (end > cut.length * 0.5 ? cut.slice(0, end + 1) : cut.replace(/[,;:]$/, "") + "…").trim();
}

/**
 * A structured article built only from text we already fetched: the project's own README /
 * model card. Clearly longer and better than a one-paragraph stub, never invents facts.
 */
export function buildFallbackArticle(input: FallbackInput): { title: string; excerpt: string; content: string } {
  const place = input.source === "github" ? "GitHub" : "Hugging Face";
  const { intro, sections } = parseReadme(input.material ?? "");
  const facts: string[] = [];
  if (input.language) facts.push(`written mainly in ${input.language}`);
  if (input.tag) facts.push(`built for the "${input.tag}" task`);
  if (typeof input.stars === "number") facts.push(`${input.stars.toLocaleString("en-US")} ${input.source === "github" ? "stars" : "likes"} at the time of writing`);
  if (typeof input.downloads === "number") facts.push(`${input.downloads.toLocaleString("en-US")} downloads`);
  const factLine = facts.length ? ` It is ${facts.join(", ")}.` : "";

  const out: string[] = [];
  const lead = /[.!?]$/.test(input.summary.trim()) ? input.summary.trim() : `${input.summary.trim()}.`;
  out.push(`${lead}${factLine} It is one of the most watched projects on ${place} today. This overview is assembled from the project's own README, so you can decide quickly whether it is worth a deeper look.`);

  out.push("## Why it matters");
  const why = intro.slice(0, 2).map((p) => clip(p, 90));
  out.push(why.length ? why.join("\n\n") : input.summary);
  out.push(`Trending projects are a cheap early signal of where tooling is heading: this one is being starred, forked and tried by many developers right now.`);

  const skip = /install|usage|quick ?start|getting started|license|contribut|citation|acknowledg|changelog|table of contents|star history|sponsor/i;
  const body = sections.filter((s) => s.paragraphs.length > 0 && !skip.test(s.heading)).slice(0, 5);
  out.push("## How it works");
  if (body.length) {
    out.push("According to the README, the project is organised around these ideas:");
    out.push(fallbackDiagram("en"));
    for (const s of body) {
      out.push(`### ${s.heading}`);
      out.push(s.paragraphs.slice(0, 2).map((p) => clip(p, 70)).join("\n\n"));
    }
  } else {
    out.push(`The project page does not describe the internals in detail. Start from the README to see the architecture and the main entry points.`);
    out.push(fallbackDiagram("en"));
  }

  out.push("## How to try it");
  const tryIt = sections.find((s) => /install|usage|quick ?start|getting started|example|run/i.test(s.heading) && s.code.length > 0);
  if (tryIt) {
    out.push(`The README's "${tryIt.heading}" section shows the quickest way in:`);
    out.push("```\n" + tryIt.code[0].trim() + "\n```");
    out.push("Check the README for prerequisites and the current version before running anything.");
  } else {
    out.push(`There is no ready-made quick start in the text we could read, so open the [README](${input.href}) for the current install and usage steps.`);
  }

  out.push("## Who it's for (and limits)");
  out.push(`It suits developers who already work with this kind of tooling and want to evaluate a fast-moving open-source project. Because trending projects change quickly, check the licence, the open issues and the latest commits on ${place} before depending on it.`);

  out.push("## Links");
  out.push(`- [${input.title} on ${place}](${input.href})`);
  out.push(`\n*Compiled automatically from the project's README; the full article could not be generated this time.*`);

  const content = escapeMdxProse(out.join("\n\n").replace(/\n{3,}/g, "\n\n"));
  return {
    title: `${input.title}: Why It Matters`,
    excerpt: input.summary,
    content,
  };
}
