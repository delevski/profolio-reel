import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LlmClient,
  LlmError,
  backoffMs,
  llmConfigFromEnv,
  mistralModelsFromEnv,
  retryAfterMs,
  type LlmConfig,
} from "../scripts/lib/llm";
import { buildSummaryPrompt, parseSummaryResponse } from "../scripts/lib/summaries";
import { buildFallbackArticle, checkStructure, ensureDiagram, escapeMdxProse, parseReadme } from "../scripts/lib/article";

/* ---------- a fake clock + scripted fetch so the tests run instantly ---------- */

type Step = { status: number; headers?: Record<string, string>; body?: unknown };
const rateLimited: Step = {
  status: 429,
  body: { object: "error", message: "Rate limit exceeded", type: "rate_limited", code: "1300" },
};
const mistralOk = (text = "ok"): Step => ({ status: 200, body: { choices: [{ message: { content: text } }] } });
const anthropicOk = (text = "hello from claude"): Step => ({ status: 200, body: { content: [{ type: "text", text }] } });

function harness(mistral: Step[], anthropic: Step[] = [], extra: Partial<LlmConfig> = {}) {
  let t = 1_000_000;
  const mistralTimes: number[] = [];
  const anthropicTimes: number[] = [];
  const sleeps: number[] = [];
  const logs: string[] = [];
  const bodies: { url: string; headers: Record<string, string>; body: any }[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    const isAnthropic = String(url).includes("anthropic");
    (isAnthropic ? anthropicTimes : mistralTimes).push(t);
    bodies.push({ url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    const queue = isAnthropic ? anthropic : mistral;
    const step = queue.length > 1 ? queue.shift()! : queue[0];
    t += 400; // a request takes 400 ms
    inFlight--;
    return new Response(JSON.stringify(step.body ?? {}), { status: step.status, headers: step.headers });
  }) as unknown as typeof fetch;
  const client = new LlmClient({
    apiKey: "mistral-secret-key",
    baseUrl: "https://mistral.test",
    anthropic: undefined,
    fetchImpl,
    now: () => t,
    sleep: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
    random: () => 0.5, // jitter factor exactly 1
    log: (m) => logs.push(m),
    ...extra,
  });
  return { client, mistralTimes, anthropicTimes, sleeps, logs, bodies, maxInFlight: () => maxInFlight, clock: () => t };
}

const withAnthropic = {
  anthropic: { apiKey: "anthropic-secret-key", model: "claude-test", baseUrl: "https://anthropic.test" },
};

/* ---------- Mistral client: backoff, spacing, call counts ---------- */

test("429 three times then 200: retries with exponential backoff and spacing, 4 requests", async () => {
  const h = harness([rateLimited, rateLimited, rateLimited, mistralOk("done")]);
  const out = await h.client.chat("sys", "user", { model: "mistral-small-latest", label: "t" });
  assert.equal(out, "done");
  assert.equal(h.mistralTimes.length, 4, "request count");
  assert.equal(h.client.stats.retries, 3);
  assert.equal(h.client.stats.rateLimited, 3);
  // backoff waits (jitter fixed at 1.0): 5 s, 10 s, 20 s
  const backoffs = h.sleeps.filter((ms) => ms >= 5000);
  assert.deepEqual(backoffs, [5000, 10000, 20000]);
  // every pair of requests is at least minInterval (2.5 s default) apart
  for (let i = 1; i < h.mistralTimes.length; i++) {
    assert.ok(h.mistralTimes[i] - h.mistralTimes[i - 1] >= 2500, `gap ${i}`);
  }
});

test("Retry-After is honoured when it is longer than the backoff", async () => {
  const h = harness([{ ...rateLimited, headers: { "retry-after": "30" } }, mistralOk()]);
  await h.client.chat("s", "u");
  const wait = h.sleeps.find((ms) => ms >= 5000)!;
  assert.ok(wait >= 30000 && wait <= 31000, `waited ${wait}`);
});

test("retryAfterMs reads seconds, HTTP dates and ratelimit-reset headers", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  assert.equal(retryAfterMs(h({ "retry-after": "7" }), 0), 7000);
  assert.equal(retryAfterMs(h({ "retry-after": new Date(10_000).toUTCString() }), 4_000), 6000);
  assert.equal(retryAfterMs(h({ "x-ratelimit-reset": "12" }), 0), 12000);
  assert.equal(retryAfterMs(h({ "x-ratelimit-reset": String(2_000_000_000) }), 1_999_999_000_000), 1_000_000 * 0 + Math.max(0, 2_000_000_000 * 1000 - 1_999_999_000_000));
  assert.equal(retryAfterMs(h({}), 0), null);
});

