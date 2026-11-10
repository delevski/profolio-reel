/**
 * One shared LLM client for the daily pipeline: Mistral first, Anthropic as the fallback.
 *
 * Why: the free Mistral tier answers 429 ("Rate limit exceeded", code 1300) after roughly one
 * request per second / a small token budget per minute. The 2026-11-10 run fired ~15 calls,
 * each retried 3 times with short waits, and lost the article and the Hebrew translation.
 *
 * What it does:
 *  - every call goes through ONE serial queue (no two requests in flight) with a minimum
 *    spacing between calls (MISTRAL_MIN_INTERVAL_MS, default 2500 ms);
 *  - 429 / 5xx / network errors are retried with exponential backoff + jitter
 *    (MISTRAL_MAX_ATTEMPTS = 5, 5 s -> 60 s cap) and honour Retry-After / ratelimit-reset headers;
 *  - a total time budget (MISTRAL_TIME_BUDGET_MS, default 10 min) keeps the job well under the
 *    Actions timeout; callers can also reserve part of it for a higher-priority step
 *    (`reserveMs`) so an optional step can never starve the article or the translation;
 *  - if Mistral still fails after its retries (or its budget is gone) and ANTHROPIC_API_KEY is set,
 *    the SAME request goes to the Anthropic Messages API (same backoff rules). After one exhausted
 *    Mistral call the rest of the run goes straight to Anthropic (no point waiting again).
 *    Without ANTHROPIC_API_KEY the client behaves exactly as Mistral-only.
 *
 * Fetch, sleep, clock and randomness are injectable so the tests run instantly. Keys are never logged.
 */

export type Provider = "mistral" | "anthropic";

export type LlmConfig = {
  apiKey: string;
  baseUrl?: string;
  minIntervalMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Longest wait we will honour from a Retry-After header. */
  maxRetryAfterMs?: number;
  /** Soft budget: Mistral retries and optional steps stop here. */
  budgetMs?: number;
  /** Extra time Anthropic may use after the soft budget (the fallback must still be able to finish). */
  fallbackExtraMs?: number;
  requestTimeoutMs?: number;
  anthropic?: { apiKey: string; model?: string; baseUrl?: string; minIntervalMs?: number };
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  log?: (msg: string) => void;
};

export type ChatOptions = {
  /** Mistral model for this call. */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Budget (ms) that must stay available for later, higher-priority calls. */
  reserveMs?: number;
  /** Ask Mistral for a JSON object response. */
  json?: boolean;
  /** Label used in logs. */
  label?: string;
};

export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: "http" | "budget" | "empty" | "network",
    readonly status?: number,
    readonly provider?: Provider
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export const LLM_DEFAULTS = {
  minIntervalMs: 2500,
  maxAttempts: 5,
  baseDelayMs: 5000,
  maxDelayMs: 60000,
  maxRetryAfterMs: 90000,
  budgetMs: 10 * 60 * 1000,
  fallbackExtraMs: 5 * 60 * 1000,
  requestTimeoutMs: 120000,
  anthropicMinIntervalMs: 1000,
  summaryModel: "mistral-small-latest",
  articleModel: "mistral-large-latest",
  fallbackModel: "mistral-small-latest",
  anthropicModel: "claude-haiku-4-5",
} as const;

export type MistralModels = { summary: string; article: string; translate: string; fallback: string };

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && value.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Models from the environment (all optional; MISTRAL_API_KEY is the only required secret). */
export function mistralModelsFromEnv(env: Record<string, string | undefined>): MistralModels {
  const article = env.MISTRAL_MODEL_ARTICLE?.trim() || LLM_DEFAULTS.articleModel;
  return {
    summary: env.MISTRAL_MODEL_SUMMARY?.trim() || LLM_DEFAULTS.summaryModel,
    article,
    translate: env.MISTRAL_MODEL_TRANSLATE?.trim() || article,
    fallback: env.MISTRAL_MODEL_FALLBACK?.trim() || LLM_DEFAULTS.fallbackModel,
  };
}

