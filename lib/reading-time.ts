/**
 * Reading time from the word count of a markdown/MDX body.
 * Pure (no server-only imports) so the daily cron script, the pages and the tests share it.
 * Code blocks (including ```mermaid diagrams), URLs and markup do not count as prose.
 */

const WORDS_PER_MINUTE = { en: 200, he: 180 } as const;

/** Markdown → plain prose: drops fenced code, HTML/JSX tags, images, URLs and markup characters. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/<[^>\n]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`|~-]+/g, " ");
}

export function countWords(md: string): number {
  return stripMarkdown(md)
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

/** Whole minutes, never below 1. English 200 wpm, Hebrew 180 wpm. */
export function readingMinutes(md: string, locale: "en" | "he" = "en"): number {
  return Math.max(1, Math.ceil(countWords(md) / WORDS_PER_MINUTE[locale]));
}

/** Frontmatter-friendly form: "6 min read". utils.formatReadTime localizes it. */
export function readTimeString(md: string, locale: "en" | "he" = "en"): string {
  return `${readingMinutes(md, locale)} min read`;
}

/** Display form: he "6 דקות קריאה", en "6 min read". */
export function formatMinutes(minutes: number, locale: string): string {
  if (locale === "he") {
    if (minutes <= 1) return "דקת קריאה";
    if (minutes === 2) return "2 דקות קריאה";
    return `${minutes} דקות קריאה`;
  }
  return `${minutes} min read`;
}
