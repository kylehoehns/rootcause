"""Write the marts the UI reads as JSON, each checked against its schema in contracts/ first."""

import json
from pathlib import Path

import duckdb
from jsonschema import validate

CONTRACTS = Path(__file__).resolve().parents[2] / "contracts"

# Published file -> the mart it comes from.
FILES = {"county-indemnity.json": "select * from main.county_indemnity order by year, county_fips"}


def publish(database: Path, out: Path) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    written = []
    with duckdb.connect(str(database)) as db:
        for name, query in FILES.items():
            cursor = db.execute(query)
            columns = [c[0] for c in cursor.description]
            rows = [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]
            validate(rows, json.loads((CONTRACTS / name.replace(".json", ".schema.json")).read_text()))
            path = out / name
            path.write_text(json.dumps(rows, indent=2) + "\n")
            written.append(path)
    return written