export function llmConfigFromEnv(env: Record<string, string | undefined>, apiKey: string): LlmConfig {
  const anthropicKey = env.ANTHROPIC_API_KEY?.trim();
  return {
    apiKey,
    baseUrl: env.MISTRAL_API_BASE?.trim() || undefined,
    minIntervalMs: num(env.MISTRAL_MIN_INTERVAL_MS, LLM_DEFAULTS.minIntervalMs),
    maxAttempts: Math.max(1, Math.floor(num(env.MISTRAL_MAX_ATTEMPTS, LLM_DEFAULTS.maxAttempts))),
    baseDelayMs: num(env.MISTRAL_BASE_DELAY_MS, LLM_DEFAULTS.baseDelayMs),
    maxDelayMs: num(env.MISTRAL_MAX_DELAY_MS, LLM_DEFAULTS.maxDelayMs),
    budgetMs: num(env.MISTRAL_TIME_BUDGET_MS, LLM_DEFAULTS.budgetMs),
    anthropic: anthropicKey
      ? {
          apiKey: anthropicKey,
          model: env.ANTHROPIC_MODEL?.trim() || LLM_DEFAULTS.anthropicModel,
          baseUrl: env.ANTHROPIC_API_BASE?.trim() || undefined,
        }
      : undefined,
  };
}

/** Milliseconds to wait according to the response headers, or null when they say nothing. */
export function retryAfterMs(headers: Pick<Headers, "get"> | undefined, nowMs: number): number | null {
  if (!headers) return null;
  const raw = headers.get("retry-after");
  if (raw) {
    const secs = Number(raw);
    if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
    const date = Date.parse(raw);
    if (Number.isFinite(date)) return Math.max(0, date - nowMs);
  }
  for (const name of ["x-ratelimit-reset", "ratelimit-reset", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens"]) {
    const v = headers.get(name);
    if (!v) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) continue;
    // epoch seconds, or "seconds from now"
    return n > 1e9 ? Math.max(0, n * 1000 - nowMs) : n * 1000;
  }
  return null;
}

/** Exponential backoff with jitter: base * 2^(attempt-1), +/-25 %, capped. attempt starts at 1. */
export function backoffMs(attempt: number, baseMs: number, capMs: number, random: () => number): number {
  const raw = Math.min(capMs, baseMs * 2 ** (attempt - 1));
  const jitter = 0.75 + random() * 0.5;
  return Math.min(capMs, Math.round(raw * jitter));
}

type ProviderSpec = {
  name: Provider;
  minIntervalMs: number;
  model: (o: ChatOptions) => string;
  request: (system: string, user: string, o: ChatOptions) => Promise<Response>;
  extract: (data: unknown) => string | undefined;
  /** Deadline: how much time this provider may still use. */
  remaining: () => number;
};

export class LlmClient {
  readonly cfg: Required<Omit<LlmConfig, "log" | "anthropic">> & { log: (msg: string) => void; anthropic?: LlmConfig["anthropic"] };
  private readonly startedAt: number;
  private lastDoneAt: Record<Provider, number> = { mistral: -Infinity, anthropic: -Infinity };
  private tail: Promise<unknown> = Promise.resolve();
  private mistralDown = false;
  /** Counters, used by the logs and the tests. */
  stats = {
    calls: 0,
    requests: 0,
    retries: 0,
    rateLimited: 0,
    served: { mistral: 0, anthropic: 0 } as Record<Provider, number>,
  };

