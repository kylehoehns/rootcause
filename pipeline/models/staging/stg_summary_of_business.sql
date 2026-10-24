-- RMA summary-of-business rows for Iowa with the fields the marts need, cast from text.
select
    cast(commodity_year as integer) as year,
    cast(state_code || county_code as varchar) as county_fips,
    {{ to_decimal("total_premium_amount") }} as premium,
    {{ crop_name('commodity_name') }} as crop
from {{ source('raw', 'summary_of_business') }}
