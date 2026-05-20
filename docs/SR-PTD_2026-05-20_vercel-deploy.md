# SR-PTD: Vercel deploy ordel_website

**Date:** 2026-05-20  
**Task:** Deploy portfolio to Vercel with analytics, logs, fallbacks, mobile polish

## Outcome

- Production: https://ordelwebsite.vercel.app
- Project: `ordel_website` (team: Ori's projects)

## Workflow

1. Install `@vercel/analytics`, `@vercel/speed-insights`; wire in `app/layout.tsx`
2. Add `vercel.json`, error boundaries, mobile UX tweaks, API logging
3. `npm run lint && npm run build`
4. `npx vercel deploy --prod --yes` (MCP `deploy_to_vercel` delegates to CLI)
5. `vercel env add NEXT_PUBLIC_SITE_URL` → redeploy
6. MCP verify: `web_fetch_vercel_url`, `get_runtime_logs`

## Reusable patterns

- Vercel MCP deploy tool requires CLI: `npx vercel deploy --prod --yes`
- `useMediaQuery` with lazy `useState(() => matchMedia...)` avoids eslint `set-state-in-effect`
- Structured `console.info(JSON.stringify(...))` surfaces in Vercel Runtime Logs

## Manual dashboard step

Enable **Web Analytics** and **Speed Insights** under project → Analytics.
