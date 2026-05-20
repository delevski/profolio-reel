---
name: session-continuity
description: >-
  Maintains cross-session agent memory via docs/, memory/, HANDOFF.md, and
  session summaries. Use at session start, when continuing previous work,
  resuming tasks, or before ending a session.
---

# Session Continuity

Persist work across sessions. **Markdown files are the source of truth** — not chat history.

## Read order (session start — mandatory)

1. `docs/current-state.md`
2. `docs/session-history.md`
3. `docs/decisions.md`
4. `docs/roadmap.md`
5. `docs/architecture.md`
6. `memory/session-summary.md`
7. `.cursor/agent-sessions/HANDOFF.md`
8. All other files in `docs/`, `memory/`, `.cursor/rules/` if present

Then tell the user: goal, status, open items, planned next action.

## Write targets (after milestones / session end)

| File | When |
|------|------|
| `docs/current-state.md` | After any major change |
| `docs/decisions.md` | New non-obvious decisions |
| `docs/roadmap.md` | Items completed or added |
| `docs/architecture.md` | Stack or structure changes only |
| `memory/session-summary.md` | **End of every session** (overwrite) |
| `.cursor/agent-sessions/HANDOFF.md` | End of every session (overwrite) |
| `.cursor/agent-sessions/index.md` | Append one line per session |
| `sessions/<date>-<id>/summary.md` | Milestones during session |

Follow `.cursor/rules/project-memory.mdc` for full rules.

## HANDOFF.md template

```markdown
# Agent Handoff

## Last updated
YYYY-MM-DD HH:MM

## Current goal
…

## Status
[in_progress | blocked | completed]

## What was done
- …

## Files touched
- path — why

## Key decisions
- …

## Verification
- command — result

## Open items
- [ ] …

## Next session should
1. Read docs/current-state.md then …
```

## Milestone entry (session summary.md)

```markdown
### YYYY-MM-DD HH:MM — [title]
**Done:** … | **Files:** … | **Decisions:** … | **Open:** …
```

## Rules

- Never paste raw tool logs into HANDOFF or docs
- Never log secrets or `.env` values
- If docs are missing or stale, create or fix them before coding
- Hooks inject HANDOFF at session start; still read `docs/` explicitly
