import json

from rootcause_pipeline.__main__ import run


def test_the_pipeline_publishes_the_county_totals(tmp_path):
    [published] = run(tmp_path / "test.duckdb", tmp_path / "out")
    assert json.loads(published.read_text()) == [
        {"year": 2012, "county_fips": "19153", "county_name": "Polk", "indemnity": 3776155}
    ]
