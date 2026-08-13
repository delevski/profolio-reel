# Decisions

Architecture and product decisions. Add a dated entry for each non-obvious choice.

---

## 2026-05-20 — yuv.ai IA, Ordel visual identity

**Decision:** Mirror [yuv.ai](https://yuv.ai/) information architecture (homepage bands + section routes), not pixel-perfect visual clone.

**Why:** User wanted similar UX pattern (aggregation hub) with distinct branding.

**Result:** 10 homepage sections + 8 routes; stone/amber/teal palette vs yuv.ai look.

---

## 2026-05-20 — Full multi-page scope (not MVP-only)

**Decision:** Build Blog, Learn, Academy, Projects, Apps, Contact, Privacy in v1 — not single-page MVP.

**Why:** User selected “full structure” in planning ([session 1](session-history.md)).

**Trade-off:** Several sections still use placeholder content.

---

## 2026-05-20 — File-based content, no CMS

**Decision:** JSON + MDX in `content/`; no headless CMS.

**Why:** Small portfolio; git-versioned content is enough.

---

## 2026-05-20 — `server-only` content layer

**Decision:** `lib/content.ts` uses `import "server-only"` and Node `fs`.

**Why:** Build failed when `fs` leaked into client bundles; split nav to `lib/constants.ts`.

**Affected:** All new loaders must stay server-side.

---

## 2026-05-20 — Locale in URL path (`app/[locale]/`)

**Decision:** `en` and `he` as path segments with `generateStaticParams`.

**Why:** SEO, static per-locale pages, explicit RTL.

**Implemented:** During portfolio migration (session 2) with `site.en.json` / `site.he.json`.

---

## 2026-05-20 — Split site copy vs UI strings

**Decision:** `content/site.{locale}.json` for bio/hero/experience; `messages/{locale}.json` for nav and section labels.

**Why:** Separates marketing content from reusable UI keys.

---

## 2026-05-20 — MDX via next-mdx-remote RSC

**Decision:** `next-mdx-remote/rsc` + gray-matter in `lib/mdx.tsx`.

**Why:** App Router RSC compatibility without custom MDX plugin setup.

---

## 2026-05-20 — Migrate real portfolio; skip AI News

**Decision:** Import content from [protfolio-tau-puce.vercel.app](https://protfolio-tau-puce.vercel.app/); do **not** build `/ai-news` in this repo.

**Why:** User scope — focus on bio, experience, projects, CV.

**Artifact:** `.firecrawl/portfolio.json` scrape used as reference.

---

## 2026-05-20 — CV as static PDF in public/

**Decision:** `public/Or-Delevski-CV.pdf` served at `/Or-Delevski-CV.pdf` with HTML `download` attribute.

**Why:** Simple, works on static deploy; no dynamic generation.

**UI:** Hero primary CTA + About page button.

---

## 2026-05-20 — Contact form via mailto

**Decision:** `ContactForm` builds `mailto:ordi1985@gmail.com` URL on submit.

**Why:** No backend in scope for migration session.

**Limitation:** Requires user’s mail client; not a server-side lead capture.

---

## 2026-05-20 — Keep demo sections after migration

**Decision:** Leave Blog, Learn, Academy, Apps, Trends, YouTube, Testimonials as placeholder/demo content.

**Why:** User chose not to remove yuv.ai-style sections; only replace core portfolio data.

---

## 2026-08-13 — Hide homepage YouTube placeholder

**Decision:** Remove the YouTube / Featured Videos band from the localized homepage render while leaving `components/sections/YouTubeSection.tsx`, `content/videos.json`, and dictionary keys in place.

**Why:** User asked to eliminate the visible “Featured Videos” section and all content below that section block on the live homepage.

**Trade-off:** The placeholder content remains available for a future re-enable, but it is no longer part of the homepage sequence.

---

## 2026-05-20 — Mock trends API

**Decision:** `GET /api/trends` with 800ms delay reading `content/trends.json`.

**Why:** Session 1 planned “placeholder hook” for future real trends feed.

---

## 2026-05-20 — Hybrid agent session memory

**Decision:** Cursor hooks + `HANDOFF.md` + `docs/` / `memory/`.

**Why:** Hooks automate tool audit and inject context; markdown is human-readable long-term memory.

**Source of truth:** `docs/current-state.md`, `docs/session-history.md`, `memory/session-summary.md`.

---

## 2026-05-20 — python3 fallback in hooks

**Decision:** Bash hooks use python3 when `jq` is unavailable.

**Why:** macOS dev machine has no `jq`; hooks must still run.

---

## 2026-05-20 — Stability over aggressive refactors

**Decision:** Document before large refactors; incremental changes preferred.

**Why:** Explicit user requirement for cross-session consistency.

---

## 2026-05-20 — Vercel production: `ordel_website`

**Decision:** Deploy to Vercel project **`ordel_website`** at https://ordelwebsite.vercel.app with `@vercel/analytics` + `@vercel/speed-insights`, security headers in `vercel.json`, and `NEXT_PUBLIC_SITE_URL` for sitemap/robots.

**Why:** User requested production deploy with dashboard analytics/logs and mobile polish.

**Details:**
- CLI/MCP deploy (MCP `deploy_to_vercel` delegates to `vercel deploy`)
- Runtime logs: structured JSON `console.info` on `/api/trends`
- Mobile: viewport export, `overflow-x-hidden`, reduced-motion static gradient, mobile menu body scroll lock
- Error boundaries: `not-found`, `error`, `global-error`, `[locale]/not-found`

**Manual step:** Enable Web Analytics + Speed Insights in Vercel dashboard → Analytics (packages alone do not enable charts).

---

## 2026-07-15 — Daily AI Trends via GitHub Actions + Supabase

**Decision:** Hybrid content model. Keep existing MDX blog posts; store daily trends + auto-generated digest posts in Supabase. Run the pipeline in GitHub Actions (not Vercel Cron). Email Hebrew digests with Resend; summarize/write with Mistral.

**Why:** File-based content cannot be written from a serverless cron. GitHub Actions can call external APIs and write to Supabase without a daily redeploy. Hybrid avoids migrating the three hand-written MDX posts.

**Details:**
- Schedule: `0 4 * * *` UTC (~07:00 Israel)
- Sources: scrape `github.com/trending` (AI keyword filter + fallback) + HF `/api/trending?type=model`
- Trends section shows only today's 10 rows (replace-by-day); history retained
- Blog: one English post/day tagged `AI Trend Digest`, image from GitHub/HF OG card; skip post (not email) if all source URLs already covered
- Email: Hebrew for-dummies digest of all 10 + highlight link; failure-alert email on error
- About page body width aligned to other tabs (`max-w-7xl`)

**Setup required:** run `supabase/schema.sql`; set GitHub secrets + Vercel `NEXT_PUBLIC_SUPABASE_*` (see `docs/daily-trends.md`).

---

## 2026-07-14 — Scroll reel via image sequences

**Decision:** Build `/[locale]/reel` as a scroll-driven promo reel. Extract JPEG image sequences from seven MP4s (no `<video>`), map scroll position to frame index (scrub) or an rAF loop (looping sections), and loop a background MP3. Chrome hides the portfolio Header/Footer on this route.

**Why:** User wanted an Apple-style scrubbing experience with precise scroll control, muted video content, and a looping soundtrack — image sequences give frame-accurate scrubbing that `<video>` scrubbing cannot.

**Details:**
- Frames: `scripts/extract-reel-frames.sh` → `public/reel/seq/{1..7}/frame-%04d.jpg`, ~12fps (every 2nd frame of 24fps), width 720, `-q:v 5`. Total ~20MB, 511 frames.
- **JPEG, not WebP:** local Homebrew ffmpeg 8.0.1 has no `libwebp` encoder. JPEG at q5 is close enough and universally supported.
- Manifest `public/reel/manifest.json` drives sections: `still` (opening.png) → `scrub` 1–3 → `loop` 4 → `scrub` 5 → `loop` 6 → `scrub` 7–8.
- `components/reel/ReelExperience.tsx`: rAF maps `scrollY` directly to frames. Frames render on a fixed **canvas** via `drawImage` from decoded `ImageBitmap`s — never swap `<img src>` (that flash was the flicker). Previous canvas pixels stay until the next ready frame is drawn; nearest-ready fallback during fast scroll. Prefetch ±24. Loop sections warm fully on enter. `scroll-behavior: auto` on the reel page.
- Captions: opacity/transform only — CSS `filter: blur()` removed (compositor flicker).
- `components/reel/ReelMusicControl.tsx`: `HTMLAudioElement` loop; attempts autoplay on first pointer/scroll/key/touch gesture (browser policy), plus a manual mute/unmute button.
- `components/layout/LocaleShell.tsx` (client): uses `useSelectedLayoutSegment()`; on segment `reel` renders children only (no Header/Footer/VideoBackground). Header/Footer are passed as **slots** from the server `layout.tsx` so the server-only content layer never leaks into the client bundle.
- `VideoBackground` moved from root `app/layout.tsx` into `LocaleShell` (so reel has a clean black canvas).
- Route excluded from indexing via `robots: { index: false }`; not linked in nav (direct link only).

**Source assets:** `Desktop/סירטון תדמית/{1.png,סירטון1-7.mp4}`, `Downloads/שיר רקע.mp3` → copied to `public/reel/opening.png`, `public/reel/audio/bg.mp3`.

**Ops note:** Dev servers launched from the agent sandbox get SIGTERM when the tool call ends, and a broken process can squat port 3000 returning 404s. Fix: `pkill -9 -f next` then `npm run dev` in a real terminal. Verified all routes/assets return 200 on a clean port.

---

## 2026-05-20 — Bright theme without `next-themes`

**Decision:** Theme via `html[data-theme="light"]` CSS variable overrides, `ThemeProvider` React context, `localStorage` key `ordel-theme`, and inline `<head>` script to prevent flash. No new npm dependency.

**Why:** Existing UI already uses semantic tokens (`bg-bg`, `text-text`); swapping variables covers most of the site. Default remains dark.

**Details:**
- Dark video: `HERO_VIDEO_SRC`; bright video: `HERO_VIDEO_SRC_LIGHT` (user-provided CloudFront URL)
- `VideoBackground` remounts video on theme change (`key={theme}`); lighter scrims in light mode
- `ThemeToggle` in header (desktop + mobile), bilingual `aria-label` in `messages/*.json`
