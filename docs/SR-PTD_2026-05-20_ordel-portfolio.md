# SR-PTD: Ordel portfolio — full build history

**Date:** 2026-05-20  
**Sessions:** 1 (greenfield) + 2 (content migration)

## Session 1 — Greenfield (yuv.ai-inspired)

**Trigger:** Build personal portfolio like [yuv.ai](https://yuv.ai/) with Ordel branding.

**Outcome:**

- Next.js 16 App Router scaffold
- Design: stone-950, amber, teal; DM Sans + Fraunces
- Homepage: Hero, Marquee, Blog, Learn, Trends, YouTube, Apps, Projects, Academy, Testimonials, Connect
- Routes: about, blog, learn, academy, projects, apps, contact, privacy
- `lib/content.ts` + `lib/constants.ts` (server-only split)
- 3 blog + 3 learn MDX (demo)
- `GET /api/trends` mock
- `npm run build` + `npm run lint` pass

**Placeholder identity:** “Or Del” — replaced in session 2.

## Session 2 — Content migration

**Trigger:** Populate from [protfolio-tau-puce.vercel.app](https://protfolio-tau-puce.vercel.app/); add CV download.

**Outcome:**

- Or Delevski identity, CTO / VP R&D
- `site.en.json` + `site.he.json` — experience, contact, social
- 17 projects with GitHub / demo / Play Store
- `public/Or-Delevski-CV.pdf` — Hero + About download
- `ExperienceSection` on About
- Contact: `ordi1985@gmail.com`, mailto form
- Skipped: AI News in-app

**Scrape:** `.firecrawl/portfolio.json`

## Key technical decisions

- `server-only` on `lib/content.ts`
- MDX: `next-mdx-remote/rsc` + gray-matter
- i18n: `app/[locale]/` + split site/messages JSON

## Customize

- `content/site.{en,he}.json` — bio, experience
- `content/projects.json` — portfolio
- `messages/{locale}.json` — UI labels
- `public/Or-Delevski-CV.pdf` — CV

## See also

- [session-history.md](session-history.md) — all sessions including agent memory
- [current-state.md](current-state.md) — live status
