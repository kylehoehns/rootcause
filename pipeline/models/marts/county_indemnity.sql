-- Crop insurance paid out per county per year, in whole dollars. Published as county-indemnity.json.
-- Hello world: one hand-entered row (Polk County, 2012, from RMA's colsom_2012.zip) until the real ingest exists.
select
    cast(year as integer) as year,
    cast(county_fips as varchar) as county_fips,
    cast(county_name as varchar) as county_name,
    cast(indemnity as bigint) as indemnity
from {{ ref('county_indemnity_seed') }}
