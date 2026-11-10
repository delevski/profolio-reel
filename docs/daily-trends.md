# Daily AI Trends automation

Pipeline that runs every morning (~07:00 Israel / `0 4 * * *` UTC) via GitHub Actions.

## What it does

1. Scrapes top GitHub trending repos (AI-filtered) + Hugging Face trending models (5 each)
2. Summarizes each with Mistral (English card copy + Hebrew for-dummies line)
3. Replaces today's rows in Supabase `trends`
4. Picks the most important **new** trend (skips if already blogged via `source_href`)
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
