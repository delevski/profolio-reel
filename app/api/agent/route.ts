import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/agent/knowledge";
import { matchFaq, type AgentLink } from "@/lib/agent/faq";
import { defaultLocale, isValidLocale, type Locale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

type AgentRequest = {
  messages?: ChatMessage[];
  locale?: string;
};

// --- Best-effort in-memory guards (per serverless instance) ---

const cache = new Map<string, { reply: string; links: AgentLink[]; at: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const CACHE_MAX = 200;

const hits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 1000 * 60 * 60;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function cacheKey(locale: Locale, question: string): string {
  return `${locale}:${question.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

function readCache(locale: Locale, question: string) {
  const entry = cache.get(cacheKey(locale, question));
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(cacheKey(locale, question));
    return null;
  }
  return entry;
}

function writeCache(locale: Locale, question: string, reply: string, links: AgentLink[]) {
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(cacheKey(locale, question), { reply, links, at: Date.now() });
}

// --- OpenRouter (free tier) ---

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "inclusionai/ling-3.0-flash-fin:free";

async function askOpenRouter(
  locale: Locale,
  history: ChatMessage[]
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ordelwebsite.vercel.app";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": siteUrl,
        "X-Title": "ORDEL site assistant",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0.4,
        messages: [
          { role: "system", content: buildSystemPrompt(locale) },
          ...history.slice(-6),
        ],
      }),
    });

    if (!res.ok) {
      console.warn(
        JSON.stringify({ route: "/api/agent", openrouter_status: res.status })
      );
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (error) {
    console.warn(
      JSON.stringify({
        route: "/api/agent",
        openrouter_error: error instanceof Error ? error.message : "unknown",
      })
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Link extraction: pull [label](path) pairs out so the client can render chips ---

function extractLinks(text: string, locale: Locale): AgentLink[] {
  const links: AgentLink[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const href = match[2];
    if (href.startsWith("/") && !href.startsWith("//")) {
      links.push({ href, label: match[1] });
    }
  }
  const seen = new Set<string>();
  return links.filter((l) => {
    const key = `${l.href}|${l.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3).map((l) => l);
}

function fallbackAnswer(locale: Locale): { reply: string; links: AgentLink[] } {
  return locale === "he"
    ? {
        reply:
          "שאלה טובה - אין לי עליה מידע מדויק כרגע. אפשר לשאול אותי על הניסיון של אור, הפרויקטים, כישורי ה-AI או דרכי יצירת קשר, ואשמח לכוון לעמוד הנכון.",
        links: [
          { href: "/about", label: "על אור" },
          { href: "/contact", label: "יצירת קשר" },
        ],
      }
    : {
        reply:
          "Good question - I don't have exact information on that right now. You can ask me about Or's experience, projects, AI skills or how to reach him, and I'll point you to the right page.",
        links: [
          { href: "/about", label: "About Or" },
          { href: "/contact", label: "Contact" },
        ],
      };
}

export async function POST(request: Request) {
  const start = Date.now();

  let body: AgentRequest;
  try {
    body = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const locale: Locale =
    body.locale && isValidLocale(body.locale)
      ? (body.locale as Locale)
      : defaultLocale;

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const history = messages
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-6);
  const lastUser = [...history].reverse().find((m) => m.role === "user");

  if (!lastUser || !lastUser.content.trim()) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  const question = lastUser.content.trim().slice(0, 500);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (rateLimited(ip)) {
    const limited =
      locale === "he"
        ? "הגעתם למגבלת השאלות לשעה הזו. אפשר תמיד למצוא את אור דרך עמוד יצירת הקשר."
        : "You've reached this hour's question limit. You can always reach Or through the contact page.";
    return NextResponse.json({
      reply: limited,
      links: [
        { href: "/contact", label: locale === "he" ? "יצירת קשר" : "Contact" },
      ],
      source: "rate-limit",
    });
  }

  // 1. Exact-match cache (free, instant)
  const cached = readCache(locale, question);
  if (cached) {
    return NextResponse.json({
      reply: cached.reply,
      links: cached.links,
      source: "cache",
    });
  }

  // 2. Curated recruiter FAQ (free, instant, always on-message)
  const faq = matchFaq(question, locale);
  if (faq) {
    writeCache(locale, question, faq.answer, faq.links);
    return NextResponse.json({
      reply: faq.answer,
      links: faq.links,
      source: "faq",
    });
  }

  // 3. LLM over the baked site knowledge (OpenRouter free tier)
  const llmReply = await askOpenRouter(locale, [
    ...history.slice(0, -1),
    { role: "user", content: question },
  ]);

  if (llmReply) {
    const links = extractLinks(llmReply, locale);
    writeCache(locale, question, llmReply, links);
    console.info(
      JSON.stringify({
        route: "/api/agent",
        source: "llm",
        durationMs: Date.now() - start,
      })
    );
    return NextResponse.json({ reply: llmReply, links, source: "llm" });
  }

  // 4. No key / provider down: stay useful and honest
  const fallback = fallbackAnswer(locale);
  return NextResponse.json({ ...fallback, source: "fallback" });
}