test("backoff doubles, is capped at 60 s and jitters +/-25 %", () => {
  assert.equal(backoffMs(1, 5000, 60000, () => 0.5), 5000);
  assert.equal(backoffMs(3, 5000, 60000, () => 0.5), 20000);
  assert.equal(backoffMs(6, 5000, 60000, () => 0.5), 60000);
  assert.equal(backoffMs(1, 5000, 60000, () => 0), 3750);
  assert.equal(backoffMs(1, 5000, 60000, () => 1), 6250);
});

test("429 forever: gives up after 5 attempts with the rate-limit error", async () => {
  const h = harness([rateLimited]);
  await assert.rejects(h.client.chat("s", "u"), (e: unknown) => e instanceof LlmError && e.status === 429 && e.kind === "http");
  assert.equal(h.mistralTimes.length, 5);
});

test("a 400 is not retried", async () => {
  const h = harness([{ status: 400, body: { message: "bad request" } }]);
  await assert.rejects(h.client.chat("s", "u"), /400/);
  assert.equal(h.mistralTimes.length, 1);
});

test("5xx is retried too", async () => {
  const h = harness([{ status: 503, body: {} }, mistralOk("back")]);
  assert.equal(await h.client.chat("s", "u"), "back");
  assert.equal(h.mistralTimes.length, 2);
});

test("concurrent callers are serialised: one request in flight, spaced apart", async () => {
  const h = harness([mistralOk("a")]);
  await Promise.all([h.client.chat("s", "1"), h.client.chat("s", "2"), h.client.chat("s", "3")]);
  assert.equal(h.maxInFlight(), 1);
  assert.equal(h.mistralTimes.length, 3);
  for (let i = 1; i < 3; i++) assert.ok(h.mistralTimes[i] - h.mistralTimes[i - 1] >= 2500);
});

test("time budget: stops retrying instead of overrunning, and a reserve protects later steps", async () => {
  const tight = harness([rateLimited], [], { budgetMs: 12_000 });
  await assert.rejects(tight.client.chat("s", "u"), (e: unknown) => e instanceof LlmError && e.kind === "budget");
  assert.ok(tight.mistralTimes.length < 5);
  assert.ok(tight.clock() - 1_000_000 <= 12_000 + 5_000, "never ran far past the budget");

  // 30 s budget, 25 s reserved for the translation: the 5 s first backoff does not fit -> give up at once
  const reserved = harness([rateLimited], [], { budgetMs: 30_000 });
  await assert.rejects(reserved.client.chat("s", "u", { reserveMs: 25_000 }), (e: unknown) => e instanceof LlmError && e.kind === "budget");
  assert.equal(reserved.mistralTimes.length, 1);
  assert.equal(reserved.client.canAfford(60_000), false);
});

test("a pipeline-shaped run (summaries + article + translation) is 3 requests when nothing is rate-limited", async () => {
  const h = harness([mistralOk("x")]);
  await h.client.chat("s", "summaries", { json: true });
  await h.client.chat("s", "article");
  await h.client.chat("s", "translation");
  assert.equal(h.mistralTimes.length, 3);
  assert.equal(h.client.stats.calls, 3);
  assert.equal(h.bodies[0].body.response_format.type, "json_object");
});

/* ---------- Anthropic fallback ---------- */

test("Mistral 429 forever + Anthropic key: the same request is served by Anthropic", async () => {
  const h = harness([rateLimited], [anthropicOk("claude answer")], withAnthropic);
  const out = await h.client.chat("system prompt", "user prompt", { model: "mistral-large-latest", maxTokens: 4500, label: "article" });
  assert.equal(out, "claude answer");
  assert.equal(h.mistralTimes.length, 5, "Mistral used all its attempts first");
  assert.equal(h.anthropicTimes.length, 1);
  const call = h.bodies.find((b) => b.url.includes("anthropic"))!;
  assert.equal(call.url, "https://anthropic.test/v1/messages");
  assert.equal(call.headers["x-api-key"], "anthropic-secret-key");
  assert.equal(call.headers["anthropic-version"], "2023-06-01");
  assert.equal(call.body.model, "claude-test");
  assert.equal(call.body.max_tokens, 4500);
  assert.equal(call.body.system, "system prompt");
  assert.deepEqual(call.body.messages, [{ role: "user", content: "user prompt" }]);
  assert.deepEqual(h.client.stats.served, { mistral: 0, anthropic: 1 });
  assert.ok(h.logs.some((l) => l.includes("served by anthropic")));
  assert.ok(!h.logs.join("\n").includes("secret-key"), "keys are never logged");
});

