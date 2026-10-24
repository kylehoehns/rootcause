#!/usr/bin/env bash
# PostToolUse: format the file that was just edited, so formatting never reaches review.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[[ -f "$file" ]] || exit 0
cd "$(git rev-parse --show-toplevel)"

case "$file" in
  */pipeline/*.py) (cd pipeline && uv run ruff format -q "$file" && uv run ruff check -q --fix "$file") || true ;;
  */pipeline/models/*.sql) (cd pipeline && uv run sqlfluff fix -q "$file") >/dev/null 2>&1 || true ;;
  */ui/*.ts | */ui/*.tsx | */ui/*.json) (cd ui && pnpm exec biome check --write "$file") >/dev/null 2>&1 || true ;;
esac
