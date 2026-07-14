# Current State

**Last updated:** 2026-05-20 (bright theme toggle)

## Production

| Item | Value |
|------|-------|
| **Vercel project** | `ordel_website` |
| **Production URL** | https://ordelwebsite.vercel.app |
| **Team** | Ori's projects (`oris-projects-1434bdbc`) |
| **Analytics** | `@vercel/analytics` + `@vercel/speed-insights` in root layout (enable in Vercel dashboard → Analytics) |
| **Env** | `NEXT_PUBLIC_SITE_URL=https://ordelwebsite.vercel.app` (production) |

## Project summary

**ordel-webside** is Or Delevski’s bilingual (EN/HE) personal portfolio. It was built in multiple agent sessions: first as a [yuv.ai](https://yuv.ai/)-inspired Next.js site, then populated with real content from [protfolio-tau-puce.vercel.app](https://protfolio-tau-puce.vercel.app/), then equipped with agent session memory (hooks + `docs/`).

See **[session-history.md](session-history.md)** for the full chronological build log.

## What works today

### Site (production-ready core)

| Feature | Status | Details |
|---------|--------|---------|
| Bilingual routes | Done | `/en/*`, `/he/*` — static generation for both |
| Homepage | Done | Hero, Marquee, Blog, Learn, Trends, YouTube, Apps, Projects, Academy, Testimonials, Connect |
| About | Done | Bio, highlights, personal info, experience timeline, CV download |
| Projects | Done | 17 real projects with GitHub / demo / Play Store links |
| CV download | Done | `/Or-Delevski-CV.pdf` from Hero and About |
| Contact | Partial | Form opens `mailto:ordi1985@gmail.com` with prefilled body |
| SEO | Done | Sitemap (all locales + blog/learn slugs), robots, metadata — uses production URL |
| Production deploy | Done | Vercel `ordel_website` → https://ordelwebsite.vercel.app |
| Vercel Analytics | Done (code) | Packages wired; enable Web Analytics + Speed Insights in dashboard |
| Error fallbacks | Done | `not-found`, `error`, `global-error`, `[locale]/not-found` |
| Mobile polish | Done | viewport meta, overflow-x guard, mobile nav scroll lock, video `preload=metadata` on mobile |
| Bright theme toggle | Done | Header switch; high-contrast light tokens + scrims; separate hero MP4; `localStorage` + anti-FOUC script |
| Build | Done | `npm run build` and `npm run lint` pass |

### Content (real vs placeholder)

| Content | Status | Location |
|---------|--------|----------|
| Identity, experience, contact | **Real** | `content/site.en.json`, `content/site.he.json` |
| Projects (17) | **Real** | `content/projects.json` |
| CV PDF | **Real** | `public/Or-Delevski-CV.pdf` |
| UI strings | **Real** | `messages/en.json`, `messages/he.json` |
| Blog (3 posts) | Placeholder/demo | `content/blog/*.mdx` |
| Learn (3 guides) | Placeholder/demo | `content/learn/*.mdx` |
| Apps (3) | Placeholder | `content/apps.json` — `href: "#"` |
| Academy courses (3) | Placeholder | `content/courses.json` — `href: "#"` |
| Testimonials | Placeholder | `content/testimonials.json` |
| YouTube videos | Placeholder | `content/videos.json` |
| Trends | Mock API | `content/trends.json` + `GET /api/trends` |

### Agent tooling

| Feature | Status |
|---------|--------|
| Cursor hooks (sessionStart, postToolUse, sessionEnd) | Done |
| `session-continuity` skill | Done |
| Project memory (`docs/`, `memory/`, `.cursor/rules/`) | Done |

## Routes map

| Route | Page | Content source |
|-------|------|----------------|
| `/{locale}` | Home | `site.*.json` + section JSON/MDX |
| `/{locale}/about` | About | `site.*.json` + `ExperienceSection` |
| `/{locale}/projects` | Projects list | `projects.json` |
| `/{locale}/blog` | Blog index | `content/blog/*.mdx` |
| `/{locale}/blog/[slug]` | Blog post | MDX |
| `/{locale}/learn` | Learn index | `content/learn/*.mdx` |
| `/{locale}/learn/[slug]` | Guide | MDX |
| `/{locale}/academy` | Academy | `courses.json` |
| `/{locale}/apps` | Apps | `apps.json` |
| `/{locale}/contact` | Contact | `ContactForm` + site contact |
| `/{locale}/privacy` | Privacy | Static copy in dictionaries |
| `/api/trends` | Trends JSON | `trends.json` (800ms mock delay) |

## Key files to edit

| Goal | Files |
|------|-------|
| Bio / experience / contact | `content/site.en.json`, `content/site.he.json` |
| Projects | `content/projects.json` |
| CV file | `public/Or-Delevski-CV.pdf` |
| Nav / section labels | `messages/en.json`, `messages/he.json` |
| Hero video | `lib/constants.ts` → `HERO_VIDEO_SRC` (dark) / `HERO_VIDEO_SRC_LIGHT` (bright) |
| Theme | `lib/theme.ts`, `ThemeProvider`, `ThemeToggle`, `app/globals.css` `[data-theme="light"]` |
| Blog/Learn articles | `content/blog/*.mdx`, `content/learn/*.mdx` |
| Design tokens | `app/globals.css` |

## Recent changes (last session)

- Bright/light theme toggle in header with persisted preference (`ordel-theme` in `localStorage`)
- Light theme swaps background video to bright CloudFront MP4; inverted CSS tokens via `[data-theme="light"]`
- Deployed to Vercel as **ordel_website** (https://ordelwebsite.vercel.app)
- Added `@vercel/analytics`, `@vercel/speed-insights`, `vercel.json` (headers + `/` → `/en`)
- Error pages, mobile UX hardening, structured logging on `/api/trends`
- Set `NEXT_PUBLIC_SITE_URL` for sitemap/robots

## Known issues

- Contact form: client-only `mailto:` — no server action or email service
- Trends: mock data, client fetch in `TrendsSection`
- Placeholder sections still show demo copy (blog, learn, apps, academy, testimonials, youtube)
- AI News from old portfolio **not** integrated (scoped out)
- Next.js 16 APIs differ from training data — read `node_modules/next/dist/docs/`
- Hooks: `jq` missing locally; python3 fallback in shell scripts

## Verification

```bash
npm run lint
npm run build
npm run dev   # http://localhost:3000/en and /he
```

Manual checks:

- `/en` and `/he` homepage render
- `/Or-Delevski-CV.pdf` downloads
- Project cards show GitHub / Live Demo / Play Store where configured

## Active focus

Production live. Enable Analytics toggles in Vercel dashboard if charts are empty.

## Next steps

See [roadmap.md](roadmap.md). Top priorities:

1. Enable Web Analytics + Speed Insights in Vercel dashboard (if not already)
2. Contact form backend (optional upgrade from mailto)
3. Hebrew copy review on all pages
4. Replace placeholder blog/learn/apps content when ready