test("after Mistral is exhausted once, later calls go straight to Anthropic", async () => {
  const h = harness([rateLimited], [anthropicOk("one"), anthropicOk("two")], withAnthropic);
  assert.equal(await h.client.chat("s", "article", { label: "article" }), "one");
  const mistralRequests = h.mistralTimes.length;
  assert.equal(await h.client.chat("s", "translation", { label: "translation" }), "two");
  assert.equal(h.mistralTimes.length, mistralRequests, "no further Mistral requests");
  assert.equal(h.anthropicTimes.length, 2);
});

test("Mistral that works never touches Anthropic", async () => {
  const h = harness([mistralOk("fine")], [anthropicOk()], withAnthropic);
  assert.equal(await h.client.chat("s", "u"), "fine");
  assert.equal(h.anthropicTimes.length, 0);
});

test("Anthropic is retried with the same backoff rules (429 then 200)", async () => {
  const h = harness([rateLimited], [{ status: 429, headers: { "retry-after": "20" }, body: {} }, anthropicOk("late but fine")], withAnthropic);
  assert.equal(await h.client.chat("s", "u"), "late but fine");
  assert.equal(h.anthropicTimes.length, 2);
  assert.ok(h.sleeps.some((ms) => ms >= 20000 && ms < 21000), "Retry-After honoured on Anthropic too");
});

test("Mistral out of time budget falls back to Anthropic, which may use the extra fallback time", async () => {
  const h = harness([rateLimited], [anthropicOk("rescued")], { ...withAnthropic, budgetMs: 8_000, fallbackExtraMs: 120_000 });
  assert.equal(await h.client.chat("s", "u"), "rescued");
  assert.equal(h.client.stats.served.anthropic, 1);
});

test("no ANTHROPIC_API_KEY: behaves exactly as Mistral-only", async () => {
  const h = harness([rateLimited], [anthropicOk()]);
  assert.equal(h.client.hasFallback, false);
  await assert.rejects(h.client.chat("s", "u"), /429/);
  assert.equal(h.anthropicTimes.length, 0);
});

test("env config: defaults, overrides and the optional Anthropic fallback", () => {
  const c = llmConfigFromEnv({}, "k");
  assert.equal(c.minIntervalMs, 2500);
  assert.equal(c.maxAttempts, 5);
  assert.equal(c.budgetMs, 600000);
  assert.equal(c.anthropic, undefined);
  const c2 = llmConfigFromEnv({ MISTRAL_MIN_INTERVAL_MS: "4000", MISTRAL_MAX_ATTEMPTS: "3", ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL: "m" }, "k");
  assert.equal(c2.minIntervalMs, 4000);
  assert.equal(c2.maxAttempts, 3);
  assert.deepEqual({ k: c2.anthropic?.apiKey, m: c2.anthropic?.model }, { k: "a", m: "m" });
  assert.equal(llmConfigFromEnv({ MISTRAL_MIN_INTERVAL_MS: "nope" }, "k").minIntervalMs, 2500);
  const m = mistralModelsFromEnv({});
  assert.deepEqual(m, { summary: "mistral-small-latest", article: "mistral-large-latest", translate: "mistral-large-latest", fallback: "mistral-small-latest" });
  assert.equal(mistralModelsFromEnv({ MISTRAL_MODEL_ARTICLE: "x" }).translate, "x");
});

/* ---------- batched summaries ---------- */

