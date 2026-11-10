# Daily AI Trends automation

Pipeline that runs every morning (~07:00 Israel / `0 4 * * *` UTC) via GitHub Actions.

## What it does

1. Scrapes top GitHub trending repos (AI-filtered) + Hugging Face trending models (5 each)
2. Summarizes all 10 in **one** batched Mistral call (English card copy + Hebrew for-dummies line) that also picks the trend of the day (see *Rate limits*)
3. Replaces today's rows in Supabase `trends`
4. Uses that pick for the most important **new** trend (skips if already blogged via `source_href`)
5. Writes a real English article (intro, *Why it matters*, *How it works* with a Mermaid diagram, *How to try it*, *Who it's for*, *Links*; ~800–1100 words, grounded in the project's README / model card) plus a Hebrew translation, tagged `AI Trend Digest`, together with a **cover image** (see below)
6. Writes the day's digest to `content/ai-trends/YYYY-MM-DD.json` and the workflow commits it (plus the blog post and `content/trends.json`) to `main`, which redeploys the site — this is what the **/ai-trends** page shows
7. Emails a styled Hebrew digest to `orworkdelevski@gmail.com` via Resend
8. On failure, emails an alert and fails the Actions run

## The AI Trends page (`/en/ai-trends`, `/he/ai-trends`)

The page reads `content/ai-trends/*.json` at build time (`lib/ai-trends.ts`), newest first. The old `/academy` URLs redirect to it.
The daily workflow needs **no extra secret** for this: it commits with the built-in `GITHUB_TOKEN`
(`permissions: contents: write` in the workflow). If `main` is ever protected, allow `github-actions[bot]` to push or switch the commit step to a PR.

One file per day, `content/ai-trends/YYYY-MM-DD.json`:

```json
{
  "date": "2026-11-09",
  "trendOfTheDay": {
    "slug": "2026-11-09-anthropics-skills-why-it-matters",
    "title": "…", "titleHe": "…", "excerpt": "…", "excerptHe": "…",
    "sourceHref": "https://github.com/anthropics/skills",
    "image": "/blog/ai-trends/2026-11-09-anthropics-skills-why-it-matters.webp",
    "imageAlt": "Abstract illustration for: …"
  },
  "items": [
    {
      "id": "2026-11-09-github-1",
      "source": "github",
      "title": "anthropics/skills",
      "href": "https://github.com/anthropics/skills",
      "stars": 12345,
      "language": "Python",
      "imageUrl": "https://opengraph.githubassets.com/1/anthropics/skills",
      "summary": { "en": "…", "he": "…" }
    }
  ]
}
```

`language` (GitHub) and `tag` / `downloads` (Hugging Face) are optional and feed the badges and the comparison table on the post page. `trendOfTheDay.image` is optional.
`trendOfTheDay` may be `null` (every trend already covered); `titleHe`/`excerptHe` are optional; `source` is `github` or `huggingface`.
`npm run test:ai-trends` checks every file against this schema and that each `trendOfTheDay.slug` has a blog post.

## One-time setup

> Note: if `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are **not** set as repo secrets (as of 2026-11-09 they are empty in the workflow log), the pipeline runs in file mode: everything above is written to `content/` and committed. Supabase is optional.

### 1. Supabase

1. Open your existing Supabase project → SQL editor
2. Paste and run [`supabase/schema.sql`](../supabase/schema.sql)
3. Copy **Project URL**, **anon public** key, and **service_role** key

3. Resend

1. Create a free Resend account
2. Create an API key
3. Until a custom domain is verified, `onboarding@resend.dev` can only email **the Resend account owner** (currently `ordi21@walla.co.il`). To send to `orworkdelevski@gmail.com`, verify a domain at resend.com/domains.

### 3. GitHub repo secrets

Settings → Secrets and variables → Actions. Add:

| Secret | Value |
|--------|--------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (write access) |
| `MISTRAL_API_KEY` | Mistral API key |
| `RESEND_API_KEY` | Resend API key |
| `ANTHROPIC_API_KEY` *(optional)* | Anthropic API key — fallback when Mistral is rate-limited (see 3d) |

### 3b. Cover images (optional secret)

Every auto-generated post gets a 1200×630 WebP cover at `public/blog/ai-trends/<slug>.webp` (committed with the post, also its `og:image`).

* **No image secret set (default):** the cover is drawn in code — the post title plus abstract shapes in the brand blue `#2563eb` and orange `#dc5a2c`. Deterministic, always present, never a broken image.
* **To get AI-generated illustrations instead**, add ONE optional secret (Settings → Secrets and variables → Actions → *New repository secret*):

