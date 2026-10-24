-- Share of each county's area in each drought category, per map date. Published as drought.json.
select
    map_date,
    county_fips,
    none,
    d0,
    d1,
    d2,
    d3,
    d4
from {{ ref('stg_drought') }}
