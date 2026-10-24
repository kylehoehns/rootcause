import io
import json
from datetime import date

from rootcause_pipeline.__main__ import run
from rootcause_pipeline.ingest import fetch_drought_live, matching_map_dates


def run_published(tmp_path):
    return {p.name: p for p in run(tmp_path / "test.duckdb", tmp_path / "out")}


LOSSES = [
    (2012, "19001", "CORN", "Decline in Price", 153674.4),
    (2012, "19001", "CORN", "Drought", 53473.0),
    (2012, "19001", "FORAGE PRODUCTION", "Drought", 8463.0),
    (2012, "19001", "FORAGE SEEDING", "Drought", 20235.0),
    (2012, "19153", "All Other Crops", "Drought", 1541.0),
    (2012, "19153", "CORN", "Cold Wet Weather", 2817.0),
    (2012, "19153", "CORN", "Decline in Price", 98367.56),
    (2012, "19153", "CORN", "Drought", 3244918.58),
    (2012, "19153", "CORN", "Excess Moisture/Precipitation/Rain", 5479.0),
    (2012, "19153", "CORN", "Heat", 20216.86),
    (2012, "19153", "CORN", "Insects", 513.0),
    (2012, "19153", "CORN", "Wind/Excess Wind", 2176.0),
    (2012, "19153", "HYBRID CORN SEED", "Drought", 113374.0),
    (2012, "19153", "OATS", "Drought", 462.0),
    (2012, "19153", "OATS", "Heat", 462.0),
    (2012, "19153", "SOYBEANS", "Decline in Price", 4301.58),
    (2012, "19153", "SOYBEANS", "Drought", 260391.42),
    (2012, "19153", "SOYBEANS", "Excess Moisture/Precipitation/Rain", 5361.0),
    (2012, "19153", "SOYBEANS", "Flood", 15533.0),
    (2012, "19153", "SOYBEANS", "Heat", 241.0),
    (2012, "19169", "CORN", "Decline in Price", 63489.95),
    (2012, "19169", "CORN", "Drought", 351498.0),
]


def test_the_pipeline_publishes_iowa_losses_per_year_county_crop_and_cause(tmp_path):
    published = run_published(tmp_path)["county-losses.json"]
    assert published.name == "county-losses.json"
    assert json.loads(published.read_text()) == [
        {"year": year, "county_fips": fips, "crop": crop, "cause": cause, "indemnity": indemnity}
        for year, fips, crop, cause, indemnity in LOSSES
    ]


def test_polk_county_2012_adds_up_to_the_home_page_total(tmp_path):
    published = run_published(tmp_path)["county-losses.json"]
    polk = [r["indemnity"] for r in json.loads(published.read_text()) if r["county_fips"] == "19153"]
    assert round(sum(polk), 2) == 3776155.00


def test_the_latest_maps_week_number_picks_the_same_week_of_every_earlier_year():
    dates = matching_map_dates(date(2025, 7, 1))  # ISO week 27
    assert dates[0] == date(2025, 7, 1)
    assert [d.year for d in dates] == [2025, *range(2001, 2025)]
    assert date(2012, 7, 3) in dates
    assert all(d.weekday() == 1 and d.isocalendar().week == 27 for d in dates)


def test_a_week_53_map_falls_back_to_the_last_week_of_years_without_one():
    dates = matching_map_dates(date(2020, 12, 29))  # ISO week 53
    assert date(2015, 12, 29) in dates  # 2015 has a week 53
    assert date(2019, 12, 24) in dates  # 2019 ends at week 52


def test_the_pipeline_publishes_drought_for_the_latest_map_and_the_same_week_of_earlier_years(tmp_path):
    published = run_published(tmp_path)
    rows = json.loads(published["drought.json"].read_text())
    assert sorted({r["map_date"] for r in rows}) == ["2012-07-03", "2024-07-02", "2025-07-01"]
    assert len(rows) == 9
    assert all(abs(sum(r[k] for k in ("none", "d0", "d1", "d2", "d3", "d4")) - 100) < 0.1 for r in rows)
    polk_2012 = next(r for r in rows if r["map_date"] == "2012-07-03" and r["county_fips"] == "19153")
    assert polk_2012 == {
        "map_date": "2012-07-03",
        "county_fips": "19153",
        "none": 0.0,
        "d0": 88.21,
        "d1": 11.79,
        "d2": 0.0,
        "d3": 0.0,
        "d4": 0.0,
    }


def test_drought_requests_ask_for_json(monkeypatch):
    seen = []

    class Response(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    def urlopen(request, timeout):
        seen.append(request)
        return Response(b"[]")

    monkeypatch.setattr("urllib.request.urlopen", urlopen)
    assert fetch_drought_live(date(2012, 7, 3), date(2012, 7, 3)) == []
    assert seen[0].get_header("Accept") == "application/json"
    assert (
        "startdate=7/3/2012" in seen[0].full_url
        and "statisticsType=2" in seen[0].full_url
        and "aoi=IA" in seen[0].full_url
    )