  constructor(config: LlmConfig) {
    const d = LLM_DEFAULTS;
    this.cfg = {
      apiKey: config.apiKey,
      baseUrl: (config.baseUrl ?? "https://api.mistral.ai").replace(/\/$/, ""),
      minIntervalMs: config.minIntervalMs ?? d.minIntervalMs,
      maxAttempts: config.maxAttempts ?? d.maxAttempts,
      baseDelayMs: config.baseDelayMs ?? d.baseDelayMs,
      maxDelayMs: config.maxDelayMs ?? d.maxDelayMs,
      maxRetryAfterMs: config.maxRetryAfterMs ?? d.maxRetryAfterMs,
      budgetMs: config.budgetMs ?? d.budgetMs,
      fallbackExtraMs: config.fallbackExtraMs ?? d.fallbackExtraMs,
      requestTimeoutMs: config.requestTimeoutMs ?? d.requestTimeoutMs,
      anthropic: config.anthropic?.apiKey ? config.anthropic : undefined,
      fetchImpl: config.fetchImpl ?? fetch,
      sleep: config.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
      now: config.now ?? Date.now,
      random: config.random ?? Math.random,
      log: config.log ?? ((m) => console.log(m)),
    };
    this.startedAt = this.cfg.now();
  }

  get hasFallback(): boolean {
    return Boolean(this.cfg.anthropic);
  }

  /** Time left in the (soft) budget. */
  remainingMs(): number {
    return this.cfg.budgetMs - (this.cfg.now() - this.startedAt);
  }

  /** Can an optional step that may need roughly `costMs` still run without eating `reserveMs`? */
  canAfford(costMs: number, reserveMs = 0): boolean {
    return this.remainingMs() - reserveMs >= costMs;
  }

  private fallbackRemainingMs(): number {
    return this.remainingMs() + this.cfg.fallbackExtraMs;
  }

  /** Queue one chat completion. Calls are strictly serial; rejects with LlmError. */
  chat(system: string, user: string, options: ChatOptions = {}): Promise<string> {
    const run = () => this.execute(system, user, options);
    const result = this.tail.then(run, run);
    this.tail = result.catch(() => undefined);
    return result;
  }