test("batched summaries: one prompt for all trends, parsed back by number, with the pick", () => {
  const trends = Array.from({ length: 10 }, (_, i) => ({
    source: i < 5 ? "github" : "huggingface",
    title: `org/repo-${i + 1}`,
    description: `desc ${i + 1}`,
    href: `https://example.com/${i + 1}`,
    covered: i === 2,
  }));
  const prompt = buildSummaryPrompt(trends, { pick: true });
  for (const t of trends) assert.ok(prompt.includes(t.title));
  assert.ok(prompt.includes("ALREADY COVERED"));
  assert.ok(prompt.includes('"pick"'));
  assert.ok(!buildSummaryPrompt(trends, { pick: false }).includes('"pick"'));

  const answer = JSON.stringify({
    items: trends.map((_, i) => ({ n: i + 1, summaryEn: `en ${i + 1}`, summaryHe: `he ${i + 1}` })),
    pick: { n: 4, why: "because" },
  });
  const parsed = parseSummaryResponse("```json\n" + answer + "\n```", 10);
  assert.equal(parsed.items.length, 10);
  assert.deepEqual(parsed.items[6], { summaryEn: "en 7", summaryHe: "he 7" });
  assert.equal(parsed.pick, 3);
});

test("batched summaries: tolerant of gaps, bad numbers and a missing pick", () => {
  const parsed = parseSummaryResponse(
    JSON.stringify({ items: [{ n: 2, summaryEn: "two", summaryHe: "שתיים" }, "junk", { n: 99, summaryEn: "x" }], pick: { n: 42 } }),
    3
  );
  assert.equal(parsed.items[1]?.summaryEn, "two");
  assert.equal(parsed.items[0], null);
  assert.equal(parsed.items[2]?.summaryEn, "x"); // bad number -> falls back to its position
  assert.equal(parsed.pick, null);
  assert.throws(() => parseSummaryResponse("not json at all", 3));
});

/* ---------- fallback article ---------- */

const README = `# Astryx

[![build](https://img.shields.io/badge.svg)](https://x.y)

Astryx is a toolkit for running {agent} workflows locally with a small <Runtime> that keeps state between steps.

## Features

- Local first execution of workflows with a plain configuration file and no hosted service required for the basics.
- A scheduler that retries failed steps and records each result so that runs can be inspected afterwards by hand.

Every step runs in an isolated process, which keeps a failing step from taking down the rest of the workflow and makes it easier to reason about.

## Architecture

The runtime reads a workflow definition, builds a dependency graph of steps and hands each step to a worker process. Results are written to a local store that the CLI can query.

## Installation

\`\`\`bash
pip install astryx
astryx init my-flow
\`\`\`

## License

MIT
`;

test("fallback article is a real structured post, not a stub", () => {
  const fb = buildFallbackArticle({
    title: "meta/astryx",
    href: "https://github.com/meta/astryx",
    source: "github",
    summary: "A toolkit for running agent workflows locally.",
    language: "Python",
    stars: 4200,
    material: README,
  });
  const withDiagram = ensureDiagram(fb.content, "en");
  const report = checkStructure(withDiagram.content);
  assert.ok(report.words >= 250, `only ${report.words} words`);
  assert.ok(report.h2 >= 5, `h2 ${report.h2}`);
  assert.ok(report.mermaid >= 1);
  assert.match(fb.content, /pip install astryx/);
  assert.match(fb.content, /https:\/\/github\.com\/meta\/astryx/);
  assert.match(fb.content, /4,200 stars/);
  // MDX-safe prose: no raw braces or angle brackets outside code
  const prose = fb.content.split(/```[\s\S]*?```/).join("");
  assert.ok(!/[{}<]/.test(prose), "braces/angle brackets must be escaped for MDX");
});

test("fallback article without any README still has the full section skeleton", () => {
  const fb = buildFallbackArticle({
    title: "org/model",
    href: "https://huggingface.co/org/model",
    source: "huggingface",
    summary: "Trending Hugging Face model (text-generation).",
    tag: "text-generation",
    downloads: 12345,
  });
  const report = checkStructure(ensureDiagram(fb.content).content);
  assert.ok(report.h2 >= 5);
  assert.ok(report.words >= 120);
  assert.match(fb.content, /12,345 downloads/);
});

test("README parser and MDX escaping", () => {
  const parsed = parseReadme(README);
  assert.ok(parsed.sections.some((s) => /Installation/.test(s.heading) && s.code.length === 1));
  assert.equal(escapeMdxProse("a {b} <c>\n```\n{keep}\n```\n`{x}` {y}"), "a &#123;b&#125; &lt;c>\n```\n{keep}\n```\n`{x}` &#123;y&#125;");
});