| Secret | Provider | Rough cost |
|--------|----------|------------|
| `FAL_KEY` *(recommended)* | fal.ai, FLUX schnell, key from fal.ai/dashboard/keys | ≈ $0.003 per image |
| `GEMINI_API_KEY` | Google AI Studio, `gemini-2.5-flash-image` (needs billing enabled) | ≈ $0.04 per image |
| `OPENAI_API_KEY` | OpenAI `gpt-image-1` (low quality; needs org verification) | ≈ $0.01–0.02 per image |

  If several are set, the first in that order is used. The prompt is built from the post (title, excerpt, an LLM-written visual metaphor): editorial abstract tech illustration, brand colors, no text in the image.
* **The image step can never fail the run:** any provider error, timeout or undecodable image is logged (`[cover] AI image failed — using the branded fallback`) and the branded cover is used.
* Regenerate one post's cover (or reading time) by hand: `npm run cover -- <slug>` (`--fallback` forces the branded cover).

### 3c. Post rendering

Blog posts (all of them, not only trend posts) show: reading time computed from the word count (200 wpm English / 180 wpm Hebrew, code and diagrams excluded; "6 min read" / "6 דקות קריאה"), a table of contents built from the `##`/`###` headings (sticky on desktop, collapsible on mobile), and ```` ```mermaid ```` blocks rendered as diagrams in the browser (lazy-loaded, light/dark aware, kept left-to-right on Hebrew pages; a diagram that fails to parse falls back to showing its source). Trend-of-the-day posts also get a stats card (stars/likes, language or task type) and a comparison table of that day's GitHub / Hugging Face items, read from `content/ai-trends/<date>.json`.

### 3d. Rate limits, fallback provider and re-running a day

Mistral's free tier allows roughly one request per second and few tokens per minute; the 2026-11-10 run fired ~15 calls and lost the article and the Hebrew translation (`429 Rate limit exceeded`, code 1300). All model calls now go through one client (`scripts/lib/llm.ts`):

* **One queue, spaced calls:** strictly one request at a time, at least `MISTRAL_MIN_INTERVAL_MS` (default 2500 ms) apart.
* **Retries:** 429 / 5xx / network errors are retried up to `MISTRAL_MAX_ATTEMPTS` (5) with exponential backoff and jitter (5 s → 60 s cap); `Retry-After` / ratelimit-reset headers are honoured.
* **Time budget:** `MISTRAL_TIME_BUDGET_MS` (default 10 min) bounds all retrying; the job timeout is 20 min. Optional steps (the cover-concept call) are skipped when the budget is low, and the summaries step can never use the time reserved for the article and the translation.
* **Calls per run:** before ≈ 14 (10 summaries + pick + 1–2 article drafts + translation + cover concept when an image key exists), each retried up to 3×. Now **3** (1 batched summaries+pick, 1 article, 1 translation), **4** with an image key, at most 5–6 when the article draft needs a second try.
* **Models (all optional repo *variables*, not secrets):** `MISTRAL_MODEL_SUMMARY` (default `mistral-small-latest`), `MISTRAL_MODEL_ARTICLE` (`mistral-large-latest`), `MISTRAL_MODEL_TRANSLATE` (= article model), `MISTRAL_MODEL_FALLBACK` (`mistral-small-latest`, used for a second article draft / retranslation after a rate-limit failure). Settings → Secrets and variables → Actions → **Variables**.
* **Anthropic fallback (optional):** add the repo secret `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions → *New repository secret*). If Mistral is still failing after its retries (429 / 5xx / timeout), or its time budget is used up, the *same request* is sent to the Anthropic Messages API (model `ANTHROPIC_MODEL`, default `claude-haiku-4-5`, a variable) with the same backoff rules, and the rest of the run goes straight to Anthropic. The log says which provider served every step (`[llm] article(1): served by anthropic (…)`) and never prints a key. Without `ANTHROPIC_API_KEY` the pipeline is Mistral-only, exactly as before.
* **Better fallback article:** if no model delivers the article, the post is built from the README / model card the job already fetched (intro, why it matters, README sections, install snippet, links, diagram) instead of a stub, and the Hebrew translation is still attempted separately.

**Regenerate a day's post** (e.g. a day that fell back to the stub): Actions → *Daily AI Trends* → *Run workflow* → fill **regenerate_date** (e.g. `2026-11-10`). It reads that day's `content/ai-trends/<date>.json`, keeps the same trend and the same post URL (slug), rebuilds the summaries, English article, Hebrew version and cover, overwrites the files and commits. It does not re-send the digest email and does not touch `content/trends.json` if a newer digest exists. Locally: `REGENERATE_DATE=2026-11-10 npm run trends:daily`.

### 4. Vercel env (site reads)

In the Vercel project settings, add:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | same project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

Redeploy after adding.

## Local run

```bash
cp .env.example .env.local
# fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MISTRAL_API_KEY, RESEND_API_KEY

# load env then:
export $(grep -v '^#' .env.local | xargs)
npm run trends:daily
```

Or trigger **Daily AI Trends** → Run workflow in the GitHub Actions UI.

## Fallback

If Supabase env vars are missing or tables are empty, `/api/trends` and the blog list fall back to `content/trends.json` and MDX posts only.
