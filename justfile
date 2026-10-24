set shell := ["bash", "-euo", "pipefail", "-c"]

# Everything CI runs. Done means this passes.
check: pipeline-check publish ui-check

# Lint, format check and tests for the pipeline (Python and dbt SQL).
pipeline-check:
    cd pipeline && uv run ruff check . && uv run ruff format --check . && uv run sqlfluff lint models && uv run pytest -q

# Build the dbt project and write the JSON the UI reads into ui/public/data/, from committed fixtures only (no network).
publish:
    cd pipeline && uv run python -m rootcause_pipeline --out ../ui/public/data

# The same, from the real sources. Only the deploy workflow runs this. Until there's ingestion, it's `publish`.
publish-live:
    cd pipeline && uv run python -m rootcause_pipeline --out ../ui/public/data

# Lint, type-check, build, unit tests and Playwright journeys for the UI. Needs `just publish` first.
ui-check:
    cd ui && pnpm install --frozen-lockfile --silent && pnpm lint && pnpm build && pnpm test && pnpm e2e

# Fix formatting and safe lint findings everywhere.
format:
    cd pipeline && uv run ruff format . && uv run ruff check --fix . && uv run sqlfluff fix models
    cd ui && pnpm exec biome check --write .

# The site on localhost, with freshly published data.
dev: publish
    cd ui && pnpm dev
