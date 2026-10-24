-- RMA summary-of-business rows for Iowa with the fields the marts need, cast from text.
-- RMA's West Pottawattamie (156) is folded into Pottawattamie (155); its 999 "All Other Counties" bucket is dropped.
select
    cast(commodity_year as integer) as year,
    cast(state_code || {{ county_code('county_code') }} as varchar) as county_fips,
    {{ to_decimal("total_premium_amount") }} as premium,
    {{ crop_name('commodity_name') }} as crop
from {{ source('raw', 'summary_of_business') }}
where county_code != '999'
