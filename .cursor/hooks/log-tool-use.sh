#!/usr/bin/env bash
# postToolUse / postToolUseFailure: append sanitized tool events to tool-log.md
set -euo pipefail

input=$(cat)

if ! command -v jq >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi

session_dir="${AGENT_SESSION_DIR:-}"

if [[ -z "$session_dir" ]]; then
  if command -v jq >/dev/null 2>&1; then
    workspace=$(echo "$input" | jq -r '.workspace_roots[0] // .cwd // empty')
  else
    workspace=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('workspace_roots') or []; print(r[0] if r else (d.get('cwd') or ''))")
  fi
  if [[ -z "$workspace" ]]; then
    workspace="$(pwd)"
  fi
  pointer="${workspace}/.cursor/agent-sessions/current-session"
  if [[ -f "$pointer" ]]; then
    while IFS='=' read -r key val; do
      [[ "$key" == "session_dir" ]] && session_dir="$val"
    done <"$pointer"
  fi
fi

if [[ -z "$session_dir" || ! -d "$session_dir" ]]; then
  echo '{}'
  exit 0
fi

tool_log="${session_dir}/tool-log.md"

if command -v jq >/dev/null 2>&1; then
  hook_event=$(echo "$input" | jq -r '.hook_event_name // "postToolUse"')
  tool_name=$(echo "$input" | jq -r '.tool_name // "unknown"')
  duration=$(echo "$input" | jq -r '.duration // 0')
  tool_input=$(echo "$input" | jq -c '.tool_input // {}' 2>/dev/null || echo '{}')
  if [[ "$hook_event" == "postToolUseFailure" ]]; then
    error_msg=$(echo "$input" | jq -r '.error_message // "unknown error"')
    failure_type=$(echo "$input" | jq -r '.failure_type // "error"')
    extra="err: ${error_msg} (${failure_type})"
  else
    tool_output=$(echo "$input" | jq -r '.tool_output // ""' 2>/dev/null || echo '')
    extra="out: ${tool_output}"
  fi
else
  hook_event=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('hook_event_name') or 'postToolUse')")
  tool_name=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name') or 'unknown')")
  duration=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('duration') or 0)")
  tool_input=$(echo "$input" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('tool_input') or {}))")
  if [[ "$hook_event" == "postToolUseFailure" ]]; then
    error_msg=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error_message') or 'unknown error')")
    failure_type=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('failure_type') or 'error')")
    extra="err: ${error_msg} (${failure_type})"
  else
    tool_output=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_output') or '')")
    extra="out: ${tool_output}"
  fi
fi

timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

sanitize() {
  local text="$1"
  text=$(echo "$text" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')
  text=$(echo "$text" | sed -E 's/(api[_-]?key|token|password|secret|authorization)[[:space:]]*[:=][[:space:]]*[^[:space:]]+/\1=[REDACTED]/gi')
  text=$(echo "$text" | sed -E 's/\.env[^[:space:]]*/.env[REDACTED]/g')
  if [[ ${#text} -gt 500 ]]; then
    text="${text:0:497}..."
  fi
  echo "$text"
}

tool_input_s=$(sanitize "$tool_input")
extra_s=$(sanitize "$extra")

if [[ "$hook_event" == "postToolUseFailure" ]]; then
  line="- ${timestamp} | FAIL | ${tool_name} (${duration}ms) | in: ${tool_input_s} | ${extra_s}"
else
  line="- ${timestamp} | OK | ${tool_name} (${duration}ms) | in: ${tool_input_s} | ${extra_s}"
fi

echo "$line" >>"$tool_log"

echo '{}'
exit 0
