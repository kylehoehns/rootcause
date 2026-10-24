{#- RMA leaves some amounts blank in some years; a blank is NULL, which adds nothing to a sum. -#}
{% macro to_decimal(column, precision=14, scale=2) -%}
    cast(nullif(trim({{ column }}), '') as decimal({{ precision }}, {{ scale }}))
{%- endmacro %}
