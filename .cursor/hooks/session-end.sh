#!/usr/bin/env bash
# sessionEnd: finalize tool log and mark current-session ended
set -euo pipefail

input=$(cat)

session_dir="${AGENT_SESSION_DIR:-}"
reason="unknown"
duration_ms=0
session_id="unknown"
workspace="$(pwd)"

if command -v jq >/dev/null 2>&1; then
  reason=$(echo "$input" | jq -r '.reason // "unknown"')
  duration_ms=$(echo "$input" | jq -r '.duration_ms // 0')
  session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
  workspace=$(echo "$input" | jq -r '.workspace_roots[0] // empty')
elif command -v python3 >/dev/null 2>&1; then
  read -r reason duration_ms session_id workspace < <(
    echo "$input" | python3 -c "
import sys, json
d = json.load(sys.stdin)
r = d.get('workspace_roots') or []
print(d.get('reason') or 'unknown')
print(d.get('duration_ms') or 0)
print(d.get('session_id') or 'unknown')
print(r[0] if r else '')
"
  )
fi

if [[ -z "$workspace" ]]; then
  workspace="$(pwd)"
fi

if [[ -z "$session_dir" ]]; then
  pointer="${workspace}/.cursor/agent-sessions/current-session"
  if [[ -f "$pointer" ]]; then
    while IFS='=' read -r key val; do
      [[ "$key" == "session_dir" ]] && session_dir="$val"
      [[ "$key" == "session_id" ]] && session_id="$val"
    done <"$pointer"
  fi
fi

if [[ -n "$session_dir" && -d "$session_dir" ]]; then
  tool_log="${session_dir}/tool-log.md"
  {
    echo ""
    echo "---"
    echo "Ended: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "Session: ${session_id}"
    echo "Reason: ${reason}"
    echo "Duration_ms: ${duration_ms}"
  } >>"$tool_log"
fi

base="${workspace}/.cursor/agent-sessions"
if [[ -f "${base}/current-session" ]]; then
  {
    echo "# ended at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    cat "${base}/current-session"
    echo "end_reason=${reason}"
    echo "duration_ms=${duration_ms}"
  } >"${base}/current-session.ended"
  rm -f "${base}/current-session"
fi

echo '{}'
exit 0
