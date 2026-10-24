# The pipeline publishes files; the site is static

A dbt + DuckDB pipeline turns public data (USDA RMA cause-of-loss files, the US Drought Monitor) into one JSON file per mart. The site is static files on Cloudflare's free plan that read those JSON files. There is no API and no database server. The data is public and refreshed weekly, so a server would add cost, credentials and something to keep running, and the site would gain nothing from it.

The published files are the contract between the pipeline and the UI. Each has a JSON Schema in `contracts/` that the pipeline validates against before writing and that the UI's types are generated from. Changes to `contracts/` are high risk, because they're one-way doors for whatever reads the files.

## Consequences

- Hosting costs nothing. A scheduled GitHub Actions run rebuilds and deploys the site with fresh data every Thursday, after the Drought Monitor publishes.
- The deploy token lives only in the protected `production` environment, which runs after a merge to `main`. The factory and its sandboxes never see it.
- Anything that needs per-visitor computation (search across everything, custom queries) has to fit in a published file or run in the browser. DuckDB-WASM over Parquet is the escape hatch if that ever matters.