  private mistralSpec(): ProviderSpec {
    const c = this.cfg;
    return {
      name: "mistral",
      minIntervalMs: c.minIntervalMs,
      model: (o) => o.model ?? LLM_DEFAULTS.summaryModel,
      remaining: () => this.remainingMs(),
      request: (system, user, o) =>
        c.fetchImpl(`${c.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(c.requestTimeoutMs),
          body: JSON.stringify({
            model: o.model ?? LLM_DEFAULTS.summaryModel,
            temperature: o.temperature ?? 0.4,
            ...(o.maxTokens ? { max_tokens: o.maxTokens } : {}),
            ...(o.json ? { response_format: { type: "json_object" } } : {}),
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        }),
      extract: (data) => (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content,
    };
  }

  private anthropicSpec(): ProviderSpec {
    const c = this.cfg;
    const a = c.anthropic!;
    const model = a.model ?? LLM_DEFAULTS.anthropicModel;
    return {
      name: "anthropic",
      minIntervalMs: a.minIntervalMs ?? LLM_DEFAULTS.anthropicMinIntervalMs,
      model: () => model,
      remaining: () => this.fallbackRemainingMs(),
      request: (system, user, o) =>
        c.fetchImpl(`${(a.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`, {
          method: "POST",
          headers: { "x-api-key": a.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          signal: AbortSignal.timeout(c.requestTimeoutMs),
          body: JSON.stringify({
            model,
            max_tokens: o.maxTokens ?? 4096,
            temperature: o.temperature ?? 0.4,
            system,
            messages: [{ role: "user", content: user }],
          }),
        }),
      extract: (data) => {
        const blocks = (data as { content?: { type?: string; text?: string }[] }).content ?? [];
        return blocks.filter((b) => b.type === "text" || b.text).map((b) => b.text ?? "").join("");
      },
    };
  }

  private async execute(system: string, user: string, o: ChatOptions): Promise<string> {
    const label = o.label ?? "llm";
    this.stats.calls++;

    if (!this.mistralDown) {
      try {
        const out = await this.runProvider(this.mistralSpec(), system, user, o);
        this.stats.served.mistral++;
        this.cfg.log(`[llm] ${label}: served by mistral (${this.mistralSpec().model(o)})`);
        return out;
      } catch (err) {
        if (!this.hasFallback || !(err instanceof LlmError)) throw err;
        if (err.kind !== "empty" && err.status !== 400) this.mistralDown = true;
        this.cfg.log(`[llm] ${label}: mistral failed (${err.status ?? err.kind}) — using Anthropic${this.mistralDown ? " for the rest of this run" : ""}`);
      }
    }
    const spec = this.anthropicSpec();
    const out = await this.runProvider(spec, system, user, o);
    this.stats.served.anthropic++;
    this.cfg.log(`[llm] ${label}: served by anthropic (${spec.model(o)})`);
    return out;
  }

  private async runProvider(spec: ProviderSpec, system: string, user: string, o: ChatOptions): Promise<string> {
    const c = this.cfg;
    const label = `${o.label ?? "llm"}/${spec.name}`;
    const reserve = o.reserveMs ?? 0;
    let lastError: LlmError | undefined;

    for (let attempt = 1; attempt <= c.maxAttempts; attempt++) {
      // Spacing: wait out the minimum interval since this provider's previous request finished.
      const sinceLast = c.now() - this.lastDoneAt[spec.name];
      if (sinceLast < spec.minIntervalMs) await c.sleep(spec.minIntervalMs - sinceLast);
      if (spec.remaining() - reserve <= 0) {
        throw new LlmError(`${label}: time budget used up${lastError ? ` (last error: ${lastError.message})` : ""}`, "budget", lastError?.status, spec.name);
      }

      let headers: Pick<Headers, "get"> | undefined;
      try {
        this.stats.requests++;
        const res = await spec.request(system, user, o);
        this.lastDoneAt[spec.name] = c.now();
        headers = res.headers;
        if (res.ok) {
          const data = (await res.json()) as unknown;
          const content = spec.extract(data)?.trim();
          if (!content) throw new LlmError(`${label}: empty content`, "empty", res.status, spec.name);
          return content;
        }
        const body = await res.text().catch(() => "");
        lastError = new LlmError(`${spec.name} API ${res.status}: ${body.slice(0, 300)}`, "http", res.status, spec.name);
        if (res.status === 429) this.stats.rateLimited++;
        // 4xx other than 429 (and Anthropic's 529 "overloaded" is >= 500): retrying will not help.
        if (!(res.status === 429 || res.status >= 500)) throw lastError;
      } catch (err) {
        if (err instanceof LlmError) {
          const retryable = err.kind === "http" && (err.status === 429 || (err.status ?? 0) >= 500);
          if (!retryable) throw err;
          lastError = err;
        } else {
          this.lastDoneAt[spec.name] = c.now();
          lastError = new LlmError(`${label}: network error: ${err instanceof Error ? err.message : String(err)}`, "network", undefined, spec.name);
        }
      }

      if (attempt >= c.maxAttempts) break;
      const header = retryAfterMs(headers, c.now());
      let wait = backoffMs(attempt, c.baseDelayMs, c.maxDelayMs, c.random);
      if (header !== null) wait = Math.max(wait, Math.min(header + 250, c.maxRetryAfterMs));
      if (spec.remaining() - reserve < wait) {
        throw new LlmError(
          `${label}: giving up — the next retry (${Math.round(wait / 1000)} s) would not fit the time budget. Last error: ${lastError.message}`,
          "budget",
          lastError.status,
          spec.name
        );
      }
      this.stats.retries++;
      c.log(`[llm] ${label}: attempt ${attempt}/${c.maxAttempts} failed (${lastError.status ?? "network"}) — waiting ${Math.round(wait / 1000)} s${header !== null ? " (server hint honoured)" : ""}`);
      await c.sleep(wait);
    }
    throw lastError ?? new LlmError(`${label}: failed`, "network", undefined, spec.name);
  }
}
