-- Iowa county boundaries from Census TIGERweb, with county FIPS and name.
select
    cast(geoid as varchar) as county_fips,
    cast(county_name as varchar) as county_name,
    cast(geometry_json as varchar) as geometry_json
from {{ source('raw', 'counties') }}
