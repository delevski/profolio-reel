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

## 2026-05-20 — Bright theme without `next-themes`

**Decision:** Theme via `html[data-theme="light"]` CSS variable overrides, `ThemeProvider` React context, `localStorage` key `ordel-theme`, and inline `<head>` script to prevent flash. No new npm dependency.

**Why:** Existing UI already uses semantic tokens (`bg-bg`, `text-text`); swapping variables covers most of the site. Default remains dark.

**Details:**
- Dark video: `HERO_VIDEO_SRC`; bright video: `HERO_VIDEO_SRC_LIGHT` (user-provided CloudFront URL)
- `VideoBackground` remounts video on theme change (`key={theme}`); lighter scrims in light mode
- `ThemeToggle` in header (desktop + mobile), bilingual `aria-label` in `messages/*.json`
