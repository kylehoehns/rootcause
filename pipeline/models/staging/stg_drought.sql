-- Drought Monitor county maps for Iowa, cast from text. Percent of the county's area in each category.
select
    cast(map_date as date) as map_date,
    cast(county_fips as varchar) as county_fips,
    cast(none as decimal(5, 2)) as none,  -- noqa: RF04
    cast(d0 as decimal(5, 2)) as d0,
    cast(d1 as decimal(5, 2)) as d1,
    cast(d2 as decimal(5, 2)) as d2,
    cast(d3 as decimal(5, 2)) as d3,
    cast(d4 as decimal(5, 2)) as d4
from {{ source('raw', 'drought') }}
