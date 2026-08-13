**Date:** 2026-08-13
**Focus:** Hide homepage Featured Videos section

## What happened
- Removed `YouTubeSection` from `app/[locale]/page.tsx`.
- Stopped loading `getVideos()` on the homepage.
- Left `components/sections/YouTubeSection.tsx`, `content/videos.json`, and dictionary keys in place for easy future restore.

## Verification
- `npm run lint` passed.
- `npm run build` passed.

---

**Date:** 2026-07-16  
**Focus:** Full Hebrew localization: trends, RTL headers, testimonials, blog posts

## What happened
- Trends bilingual (`{ en, he }` in trends.json; `summary_he` in Supabase); `/api/trends?locale=`
- RTL header fix: removed double-reversal (`flex-row-reverse` on top of `dir=rtl`); `SectionHeaderFrame` takes `dir`
- Testimonials: `quote`/`role`/`relation` are now `LocalizedString`; translated to Hebrew
- Blog: Hebrew overrides at `content/blog/he/<slug>.mdx` (title/excerpt/content); Supabase `auto_posts` gained `title_he`/`excerpt_he`/`content_he`; pipeline translates new posts via Mistral
- Translated all 5 existing posts to Hebrew
- Deployed to production twice (RTL fix, then localization) and verified live

## Outcome
- https://ordelwebsite.vercel.app/he — trends, testimonials, and all blog posts in Hebrew; headers right-aligned with action arrows on the left

## Also localized (second round)
- Learn guides: `content/learn/he/<slug>.mdx` overrides (title/excerpt/body/difficulty/category/tags)
- Academy courses: `courses.json` fields → `{ en, he }`
- Committed as `24bb13f` and deployed; verified live on `/he/learn` + `/he/academy`

## Third round
- Apps cards localized; reel locale-exit fix committed separately
- Commits: `24bb13f` (i18n main), `3f8a7a6` (reel), `935b690` (apps i18n) — all local, not pushed
- Deployed + verified `/he/apps`

## Open items
- [ ] Push to remote when asked
- [ ] If Supabase gets wired: run the `title_he/excerpt_he/content_he` migration in schema.sql
