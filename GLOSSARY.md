# Glossary

- **Indemnity**: money crop insurance paid a farmer for a loss. RMA's "Indemnity Amount". Whole dollars here.
- **Cause of loss**: the peril RMA records for a loss (drought, hail, excess moisture…).
- **Commodity year** (shown as "year"): the crop year a policy covered, not necessarily the year of the loss.
- **County FIPS**: the five-digit state + county code, e.g. `19153` for Polk County, Iowa. The key for joining sources.
- **Mart**: a final dbt model the site depends on. Each mart is published as one JSON file.
- **Published file**: a JSON file in `ui/public/data/`, described by a schema in `contracts/`.
- **RMA**: USDA's Risk Management Agency, which publishes the cause-of-loss files.
- **Drought Monitor**: the weekly US Drought Monitor maps from the National Drought Mitigation Center.
