# Daily AI Trends automation

Pipeline that runs every morning (~07:00 Israel / `0 4 * * *` UTC) via GitHub Actions.

## What it does

1. Scrapes top GitHub trending repos (AI-filtered) + Hugging Face trending models (5 each)
2. Summarizes each with Mistral (English card copy + Hebrew for-dummies line)
3. Replaces today's rows in Supabase `trends`
4. Picks the most important **new** trend (skips if already blogged via `source_href`)
5. Writes an English markdown blog post tagged `AI Trend Digest` into `auto_posts`
6. Emails a styled Hebrew digest to `orworkdelevski@gmail.com` via Resend
7. On failure, emails an alert and fails the Actions run

## One-time setup

### 1. Supabase

1. Open your existing Supabase project → SQL editor
2. Paste and run [`supabase/schema.sql`](../supabase/schema.sql)
3. Copy **Project URL**, **anon public** key, and **service_role** key

### 2. Resend

1. Create a free Resend account
2. Create an API key
3. Until a custom domain is verified, use `onboarding@resend.dev` as the from-address (can only send to your own inbox)

### 3. GitHub repo secrets

Settings → Secrets and variables → Actions. Add:

| Secret | Value |
|--------|--------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (write access) |
| `MISTRAL_API_KEY` | Mistral API key |
| `RESEND_API_KEY` | Resend API key |

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
