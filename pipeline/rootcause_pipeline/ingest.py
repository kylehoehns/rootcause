"""Load RMA cause-of-loss files and Drought Monitor county maps for Iowa into DuckDB with dlt, every field as text."""

import io
import json
import urllib.error
import urllib.request
import zipfile
from collections.abc import Callable, Iterator
from datetime import date, timedelta
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


DROUGHT_URL = (
    "https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent"
    "?aoi=IA&startdate={start}&enddate={end}&statisticsType=2"
)
DROUGHT_FIXTURES = FIXTURES / "drought"
DROUGHT_FIELDS = ["mapDate", "fips", "none", "d0", "d1", "d2", "d3", "d4"]
DROUGHT_COLUMNS = ["map_date", "county_fips", *DROUGHT_FIELDS[2:]]
# `just publish` pretends it is this day, so the "latest" map is the committed fixture's.
FIXTURE_TODAY = date(2025, 7, 4)

FetchDrought = Callable[[date, date], list[dict]]


def matching_map_dates(latest: date) -> list[date]:
    """The latest map's date, then the map of the same ISO week number in every year from 2001 to the year before.

    Maps are dated Tuesdays. A year without that week number (53) uses its last week instead.
    """
    year, week, _ = latest.isocalendar()
    dates = [latest]
    for earlier in range(FIRST_YEAR, year):
        last_week = date(earlier, 12, 28).isocalendar().week
        dates.append(date.fromisocalendar(earlier, min(week, last_week), 2))
    return dates


def fetch_drought_fixture(start: date, end: date) -> list[dict]:
    rows = []
    for path in sorted(DROUGHT_FIXTURES.glob("*.json")):
        if start <= date.fromisoformat(path.stem) <= end:
            rows += json.loads(path.read_text())
    return rows


def fetch_drought_live(start: date, end: date) -> list[dict]:
    """Iowa's county statistics for the maps dated from start to end, as the API returns them."""
    url = DROUGHT_URL.format(start=f"{start.month}/{start.day}/{start.year}", end=f"{end.month}/{end.day}/{end.year}")
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def drought_rows(fetch: FetchDrought, today: date) -> Iterator[dict[str, str]]:
    """Rows for the latest map (the newest in the last three weeks), then for the same week of each earlier year."""
    recent = fetch(today - timedelta(days=21), today)
    if not recent:
        raise SystemExit("the Drought Monitor returned no map in the last three weeks")
    latest = max(date.fromisoformat(r["mapDate"][:10]) for r in recent)
    for map_date in matching_map_dates(latest):
        rows = (
            [r for r in recent if r["mapDate"][:10] == map_date.isoformat()]
            if map_date == latest
            else fetch(map_date, map_date)
        )
        if not rows:
            print(f"no Drought Monitor map for {map_date}; skipping")
        for row in rows:
            yield {"map_date": map_date.isoformat(), "county_fips": row["fips"]} | {
                k: str(row[k]) for k in DROUGHT_FIELDS[2:]
            }


@dlt.source(name="drought_monitor")
def drought_monitor(fetch: FetchDrought, today: date):
    @dlt.resource(
        name="drought", write_disposition="replace", columns={c: {"data_type": "text"} for c in DROUGHT_COLUMNS}
    )
    def drought() -> Iterator[dict[str, str]]:
        yield from drought_rows(fetch, today)

    return drought


def ingest(database: Path, *, live: bool) -> None:
    """Replace `raw.cause_of_loss` and `raw.drought` in the DuckDB file: the real sources, or the committed fixtures."""
    years = list(range(FIRST_YEAR, date.today().year + 1)) if live else [2012]
    pipeline = dlt.pipeline("rma", destination=dlt.destinations.duckdb(str(database)), dataset_name="raw")
    pipeline.run(rma(years, fetch_live if live else fetch_fixture))
    if live:
        pipeline.run(drought_monitor(fetch_drought_live, date.today()))
    else:
        pipeline.run(drought_monitor(fetch_drought_fixture, FIXTURE_TODAY))
