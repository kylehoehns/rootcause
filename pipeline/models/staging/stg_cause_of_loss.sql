-- RMA cause-of-loss rows for Iowa with the fields the marts need, cast from text.
select
    cast(commodity_year as integer) as year,
    cast(state_code || county_code as varchar) as county_fips,
    cast(indemnity_amount as decimal(14, 2)) as indemnity,
    trim(commodity_name) as crop,
    trim(cause_of_loss_description) as cause
from {{ source('raw', 'cause_of_loss') }}
