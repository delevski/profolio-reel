#!/usr/bin/env bash
# sessionStart: init session dir, inject HANDOFF.md into agent context
set -euo pipefail

input=$(cat)

json_get() {
  local key="$1"
  if command -v jq >/dev/null 2>&1; then
    echo "$input" | jq -r --arg k "$key" '.[$k] // empty'
  elif command -v python3 >/dev/null 2>&1; then
    echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('$key'); print(v if v is not None else '')"
  else
    echo ""
  fi
}

if ! command -v jq >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi

session_id=$(json_get "session_id")
workspace=$(json_get "workspace_roots")
# workspace_roots is array — handle via dedicated extract
if command -v jq >/dev/null 2>&1; then
  workspace=$(echo "$input" | jq -r '.workspace_roots[0] // empty')
elif command -v python3 >/dev/null 2>&1; then
  workspace=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('workspace_roots') or []; print(r[0] if r else '')")
fi

if [[ -z "$workspace" ]]; then
  workspace="$(pwd)"
fi

if [[ -z "$session_id" ]]; then
  session_id="unknown-$(date +%s)"
fi

base="${workspace}/.cursor/agent-sessions"
handoff="${base}/HANDOFF.md"
date_prefix=$(date +%Y-%m-%d)
session_dir="${base}/sessions/${date_prefix}-${session_id}"
tool_log="${session_dir}/tool-log.md"

mkdir -p "${base}/sessions" "${session_dir}"

if [[ ! -f "$handoff" ]]; then
  cat >"$handoff" <<'EOF'
# Agent Handoff

## Last updated
(not yet started)

## Current goal
No prior session recorded.

## Status
in_progress

## What was done
- (none)

## Files touched
- (none)

## Key decisions
- (none)

## Verification
- (none)

## Open items
- [ ] Define goal with user

## Next session should
1. Read this file and confirm next steps with the user
EOF
fi

{
  echo "session_id=${session_id}"
  echo "session_dir=${session_dir}"
  echo "started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >"${base}/current-session"

touch "$tool_log"
echo "# Tool log — ${date_prefix}-${session_id}" >"$tool_log"
echo "" >>"$tool_log"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$tool_log"
echo "" >>"$tool_log"

handoff_content=$(cat "$handoff")
current_state="${workspace}/docs/current-state.md"
memory_summary="${workspace}/memory/session-summary.md"
current_state_excerpt=""
if [[ -f "$current_state" ]]; then
  current_state_excerpt=$(head -n 40 "$current_state")
fi
memory_excerpt=""
if [[ -f "$memory_summary" ]]; then
  memory_excerpt=$(head -n 25 "$memory_summary")
fi

context=$(cat <<CTX
## Prior session handoff (auto-injected)

${handoff_content}

---
## Project memory (read fully before tasks)

Source of truth: docs/ and memory/ — not chat history.

### docs/current-state.md (excerpt)
${current_state_excerpt:-[missing — create docs/current-state.md]}

### memory/session-summary.md (excerpt)
${memory_excerpt:-[missing — create memory/session-summary.md]}

Also read: docs/decisions.md, docs/roadmap.md, docs/architecture.md
Rules: .cursor/rules/project-memory.mdc

---
Session directory: ${session_dir}
Tool log: ${tool_log}
Update docs + memory/session-summary.md + HANDOFF.md before ending session.
CTX
)

if command -v jq >/dev/null 2>&1; then
  jq -n \
    --arg dir "$session_dir" \
    --arg ctx "$context" \
    '{
      env: { AGENT_SESSION_DIR: $dir },
      additional_context: $ctx
    }'
elif command -v python3 >/dev/null 2>&1; then
  export SESSION_DIR="$session_dir" HANDOFF_CTX="$context"
  python3 -c 'import json,os; print(json.dumps({"env":{"AGENT_SESSION_DIR":os.environ["SESSION_DIR"]},"additional_context":os.environ["HANDOFF_CTX"]}))'
fi

exit 0
