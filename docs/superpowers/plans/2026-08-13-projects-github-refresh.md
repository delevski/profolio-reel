# Projects GitHub Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the public Projects page from Or's GitHub repositories, add direct live-demo links where real demos exist, and ensure every project card has a relevant preview image.

**Architecture:** Keep the existing file-backed content model. Update `content/projects.json` with public GitHub repo metadata, preserve curated commercial/experience entries, use local screenshot images for live demos, and use GitHub OpenGraph images for repo-only cards.

**Tech Stack:** Next.js 16.2.6 App Router, TypeScript, JSON content, `next/image`, GitHub CLI, Vercel.

## Global Constraints

- Do not add dependencies.
- Do not invent live demos; add `demoUrl` only when the URL returns 200 or comes from GitHub `homepageUrl`.
- Keep Hebrew and English descriptions present for every project.
- Keep private/company work entries only when they are already curated portfolio experience items and have no fake GitHub link.
- Verify with `npm run lint`, `npm run build`, and live `/en/projects` checks after deploy.

---

### Task 1: Refresh Project Data

**Files:**
- Modify: `content/projects.json`

**Interfaces:**
- Consumes: `Project` type from `lib/types.ts`.
- Produces: `Project[]` with `description.en`, `description.he`, `href`, optional `demoUrl`, and `imageUrl`.

- [ ] Build the new project list from public `delevski` GitHub repositories plus existing curated commercial entries.
- [ ] Preserve direct demo URLs from GitHub `homepageUrl`.
- [ ] Add verified GitHub Pages demos for `ORA-Test-Build-UI`, `professional-services-template`, `PilatesTemplate`, `ori-showcase`, and `gemel`.
- [ ] Set `imageUrl` to local screenshots for live demos and GitHub OpenGraph for repo-only projects.

### Task 2: Create Preview Assets

**Files:**
- Create: `public/projects/*.png`

**Interfaces:**
- Consumes: project `demoUrl` values.
- Produces: stable local image URLs referenced by `content/projects.json`.

- [ ] Capture screenshots for live demo projects with `agent-browser`.
- [ ] Resize screenshots to a reasonable width with `sips`.
- [ ] Confirm every `imageUrl` returns either a local `/projects/*.png` path or an allowed remote image host.

### Task 3: Verify And Deploy

**Files:**
- Modify: project memory docs as needed.

**Interfaces:**
- Consumes: updated content and assets.
- Produces: deployed production site.

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Commit and push the content/assets/docs update.
- [ ] Deploy with Vercel production CLI.
- [ ] Verify `/en/projects` contains refreshed projects, live-demo links, and reachable images.
