"""Write the marts the UI reads as JSON, each checked against its schema in contracts/ first."""

import json
from decimal import Decimal
from pathlib import Path

import duckdb
from jsonschema import validate

CONTRACTS = Path(__file__).resolve().parents[2] / "contracts"

# Published file -> the mart it comes from.
FILES = {"county-losses.json": "select * from main.county_losses order by year, county_fips, crop, cause"}
GEOJSON = "iowa-counties.geojson"


def plain(value):
    """Dollars and cents leave DuckDB as exact decimals; JSON gets them as numbers."""
    return float(value) if isinstance(value, Decimal) else value


def publish(database: Path, out: Path) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    written = []
    with duckdb.connect(str(database)) as db:
        for name, query in FILES.items():
            cursor = db.execute(query)
            columns = [c[0] for c in cursor.description]
            rows = [dict(zip(columns, map(plain, row), strict=True)) for row in cursor.fetchall()]
            validate(rows, json.loads((CONTRACTS / name.replace(".json", ".schema.json")).read_text()))
            path = out / name
            path.write_text(json.dumps(rows, indent=2) + "\n")
            written.append(path)
        written.append(publish_counties(db, out))
    return written


def publish_counties(db: duckdb.DuckDBPyConnection, out: Path) -> Path:
    """The county boundaries as a GeoJSON FeatureCollection, one feature per row of the iowa_counties mart."""
    rows = db.execute(
        "select county_fips, county_name, geometry_json from main.iowa_counties order by county_fips"
    ).fetchall()
    collection = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"county_fips": fips, "county_name": name},
                "geometry": json.loads(geometry),
            }
            for fips, name, geometry in rows
        ],
    }
    validate(collection, json.loads((CONTRACTS / GEOJSON.replace(".geojson", ".schema.json")).read_text()))
    path = out / GEOJSON
    path.write_text(json.dumps(collection, separators=(",", ":")) + "\n")
    return path
