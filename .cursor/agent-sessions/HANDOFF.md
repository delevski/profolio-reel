# Agent Handoff

## Last updated
2026-08-13 09:35

## Current goal
Projects page GitHub refresh

## Status
Implemented locally; verify/deploy status should be checked from the latest session output.

## What was done
- Refreshed the projects page content from the current public `delevski` GitHub repo list.
- `content/projects.json` now has 41 cards, 36 GitHub links, 19 verified Live Demo links, and an image for every project.
- Captured demo-backed previews in `public/projects/*.png`; repo-only cards use GitHub OpenGraph.
- Removed stale demo links for `Do Your Image` and `OCR Extractor` because their old Vercel URLs returned 404.
- Renamed the Apps homepage/page section to “Templates & Commercial Apps” with the requested subtitle.
- Replaced `content/apps.json` with four live demo links and local preview image paths.
- Added `public/apps/*.png` screenshots for the four app/template cards.
- Updated `AppCard` to show preview images and open live links in a new tab.
- Removed `YouTubeSection` and `getVideos()` from `app/[locale]/page.tsx`, so `/en` and `/he` no longer render the Featured Videos / YouTube section.
- Left the section component, video content JSON, and dictionary keys in the repo for easy future re-enable.
- Ran `npm run lint` and `npm run build` successfully after installing local dependencies.

## Prior context
- Trends bilingual: `content/trends.json` descriptions `{ en, he }`; Supabase uses `summary_he`; `/api/trends?locale=`; `TrendsSection` refetches on language switch
- RTL fix: `/he` sets `document.dir=rtl` (`SetHtmlLangDir`), so per-element `flex-row-reverse` was double-reversing. Removed manual reversal from `Section`, `PageHeader`, `TrendsSection`; `SectionHeaderFrame` now accepts `dir`
- Testimonials: `quote`/`role`/`relation` → `LocalizedString` in `content/testimonials.json`; `getTestimonials(locale)` returns `TestimonialView`
- Blog bilingual: Hebrew overrides in `content/blog/he/<slug>.mdx` (frontmatter title/excerpt + body; metadata inherited from EN file); all 5 existing posts translated; `getBlogPosts(locale)` / `getBlogPost(slug, locale)`
- Supabase `auto_posts` schema + type gained `title_he`/`excerpt_he`/`content_he` (migration comment in `supabase/schema.sql` — must run if DB gets wired)
- Pipeline (`scripts/daily-trends.ts`): translates each new post to Hebrew via Mistral; writes `content/blog/he/<slug>.mdx` in file-fallback or `*_he` columns in Supabase

## Files touched
- `lib/types.ts`, `lib/content.ts`, `lib/supabase.ts`, `app/api/trends/route.ts`
- `components/ui/Section.tsx`, `components/ui/SectionHeaderFrame.tsx`, `components/ui/PageHeader.tsx`
- `components/sections/TrendsSection.tsx`, `components/sections/TestimonialsSection.tsx`, `components/sections/BlogPreview.tsx`
- `app/[locale]/blog/page.tsx`, `app/[locale]/blog/[slug]/page.tsx`
- `content/trends.json`, `content/testimonials.json`, `content/blog/he/*.mdx` (new)
- `scripts/daily-trends.ts`, `supabase/schema.sql`, `messages/he.json`

## Verification
- eslint + next build pass; local browser: `/he` trends/testimonials/blog all Hebrew, headers right-aligned
- Deployed to prod and verified: Hebrew testimonial roles + post titles present in live HTML

## Second round (same day)
- Learn guides localized via `content/learn/he/<slug>.mdx`; academy courses via `{ en, he }` in `courses.json`
- `applyHebrewMdxOverride` generalized to any content subdir (also overrides difficulty/category/tags)
- Committed `24bb13f` (i18n) with `/usr/bin/git` (wrapper injects broken `--trailer`); deployed + verified live

## Third round (same day)
- Apps cards localized (`apps.json` tagline/description → `{ en, he }`, `getApps(locale)`)
- Reel locale-exit fix committed separately as `3f8a7a6`; apps i18n as `935b690`
- Deployed + verified live on `/he/apps`
- Note: heredoc commit messages with apostrophes break the shell wrapper — avoid apostrophes; use `/usr/bin/git commit` (wrapper injects broken `--trailer`)

## Fourth round (same day)
- Replaced placeholder testimonials with 3 real client reviews (Yuval Avraham featured, Oren Levi, Noa Cohen) — Hebrew source from user, English translations added; names now `LocalizedString`, `company` optional
- Section subtitle updated to "clients and business owners" in both languages
- Deployed + verified live in both locales; NOT committed yet

## Open items
- [ ] Commit testimonials replacement when asked
- [ ] Push to remote when asked (3 local commits: `24bb13f`, `3f8a7a6`, `935b690`)
- [ ] `.env.example` + `docs/daily-trends.md` small diffs uncommitted (Resend email note)
- [ ] Supabase migration (`title_he` etc.) if DB gets wired; Resend domain still pending

## Next session should
1. Keep the homepage YouTube section hidden unless user asks to restore it.
2. If restoring it, localize `videos.json` first; the old video titles were English-only placeholder content.
