import knowledge from "./knowledge.generated.json";

export type KnowledgeChunk = {
  id: string;
  lang: "en" | "he";
  source: string;
  title: string;
  url: string;
  text: string;
  boost: number;
};

const CHUNKS = (knowledge as { chunks: KnowledgeChunk[] }).chunks;

const STOP = new Set(
  "a an the and or of to in on for with is are was were be been it its this that what who whom how why when where which do does did can could would should you your i me my we our he his she her they them about tell please from by at as".split(" ")
    .concat("של את על עם זה זו מה מי איך למה מתי איפה הוא היא הם הן אני אתה את אנחנו יש אין גם או כל לי לו לה שלו שלה עוד רק".split(" ")),
);

/** Lower-case, split, drop stop-words; strip common Hebrew one-letter prefixes (ה ו ב ל מ ש כ). */
export function tokenize(s: string): string[] {
  const words = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.$]+/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[.]+|[.]+$/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w));
  const out: string[] = [];
  for (const w of words) {
    out.push(w);
    if (/^[הובלמשכ][\u0590-\u05FF]{2,}$/.test(w)) out.push(w.slice(1));
    if (/^[a-z]{5,}s$/.test(w)) out.push(w.slice(0, -1));
  }
  return out;
}

const DF = new Map<string, number>();
const TOKENS = CHUNKS.map((c) => {
  const toks = tokenize(`${c.title} ${c.text}`);
  for (const t of new Set(toks)) DF.set(t, (DF.get(t) ?? 0) + 1);
  return toks;
});
const N = CHUNKS.length || 1;
const AVG = TOKENS.reduce((a, t) => a + t.length, 0) / N || 1;

/** BM25-lite keyword scoring over the build-time knowledge chunks. */
export function retrieve(query: string, lang: "en" | "he", k = 6): KnowledgeChunk[] {
  const q = [...new Set(tokenize(query))];
  const scored = CHUNKS.map((c, i) => {
    const toks = TOKENS[i];
    let s = 0;
    for (const term of q) {
      let tf = 0;
      for (const t of toks) if (t === term || (term.length > 3 && t.startsWith(term))) tf++;
      if (!tf) continue;
      const idf = Math.log(1 + (N - (DF.get(term) ?? 0) + 0.5) / ((DF.get(term) ?? 0) + 0.5));
      s += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (toks.length / AVG))));
    }
    s *= c.boost;
    if (c.lang === lang) s *= 1.25;
    return { c, s };
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const picked = scored.slice(0, k).map((x) => x.c);
  // Always give the model the core profile (home page "about/experience") for the page language.
  const core = CHUNKS.filter((c) => c.lang === lang && /^home:(about|experience|hero|top|contact)/.test(c.source)).slice(0, 3);
  for (const c of core) if (!picked.includes(c) && picked.length < k + 3) picked.push(c);
  return picked;
}

export const knowledgeSize = CHUNKS.length;
