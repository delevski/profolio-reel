# SR-PTD - Session continuity skill and hooks

**Date**: 2026-05-20 | **Type**: Feature | **Domain**: agent-tooling | **Complexity**: Medium

## Trigger
User requested cross-session memory via MD files so the next agent session understands prior work.

## Workflow
1. Created `session-continuity` skill with start/milestone/end workflow
2. Added Cursor hooks: sessionStart, postToolUse, postToolUseFailure, sessionEnd
3. Initialized HANDOFF.md, index.md, sessions/ structure
4. Updated .gitignore and AGENTS.md
5. Verified hooks via simulated stdin (python3 fallback; jq not installed)

## Key decisions
- Project-scoped (`.cursor/` in ordel-webside), not personal skill
- Hybrid: hooks for tool audit + skill for narrative handoff
- python3 fallback when jq missing on macOS

## Files
- `.cursor/skills/session-continuity/SKILL.md`
- `.cursor/hooks.json`, `.cursor/hooks/*.sh`
- `.cursor/agent-sessions/HANDOFF.md`, `index.md`

## Skill potential: High (reusable across projects)
