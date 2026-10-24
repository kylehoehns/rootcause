import io
import json
import zipfile
from datetime import date

import pytest

from rootcause_pipeline.__main__ import run
from rootcause_pipeline.ingest import PREMIUM_COLUMNS, fetch_drought_live, iowa_rows, matching_map_dates


def run_published(tmp_path):
    return {p.name: p for p in run(tmp_path / "test.duckdb", tmp_path / "out")}


LOSSES = [
    (2012, "19001", "CORN", "Area plan (no cause recorded)", 896.0),
    (2012, "19001", "CORN", "Decline in Price", 153674.4),
    (2012, "19001", "CORN", "Drought", 53473.0),
    (2012, "19001", "CORN", "Failure of Irrigation Supply", 96.0),
    (2012, "19001", "CORN", "Gripping Wind Damage", 2048.0),
    (2012, "19001", "CORN", "Mycotoxin", 24.0),
    (2012, "19001", "CORN", "Not recorded", 1024.0),
    (2012, "19001", "CORN", "Other (Snow, Lightning, Etc.)", 7.0),
    (2012, "19001", "FORAGE PRODUCTION", "Drought", 8463.0),
    (2012, "19001", "FORAGE SEEDING", "Drought", 20235.0),
    (2012, "19153", "ALL OTHER CROPS", "Drought", 1541.0),
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
    (2012, "19155", "CORN", "Decline in Price", 1250.75),
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


PREMIUMS = [
    (2012, "19001", "CORN", 3623980),
    (2012, "19001", "FORAGE PRODUCTION", 2827),
    (2012, "19001", "FORAGE SEEDING", 3212),
    (2012, "19001", "OATS", 549),
    (2012, "19001", "SOYBEANS", 2444210),
    (2012, "19153", "CORN", 3937322),
    (2012, "19153", "HYBRID CORN SEED", 317503),
    (2012, "19153", "OATS", 222),
    (2012, "19153", "SOYBEANS", 1528130),
    (2012, "19155", "CORN", 1250),
    (2012, "19169", "CORN", 6535933),
    (2012, "19169", "FORAGE PRODUCTION", 1739),
    (2012, "19169", "HYBRID CORN SEED", 953078),
    (2012, "19169", "OATS", 396),
    (2012, "19169", "SOYBEANS", 2905845),
]


def test_the_pipeline_publishes_iowa_premiums_per_year_county_and_crop(tmp_path):
    published = run_published(tmp_path)["county-premiums.json"]
    assert json.loads(published.read_text()) == [
        {"year": year, "county_fips": fips, "crop": crop, "premium": premium} for year, fips, crop, premium in PREMIUMS
    ]


def test_premiums_join_losses_on_year_county_and_crop_except_all_other_crops(tmp_path):
    published = run_published(tmp_path)
    premiums = {
        (r["year"], r["county_fips"], r["crop"]) for r in json.loads(published["county-premiums.json"].read_text())
    }
    losses = {(r["year"], r["county_fips"], r["crop"]) for r in json.loads(published["county-losses.json"].read_text())}
    assert {k for k in losses - premiums} == {(2012, "19153", "ALL OTHER CROPS")}


def test_polk_county_2012_adds_up_to_the_home_page_total(tmp_path):
    published = run_published(tmp_path)["county-losses.json"]
    polk = [r["indemnity"] for r in json.loads(published.read_text()) if r["county_fips"] == "19153"]
    assert round(sum(polk), 2) == 3776155.00


def test_the_pipeline_publishes_99_iowa_county_boundaries(tmp_path):
    published = run_published(tmp_path)
    counties = json.loads(published["iowa-counties.geojson"].read_text())
    assert counties["type"] == "FeatureCollection"
    assert len(counties["features"]) == 99
    assert len({f["properties"]["county_fips"] for f in counties["features"]}) == 99
    polk = next(f for f in counties["features"] if f["properties"]["county_fips"] == "19153")
    assert polk["properties"] == {"county_fips": "19153", "county_name": "Polk County"}
    assert polk["geometry"]["type"] in ("Polygon", "MultiPolygon")


def test_the_county_boundaries_cover_every_county_in_the_loss_data(tmp_path):
    published = run_published(tmp_path)
    boundaries = {
        f["properties"]["county_fips"] for f in json.loads(published["iowa-counties.geojson"].read_text())["features"]
    }
    losses = {r["county_fips"] for r in json.loads(published["county-losses.json"].read_text())}
    assert losses == {"19001", "19153", "19155", "19169"}
    assert losses <= boundaries


def test_west_pottawattamie_adds_to_pottawattamie_and_all_other_counties_is_dropped(tmp_path):
    published = run_published(tmp_path)
    losses = json.loads(published["county-losses.json"].read_text())
    premiums = json.loads(published["county-premiums.json"].read_text())
    for rows, field, total in ((losses, "indemnity", 1250.75), (premiums, "premium", 1250)):
        assert {r["county_fips"] for r in rows}.isdisjoint({"19156", "19999"})
        assert sum(r[field] for r in rows if r["county_fips"] == "19155") == total  # 155 (1000.5) + 156 (250.25)


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


def zipped(text):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("data.txt", text)
    return buffer.getvalue()


def test_a_year_with_a_different_field_layout_fails_naming_the_year_and_file():
    archive = zipped("2013|19|Iowa|IA|001|Adair|extra\r")
    with pytest.raises(ValueError, match=r"sobtpu_2013\.zip \(2013\).*expected 27 fields but found 7"):
        list(iowa_rows(archive, PREMIUM_COLUMNS, 2013, "sobtpu_2013.zip"))


def test_an_odd_line_for_another_state_is_not_a_layout_change():
    columns = ["year", "state_code", "state_name", "state_abbreviation", "county_code"]
    archive = zipped("2013|31|Nebraska|NE|001|extra\r\n2013|19|Iowa|IA|001\r\n")
    assert [row["county_code"] for row in iowa_rows(archive, columns, 2013, "x.zip")] == ["001"]


def test_blank_lines_are_not_a_layout_change():
    archive = zipped("2013|19|Iowa|IA|001\r\n\r\n")
    assert list(
        iowa_rows(archive, ["year", "state_code", "state_name", "state_abbreviation", "county_code"], 2013, "x.zip")
    ) == [{"year": "2013", "state_code": "19", "state_name": "Iowa", "state_abbreviation": "IA", "county_code": "001"}]


def test_blank_amounts_add_nothing_to_the_county_totals(tmp_path):
    # The fixtures hold a Polk corn row with every amount blank in both sources.
    published = run_published(tmp_path)
    premiums = json.loads(published["county-premiums.json"].read_text())
    polk_corn = next(r for r in premiums if (r["county_fips"], r["crop"]) == ("19153", "CORN"))
    assert polk_corn["premium"] == 3937322


def test_a_group_with_only_blank_premiums_is_left_out(tmp_path):
    # The fixtures hold a Polk swine row whose amounts are all blank, as RMA publishes livestock policies.
    published = run_published(tmp_path)
    premiums = json.loads(published["county-premiums.json"].read_text())
    assert not [r for r in premiums if (r["county_fips"], r["crop"]) == ("19153", "SWINE")]


def test_cause_spellings_merge_and_plan_names_and_blanks_get_their_own_causes(tmp_path):
    # The fixtures hold Adair corn rows for each variant RMA publishes, each with a distinct power-of-two amount.
    published = run_published(tmp_path)
    losses = json.loads(published["county-losses.json"].read_text())
    adair_corn = {r["cause"]: r["indemnity"] for r in losses if (r["county_fips"], r["crop"]) == ("19001", "CORN")}
    assert adair_corn == {
        "Decline in Price": 153674.4,
        "Drought": 53473.0,
        "Other (Snow, Lightning, Etc.)": 1 + 2 + 4,
        "Mycotoxin": 8 + 16,
        "Failure of Irrigation Supply": 32 + 64,
        "Area plan (no cause recorded)": 128 + 256 + 512,
        "Not recorded": 1024,
        "Gripping Wind Damage": 2048,
    }


def test_a_blank_indemnity_adds_nothing_to_the_county_losses(tmp_path):
    # The fixtures hold a Polk corn Drought row with every amount blank; the other Drought rows sum to 3244918.58.
    published = run_published(tmp_path)
    losses = json.loads(published["county-losses.json"].read_text())
    polk_drought = [r for r in losses if (r["county_fips"], r["crop"], r["cause"]) == ("19153", "CORN", "Drought")]
    assert [r["indemnity"] for r in polk_drought] == [3244918.58]
