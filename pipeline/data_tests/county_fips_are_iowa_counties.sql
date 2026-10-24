-- Fails with a row for every county_fips in the published losses and premiums that is not one of the 99 Iowa counties
-- in the boundaries (RMA's 156 and 999 are folded or dropped in staging).
select
    'county_losses' as mart,
    county_fips
from {{ ref('county_losses') }}
where county_fips not in (select county_fips from {{ ref('iowa_counties') }})
union all
select
    'county_premiums' as mart,
    county_fips
from {{ ref('county_premiums') }}
where county_fips not in (select county_fips from {{ ref('iowa_counties') }})
