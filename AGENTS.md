# rootcause

Iowa crop insurance losses and drought, built by a software factory ([factory-kit](https://github.com/kylehoehns/factory-kit)). A dbt + DuckDB pipeline publishes JSON files; a static React site reads them.

## Commands

- `mise install` once per machine or sandbox: it pins Python, Node, uv, pnpm and just (`mise.toml`). Then run everything through `just`.
- Done means `just check` is green: it runs the pipeline's checks, publishes the data, then the UI's checks. `just format` fixes formatting.
- One test: `cd pipeline && uv run pytest tests/test_pipeline.py -q`, `cd ui && pnpm vitest run src/dollars.test.ts`, `cd ui && pnpm playwright test e2e/home.spec.ts`.

## Rules the code can't show you

- The files in `ui/public/data/` are a published contract between the pipeline and the UI. `contracts/*.schema.json` is its source of truth: the pipeline validates every file against it before writing, and the UI's types are generated from it (`pnpm types` writes `ui/src/contracts.ts`; never edit that file). Changing a file's shape means changing the schema, the dbt contract in `pipeline/models/marts/_marts.yml` and the UI together, in one PR.
- `just check` must pass with no network access to the data sources. Tests use small fixtures committed under `pipeline/tests/`. Only the deploy workflow downloads real data.
- Where tests go: `pipeline/tests/` (pytest), dbt `data_tests` in the models' `.yml`, `ui/src/*.test.ts` (Vitest) for logic, and `ui/e2e/` (Playwright) for what a visitor sees. Each ticket that changes a page adds a journey in `ui/e2e/` that saves a screenshot to `test-results/`. Don't change or delete an existing journey without the maintainer's yes: ask (live or on the ticket) first.
- Nothing is served but static files: no API, no server code, no runtime secrets. Data reaches the site only through files the pipeline publishes.

## Skills and hooks

- Skills live in `.agents/skills/` (vendored, see `.agents/skills/VENDORED.md`); `.claude/skills` is a symlink to it.
- When a hook in `.claude/hooks/` blocks something, its message says why; follow it rather than working around it.

## Agent skills

### Issue tracker

GitHub Issues on `kylehoehns/rootcause`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, plus factory and risk labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
