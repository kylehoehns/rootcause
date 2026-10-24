-- Total premium in whole dollars per year, county and crop. Published as county-premiums.json.
select
    year,
    county_fips,
    crop,
    cast(round(sum(premium)) as bigint) as premium
from {{ ref('stg_summary_of_business') }}
group by year, county_fips, crop
-- RMA leaves premium blank for some groups (livestock, All Other Crops); those have no premium to publish.
having sum(premium) is not null
