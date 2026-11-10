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
