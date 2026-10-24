"""Load RMA's cause-of-loss files (`colsom_<year>.zip`) for Iowa into DuckDB with dlt, every field as text."""

import io
import urllib.error
import urllib.request
import zipfile
from collections.abc import Callable, Iterator
from datetime import date
from pathlib import Path

import dlt

URL = "https://pubfs-rma.fpac.usda.gov/pub/Web_Data_Files/Summary_of_Business/cause_of_loss/colsom_{year}.zip"
FIXTURES = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
FIRST_YEAR = 2001

# The 30 pipe-delimited fields in file order, no header row (COL_Summary_of_Business_with_Month_All_Years.pdf).
COLUMNS = [
    "commodity_year",
    "state_code",
    "state_abbreviation",
    "county_code",
    "county_name",
    "commodity_code",
    "commodity_name",
    "insurance_plan_code",
    "insurance_plan_abbreviation",
    "coverage_category",
    "delivery_type",
    "cause_of_loss_code",
    "cause_of_loss_description",
    "month_of_loss_code",
    "month_of_loss_abbreviation",
    "year_of_loss",
    "policies_earning_premium",
    "policies_indemnified",
    "net_planted_quantity",
    "net_endorsed_acres",
    "liability",
    "total_premium",
    "producer_paid_premium",
    "subsidy",
    "state_private_subsidy",
    "additional_subsidy",
    "efa_premium_discount",
    "determined_acres",
    "indemnity_amount",
    "loss_ratio",
]
STATE = COLUMNS.index("state_abbreviation")

Fetch = Callable[[int], bytes | None]


def fetch_fixture(year: int) -> bytes | None:
    path = FIXTURES / f"colsom_{year}.zip"
    return path.read_bytes() if path.exists() else None


def fetch_live(year: int) -> bytes | None:
    """The year's zip from RMA, or None if RMA hasn't published it yet."""
    try:
        with urllib.request.urlopen(URL.format(year=year), timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def iowa_rows(archive: bytes) -> Iterator[dict[str, str]]:
    with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
        [name] = zipped.namelist()
        with zipped.open(name) as lines:
            for line in io.TextIOWrapper(lines, encoding="latin-1"):
                fields = line.rstrip("\r\n").split("|")
                if fields[STATE].strip() == "IA":
                    yield dict(zip(COLUMNS, fields, strict=True))


@dlt.source(name="rma")
def rma(years: list[int], fetch: Fetch):
    @dlt.resource(
        name="cause_of_loss", write_disposition="replace", columns={c: {"data_type": "text"} for c in COLUMNS}
    )
    def cause_of_loss() -> Iterator[dict[str, str]]:
        for year in years:
            archive = fetch(year)
            if archive is None:
                print(f"no colsom_{year}.zip yet; skipping")
                continue
            yield from iowa_rows(archive)

    return cause_of_loss


def ingest(database: Path, *, live: bool) -> None:
    """Replace `raw.cause_of_loss` in the DuckDB file: the real files for 2001 to now, or the committed fixtures."""
    years = list(range(FIRST_YEAR, date.today().year + 1)) if live else [2012]
    pipeline = dlt.pipeline("rma", destination=dlt.destinations.duckdb(str(database)), dataset_name="raw")
    pipeline.run(rma(years, fetch_live if live else fetch_fixture))
