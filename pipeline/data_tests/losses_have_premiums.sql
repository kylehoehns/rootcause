-- Fails with a row for every year, county and crop that has losses but no premium, so the loss ratio would divide by nothing.
-- "All Other Crops" is left out: RMA's summary of business doesn't always list it, and #6 handles the missing ratio.
select distinct
    losses.year,
    losses.county_fips,
    losses.crop
from {{ ref('county_losses') }} as losses
left join {{ ref('county_premiums') }} as premiums
    on
        losses.year = premiums.year
        and losses.county_fips = premiums.county_fips
        and losses.crop = premiums.crop
where losses.crop != 'ALL OTHER CROPS' and premiums.premium is null
