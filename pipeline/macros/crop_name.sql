{#- One spelling of a crop for every source: RMA's files differ in case across years, and the summary of business
    calls "All Other Crops" "All Other Commodities". -#}
{% macro crop_name(column) -%}
    case
        when upper(trim({{ column }})) = 'ALL OTHER COMMODITIES' then 'ALL OTHER CROPS'
        else upper(trim({{ column }}))
    end
{%- endmacro %}
