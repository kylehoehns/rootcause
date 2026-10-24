-- One row per Iowa county with its boundary as GeoJSON text. Published as iowa-counties.geojson.
select
    county_fips,
    county_name,
    geometry_json
from {{ ref('stg_counties') }}
