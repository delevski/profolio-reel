# SR-PTD - Daily AI Trends Automation

## Section A - Header and Skill Trigger Profile

### Metadata
- **Date**: 2026-07-15
- **Task ID/Ref**: daily-ai-trends-automation
- **Type**: Feature | Automation
- **Domain/Module**: trends, blog, email, github-actions, supabase
- **Complexity**: High

### Skill Trigger Profile (Future YAML description)

**What triggered this task?**
> Build a daily cron that fetches top AI trends from GitHub and Hugging Face, summarizes them, emails a Hebrew for-dummies digest, and posts one blog article under Latest Posts.

**Keywords/Phrases that indicated this task:**
> daily cron, AI Trends, GitHub trending, Hugging Face, summarize, email digest, blog, Mistral, Resend, grill-me

## Section B - Workflow Executed

1. Grill-me decision tree (storage, runner, email, cadence, dedupe, language)
2. About page width alignment (`max-w-7xl`)
3. Supabase schema + client
4. Pipeline script (scrape/API → Mistral → upsert → blog → Resend)
5. Site wiring (API + hybrid blog + images)
6. Docs / HANDOFF update; lint + build verify

## Section C - Knowledge Accessed

- GitHub has no official trending API → HTML scrape of `/trending`
- HF trending API: `GET /api/trending?type=model&limit=20` (limit max 20)
- Vercel filesystem is read-only → write target must be DB/git
- Resend free tier: `onboarding@resend.dev` can mail the account owner

## Section D - Code Written/Used

- `scripts/daily-trends.ts`
- `.github/workflows/daily-trends.yml`
- `supabase/schema.sql`
- `lib/supabase.ts`, `lib/content.ts` hybrid loaders

## Section E - Outputs Produced

- Hebrew RTL HTML email digest template
- Auto-post schema with `source_href` unique dedupe
- Setup guide `docs/daily-trends.md`

## Section J - Skill Potential

High reusability for “daily AI digest to email + CMS/blog” skills across portfolio sites.
