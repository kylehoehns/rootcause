"""`uv run python -m rootcause_pipeline --out ../ui/public/data`: build the dbt project, then publish its marts."""

import argparse
import os
from pathlib import Path

from dbt.cli.main import dbtRunner

from rootcause_pipeline.ingest import ingest
from rootcause_pipeline.publish import publish

HERE = Path(__file__).resolve().parents[1]


def run(database: Path, out: Path, live: bool = False) -> list[Path]:
    ingest(database, live=live)
    os.environ["ROOTCAUSE_DB"] = str(database)
    result = dbtRunner().invoke(["build", "--project-dir", str(HERE), "--profiles-dir", str(HERE), "--quiet"])
    if not result.success:
        raise SystemExit("dbt build failed")
    return publish(database, out)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--database", type=Path, default=HERE / "rootcause.duckdb")
    parser.add_argument("--live", action="store_true", help="download the real files instead of reading the fixtures")
    for path in run(**vars(parser.parse_args())):
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
