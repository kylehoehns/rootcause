-- Indemnity per year, county, crop and cause, in dollars and cents. Published as county-losses.json.
select
    year,
    county_fips,
    crop,
    cause,
    sum(indemnity) as indemnity
from {{ ref('stg_cause_of_loss') }}
group by year, county_fips, crop, cause
