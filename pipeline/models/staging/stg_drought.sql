-- Drought Monitor county maps for Iowa, cast from text. Percent of the county's area in each category.
-- A row with any blank percent is dropped: the published file has no nulls, so that county-week is left out.
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
where
    nullif(trim(none), '') is not null
    and nullif(trim(d0), '') is not null
    and nullif(trim(d1), '') is not null
    and nullif(trim(d2), '') is not null
    and nullif(trim(d3), '') is not null
    and nullif(trim(d4), '') is not null
