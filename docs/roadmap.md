# Roadmap

Prioritized work. See [session-history.md](session-history.md) for what is already done.

## Completed

| Milestone | Session | Date |
|-----------|---------|------|
| Greenfield Next.js portfolio (yuv.ai IA) | 1 | 2026-05-20 |
| Bilingual en/he routes + dictionaries | 2 | 2026-05-20 |
| Real identity, experience, 17 projects | 2 | 2026-05-20 |
| CV download (`Or-Delevski-CV.pdf`) | 2 | 2026-05-20 |
| About + ExperienceSection + contact mailto | 2 | 2026-05-20 |
| MDX blog/learn (demo articles) | 1 | 2026-05-20 |
| Mock `/api/trends` | 1 | 2026-05-20 |
| SEO sitemap + robots | 1 | 2026-05-20 |
| Session continuity hooks + skill | 3 | 2026-05-20 |
| Project memory `docs/` + rules | 4 | 2026-05-20 |
| Documentation backfill (session history) | 4 | 2026-05-20 |
| Production deploy (Vercel `ordel_website`) | 5 | 2026-05-20 |
| Vercel Analytics + Speed Insights (packages) | 5 | 2026-05-20 |
| Error fallbacks + mobile polish | 5 | 2026-05-20 |

## Next (recommended order)

| # | Item | Priority | Effort | Notes |
|---|------|----------|--------|-------|
| 1 | **Enable Analytics in Vercel dashboard** | medium | S | Web Analytics + Speed Insights toggles |
| 2 | **Hebrew copy QA** | medium | M | RTL on all pages; review `site.he.json` |
| 3 | **Contact backend** | high | M | Formspree, Resend, or Server Action + email |
| 4 | **Wire Daily AI Trends secrets** | high | S | Supabase schema + GHA/Vercel env — code ready (`docs/daily-trends.md`) |
| 5 | **Replace placeholder learn content** | medium | L | Real articles or remove from nav |
| 6 | **Apps & Academy links** | low | S | Update `apps.json` / `courses.json` hrefs or hide sections |

## Later

| Item | Priority | Notes |
|------|----------|-------|
| AI News page | low | Link to external `protfolio-tau-puce.vercel.app/ai-news` or port |
| Resend custom domain | low | Replace `onboarding@resend.dev` sender |
| Analytics | done (code) | Enable charts in Vercel dashboard if empty |
| Profile photo | medium | Old site had `/profile.jpg` — not yet in new app |
| Hero video swap | low | `HERO_VIDEO_SRC` in `lib/constants.ts` |

## Won't do (unless requested)

- Headless CMS
- User auth / accounts
- In-app AI News rebuild (scoped out in session 2)
- Blind Next.js major upgrade without migration plan

## Content backlog

| Content | File(s) | Status |
|---------|---------|--------|
| Bio / experience | `site.en.json`, `site.he.json` | Real |
| Projects (17) | `projects.json` | Real |
| Blog posts | MDX + Supabase auto_posts | 3 MDX demos + daily digests when pipeline runs |
| Learn guides | `content/learn/*.mdx` | Demo (3) |
| Apps | `apps.json` | Placeholder |
| Courses | `courses.json` | Placeholder |
| Testimonials | `testimonials.json` | Placeholder |
| Videos | `videos.json` | Placeholder |
