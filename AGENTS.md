<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Persistent project memory

**Do not rely on chat history.** Before any task, read:

- `docs/current-state.md` (required)
- `docs/session-history.md` (required — prior sessions)
- `docs/decisions.md`, `docs/roadmap.md`, `docs/architecture.md`
- `memory/session-summary.md`
- `.cursor/agent-sessions/HANDOFF.md`

After major changes, update those docs. At session end, update `memory/session-summary.md` and `HANDOFF.md`.

Full rules: `.cursor/rules/project-memory.mdc` and skill `.cursor/skills/session-continuity/`.
