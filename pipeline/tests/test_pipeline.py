import json

from rootcause_pipeline.__main__ import run

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
    published = run(tmp_path / "test.duckdb", tmp_path / "out")[0]
    assert published.name == "county-losses.json"
    assert json.loads(published.read_text()) == [
        {"year": year, "county_fips": fips, "crop": crop, "cause": cause, "indemnity": indemnity}
        for year, fips, crop, cause, indemnity in LOSSES
    ]


def test_polk_county_2012_adds_up_to_the_home_page_total(tmp_path):
    published = run(tmp_path / "test.duckdb", tmp_path / "out")[0]
    polk = [r["indemnity"] for r in json.loads(published.read_text()) if r["county_fips"] == "19153"]
    assert round(sum(polk), 2) == 3776155.00


def test_the_pipeline_publishes_99_iowa_county_boundaries(tmp_path):
    published = {p.name: p for p in run(tmp_path / "test.duckdb", tmp_path / "out")}
    counties = json.loads(published["iowa-counties.geojson"].read_text())
    assert counties["type"] == "FeatureCollection"
    assert len(counties["features"]) == 99
    assert len({f["properties"]["county_fips"] for f in counties["features"]}) == 99
    polk = next(f for f in counties["features"] if f["properties"]["county_fips"] == "19153")
    assert polk["properties"] == {"county_fips": "19153", "county_name": "Polk County"}
    assert polk["geometry"]["type"] in ("Polygon", "MultiPolygon")


def test_the_county_boundaries_cover_every_county_in_the_loss_data(tmp_path):
    published = {p.name: p for p in run(tmp_path / "test.duckdb", tmp_path / "out")}
    boundaries = {
        f["properties"]["county_fips"] for f in json.loads(published["iowa-counties.geojson"].read_text())["features"]
    }
    losses = {r["county_fips"] for r in json.loads(published["county-losses.json"].read_text())}
    assert losses == {"19001", "19153", "19169"}
    assert losses <= boundaries
