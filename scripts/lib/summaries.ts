/**
 * Batched per-trend summaries (+ the "trend of the day" pick) in ONE model call,
 * instead of ten summary calls and a pick call. Pure functions: prompt builder + tolerant parser.
 */

export type SummaryItem = { summaryEn: string; summaryHe: string };
export type SummaryInput = { source: string; title: string; description: string; href: string; covered?: boolean };
export type BatchResult = { items: (SummaryItem | null)[]; pick: number | null };

export const SUMMARY_SYSTEM =
  "You write short plain-language AI trend summaries and act as an editor. Return valid JSON only.";

export function buildSummaryPrompt(trends: SummaryInput[], opts: { pick: boolean }): string {
  const list = trends
    .map(
      (t, i) =>
        `${i + 1}. [${t.source}] ${t.title}${t.covered ? " (ALREADY COVERED — do not pick)" : ""}\n   Description: ${t.description.replace(/\s+/g, " ").slice(0, 400)}\n   URL: ${t.href}`
    )
    .join("\n");
  return `Summarize each of these ${trends.length} AI trends for a portfolio digest.

${list}

Return ONLY a JSON object, no markdown:
{
  "items": [
    { "n": 1, "summaryEn": "1-2 clear English sentences for the website card", "summaryHe": "1-2 short Hebrew sentences, simple language for beginners" }
  ]${opts.pick ? `,
  "pick": { "n": <number of the single most important trend for a developer/portfolio audience, not one marked ALREADY COVERED>, "why": "one English sentence" }` : ""}
}
"items" must contain exactly one entry per trend, in the same order, using "n" = the trend's number.`;
}

export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Could not find JSON object in model response");
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Parse the batched answer. Missing or malformed entries become null (the caller uses its fallback for them). */
export function parseSummaryResponse(raw: string, count: number): BatchResult {
  const data = extractJsonObject(raw) as { items?: unknown; pick?: { n?: unknown; index?: unknown } | number };
  const list = Array.isArray(data.items) ? data.items : [];
  const items: (SummaryItem | null)[] = Array.from({ length: count }, () => null);
  list.forEach((entry, position) => {
    if (!entry || typeof entry !== "object") return;
    const e = entry as { n?: unknown; index?: unknown; summaryEn?: unknown; summaryHe?: unknown };
    const n = Number(e.n ?? e.index);
    const slot = Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : position < count ? position : -1;
    if (slot < 0) return;
    const en = typeof e.summaryEn === "string" ? e.summaryEn.trim() : "";
    const he = typeof e.summaryHe === "string" ? e.summaryHe.trim() : "";
    if (en || he) items[slot] = { summaryEn: en, summaryHe: he };
  });
  const pickRaw = typeof data.pick === "number" ? data.pick : Number(data.pick?.n ?? data.pick?.index);
  const pick = Number.isInteger(pickRaw) && pickRaw >= 1 && pickRaw <= count ? pickRaw - 1 : null;
  return { items, pick };
}
