{% macro county_code(column) -%}
    case when {{ column }} = '156' then '155' else {{ column }} end
{%- endmacro %}
