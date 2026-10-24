"""Load RMA cause-of-loss and summary-of-business files, county boundaries and drought maps for Iowa with dlt."""

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
TIGERWEB_URL = (
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query"
    "?where=STATE='19'&outFields=GEOID,NAME&returnGeometry=true&maxAllowableOffset=0.005&outSR=4326&f=geojson"
)
PREMIUMS_URL = (
    "https://pubfs-rma.fpac.usda.gov/pub/Web_Data_Files/Summary_of_Business/state_county_crop/sobtpu_{year}.zip"
)
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
# The 27 pipe-delimited fields of the summary of business, no header row, lines ended by a bare CR
# (SOBTPU_External_All_Years.pdf).
PREMIUM_COLUMNS = [
    "commodity_year",
    "state_code",
    "state_name",
    "state_abbreviation",
    "county_code",
    "county_name",
    "commodity_code",
    "commodity_name",
    "insurance_plan_code",
    "insurance_plan_abbreviation",
    "coverage_category",
    "coverage_level",
    "delivery_type",
    "type_code",
    "type_name",
    "practice_code",
    "practice_name",
    "unit_structure_code",
    "unit_structure_name",
    "net_reporting_level_amount",
    "reporting_level_type",
    "liability_amount",
    "total_premium_amount",
    "subsidy_amount",
    "indemnity_amount",
    "loss_ratio",
    "endorsed_companion_acres",
]

COUNTY_COLUMNS = ["geoid", "county_name", "geometry_json"]  # geometry_json is the GeoJSON geometry as text

Fetch = Callable[[int], bytes | None]


def fetch_fixture(year: int, prefix: str = "colsom") -> bytes | None:
    path = FIXTURES / f"{prefix}_{year}.zip"
    return path.read_bytes() if path.exists() else None


def fetch_premiums_fixture(year: int) -> bytes | None:
    return fetch_fixture(year, "sobtpu")


def fetch_live(year: int, url: str = URL) -> bytes | None:
    """The year's zip from RMA, or None if RMA hasn't published it yet."""
    try:
        with urllib.request.urlopen(url.format(year=year), timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def fetch_premiums_live(year: int) -> bytes | None:
    return fetch_live(year, PREMIUMS_URL)


def fetch_fixture_boundaries() -> bytes:
    return (FIXTURES / "tigerweb_iowa_counties.geojson").read_bytes()


def fetch_live_boundaries() -> bytes:
    with urllib.request.urlopen(TIGERWEB_URL, timeout=120) as response:
        return response.read()


def iowa_rows(archive: bytes, columns: list[str], year: int, file: str) -> Iterator[dict[str, str]]:
    with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
        [name] = zipped.namelist()
        with zipped.open(name) as lines:
            for number, line in enumerate(io.TextIOWrapper(lines, encoding="latin-1"), start=1):
                if not line.strip():
                    continue
                fields = line.rstrip("\r\n").split("|")
                if len(fields) != len(columns):
                    raise ValueError(
                        f"{file} ({year}), line {number}: expected {len(columns)} fields but found {len(fields)}; "
                        "RMA changed the layout for this year"
                    )
                if fields[columns.index("state_abbreviation")].strip() == "IA":
                    yield dict(zip(columns, fields, strict=True))


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
            yield from iowa_rows(archive, COLUMNS, year, f"colsom_{year}.zip")

    return cause_of_loss


@dlt.source(name="rma_premiums")
def rma_premiums(years: list[int], fetch: Fetch):
    @dlt.resource(
        name="summary_of_business",
        write_disposition="replace",
        columns={c: {"data_type": "text"} for c in PREMIUM_COLUMNS},
    )
    def summary_of_business() -> Iterator[dict[str, str]]:
        for year in years:
            archive = fetch(year)
            if archive is None:
                print(f"no sobtpu_{year}.zip yet; skipping")
                continue
            yield from iowa_rows(archive, PREMIUM_COLUMNS, year, f"sobtpu_{year}.zip")

    return summary_of_business


@dlt.source(name="tigerweb")
def tigerweb(fetch: Callable[[], bytes]):
    @dlt.resource(
        name="counties", write_disposition="replace", columns={c: {"data_type": "text"} for c in COUNTY_COLUMNS}
    )
    def counties() -> Iterator[dict[str, str]]:
        for feature in json.loads(fetch())["features"]:
            yield {
                "geoid": feature["properties"]["GEOID"],
                "county_name": feature["properties"]["NAME"],
                "geometry_json": json.dumps(feature["geometry"], separators=(",", ":")),
            }

    return counties


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
    """Replace the `raw` tables (losses, premiums, counties, drought) from the real sources or the fixtures."""
    years = list(range(FIRST_YEAR, date.today().year + 1)) if live else [2012]
    pipeline = dlt.pipeline("rma", destination=dlt.destinations.duckdb(str(database)), dataset_name="raw")
    pipeline.run(rma(years, fetch_live if live else fetch_fixture))
    pipeline = dlt.pipeline("rma_premiums", destination=dlt.destinations.duckdb(str(database)), dataset_name="raw")
    pipeline.run(rma_premiums(years, fetch_premiums_live if live else fetch_premiums_fixture))
    pipeline = dlt.pipeline("tigerweb", destination=dlt.destinations.duckdb(str(database)), dataset_name="raw")
    pipeline.run(tigerweb(fetch_live_boundaries if live else fetch_fixture_boundaries))
    pipeline = dlt.pipeline("drought_monitor", destination=dlt.destinations.duckdb(str(database)), dataset_name="raw")
    if live:
        pipeline.run(drought_monitor(fetch_drought_live, date.today()))
    else:
        pipeline.run(drought_monitor(fetch_drought_fixture, FIXTURE_TODAY))
