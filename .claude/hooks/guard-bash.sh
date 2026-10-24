#!/usr/bin/env bash
# PreToolUse guard for shell commands: keep the pinned tools in charge and keep git history honest.
set -euo pipefail

cmd=$(jq -r '.tool_input.command // empty')

deny() {
  jq -n --arg r "$1" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'
  exit 0
}

# Word-boundary match on the command text; good enough for steering, not a security boundary.
if grep -Eq '(^|[;&|[:space:]])(pip|pip3|poetry)([[:space:]]|$)' <<<"$cmd"; then
  deny "The pipeline uses uv: uv add <package>, uv run <command>."
fi
if grep -Eq '(^|[;&|[:space:]])(npm|npx|yarn)([[:space:]]|$)' <<<"$cmd"; then
  deny "The UI uses pnpm: pnpm add <package>, pnpm exec <command>."
fi
if grep -Eq -- '--no-verify|--force([[:space:]]|$)|push[[:space:]].*-f([[:space:]]|$)' <<<"$cmd"; then
  deny "Skipping hooks and force-pushing are off-limits. Fix the failing check instead."
fi
if [[ "${FACTORY_RUN:-}" == "1" ]] && grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(push|remote)' <<<"$cmd"; then
  deny "Factory runs never push. Commit locally; the factory pushes after checking the branch."
fi
exit 0
