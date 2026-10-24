# rootcause

Where Iowa's crops are lost, and to what: USDA crop insurance payouts by county and cause, next to this week's drought.

It's also a demo of a software factory. After a minimal hand-built start, agents build it from tickets with [factory-kit](https://github.com/kylehoehns/factory-kit), and a risk gate decides how much human review each PR needs. The factory's journal is in [`docs/journal/`](docs/journal/).

## Run it

```sh
mise install   # Python, Node, uv, pnpm and just, at the versions in mise.toml
just dev       # publishes the data and serves the site on localhost
just check     # everything CI runs
```

## How it fits together

```text
pipeline/   dbt + DuckDB build the marts; publish writes one JSON file per mart
contracts/  a JSON Schema per published file: the pipeline validates against it, the UI's types come from it
ui/         a static React site that reads the JSON, deployed to Cloudflare by .github/workflows/deploy.yml
```

The data is public: USDA Risk Management Agency cause-of-loss files and the US Drought Monitor.
