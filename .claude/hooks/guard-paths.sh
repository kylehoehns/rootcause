#!/usr/bin/env bash
# PreToolUse guard for file edits.
# Factory runs (FACTORY_RUN=1) may not touch the factory's own controls or existing Playwright journeys.
# Interactive sessions get asked instead, because the maintainer edits these on purpose.
set -euo pipefail

input=$(cat)
file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
[[ -z "$file" ]] && exit 0

root=$(git rev-parse --show-toplevel)
rel=${file#"$root"/}

decide() { # decision, reason
  jq -n --arg d "$1" --arg r "$2" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r}}'
  exit 0
}

case "$rel" in
  .factory/runs/*)
    exit 0 ;; # gitignored scratch space the factory shares with its agents (task, outcome, PR body)
  ui/src/contracts.ts)
    reason="ui/src/contracts.ts is generated from contracts/*.schema.json. Change the schema and run pnpm types." ;;
  ui/e2e/*)
    if git cat-file -e "origin/main:$rel" 2>/dev/null; then
      reason="$rel is an existing journey, which protects what visitors already see. Add a new journey instead; changing this one needs the maintainer."
    else
      exit 0
    fi ;;
  .github/* | .factory/* | .agents/* | .claude/* | scripts/*)
    reason="$rel is part of the factory's own controls (high risk tier). Changes here go through the maintainer." ;;
  *) exit 0 ;;
esac

if [[ "${FACTORY_RUN:-}" == "1" || "$rel" == ui/src/contracts.ts ]]; then
  decide deny "$reason"
else
  decide ask "$reason"
fi
