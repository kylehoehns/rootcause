{#- One name per cause of loss: RMA spells some causes several ways across years, leaves stray quotes, backticks and
    doubled spaces in others, records insurance plans (area-based policies that pay on county or area results) where
    a cause belongs, and leaves some causes blank. -#}
{% macro cause_name(column) -%}
    case
        when {{ cause_key(column) }} = '' then 'Not recorded'
        when {{ cause_key(column) }} similar to '(grp|grip|arpi|stax|sco|eco)([/ ].*)?'
            then 'Area plan (no cause recorded)'
        when {{ cause_key(column) }} like 'other (snow,lightning,etc%' then 'Other (Snow, Lightning, Etc.)'
        when {{ cause_key(column) }} like 'mycotoxin%' then 'Mycotoxin'
        when {{ cause_key(column) }} = 'failure of irrigation supply' then 'Failure of Irrigation Supply'
        else {{ cause_clean(column) }}
    end
{%- endmacro %}

{% macro cause_clean(column) -%}
    trim(regexp_replace(regexp_replace({{ column }}, '["`'']', '', 'g'), '\s+', ' ', 'g'))
{%- endmacro %}

{% macro cause_key(column) -%}
    lower(regexp_replace({{ cause_clean(column) }}, '\s*,\s*', ',', 'g'))
{%- endmacro %}
