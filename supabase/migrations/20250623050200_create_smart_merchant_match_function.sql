-- 创建智能商户匹配函数
create or replace function smart_merchant_match(
    search_text text,
    min_confidence decimal default 0.3,
    max_results integer default 10
)
returns table (
    id uuid,
    name text,
    category text,
    keywords text[],
    confidence_score decimal,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz,
    match_confidence decimal,
    match_type text
) language plpgsql as $$
begin
    return query
    with merchant_matches as (
        select 
            m.id,
            m.name,
            m.category,
            m.keywords,
            m.confidence_score,
            m.is_active,
            m.created_at,
            m.updated_at,
            case
                -- 完全匹配商户名称
                when lower(m.name) = lower(search_text) then 1.0
                when lower(search_text) like '%' || lower(m.name) || '%' then 0.9
                when lower(m.name) like '%' || lower(search_text) || '%' then 0.85
                
                -- 关键词匹配
                when exists (
                    select 1 from unnest(m.keywords) as keyword
                    where lower(keyword) = lower(search_text)
                ) then 0.8
                when exists (
                    select 1 from unnest(m.keywords) as keyword
                    where lower(search_text) like '%' || lower(keyword) || '%'
                       or lower(keyword) like '%' || lower(search_text) || '%'
                ) then 0.7
                
                -- 相似度匹配（使用pg_trgm扩展）
                when similarity(lower(m.name), lower(search_text)) > 0.3 then 
                    0.5 + similarity(lower(m.name), lower(search_text)) * 0.2
                
                else 0.0
            end * m.confidence_score as calculated_confidence,
            
            case
                when lower(m.name) = lower(search_text) then 'exact_name'
                when lower(search_text) like '%' || lower(m.name) || '%' 
                  or lower(m.name) like '%' || lower(search_text) || '%' then 'partial_name'
                when exists (
                    select 1 from unnest(m.keywords) as keyword
                    where lower(keyword) = lower(search_text)
                       or lower(search_text) like '%' || lower(keyword) || '%'
                       or lower(keyword) like '%' || lower(search_text) || '%'
                ) then 'keyword_match'
                when similarity(lower(m.name), lower(search_text)) > 0.3 then 'similarity'
                else 'no_match'
            end as match_type_val
        from merchants m
        where m.is_active = true
    )
    select 
        mm.id,
        mm.name,
        mm.category,
        mm.keywords,
        mm.confidence_score,
        mm.is_active,
        mm.created_at,
        mm.updated_at,
        mm.calculated_confidence as match_confidence,
        mm.match_type_val as match_type
    from merchant_matches mm
    where mm.calculated_confidence >= min_confidence
    order by mm.calculated_confidence desc, mm.name asc
    limit max_results;
end;
$$;

-- 创建商户搜索函数（用于前端搜索）
create or replace function search_merchants(
    search_query text,
    category_filter text default null,
    result_limit integer default 50
)
returns table (
    id uuid,
    name text,
    category text,
    keywords text[],
    confidence_score decimal,
    relevance_score decimal
) language plpgsql as $$
begin
    return query
    select 
        m.id,
        m.name,
        m.category,
        m.keywords,
        m.confidence_score,
        case
            when lower(m.name) like lower(search_query) || '%' then 1.0
            when lower(m.name) like '%' || lower(search_query) || '%' then 0.8
            when exists (
                select 1 from unnest(m.keywords) as keyword
                where lower(keyword) like lower(search_query) || '%'
            ) then 0.7
            when exists (
                select 1 from unnest(m.keywords) as keyword
                where lower(keyword) like '%' || lower(search_query) || '%'
            ) then 0.6
            else similarity(lower(m.name), lower(search_query))
        end as relevance_score
    from merchants m
    where m.is_active = true
      and (category_filter is null or m.category = category_filter)
      and (
          lower(m.name) like '%' || lower(search_query) || '%'
          or exists (
              select 1 from unnest(m.keywords) as keyword
              where lower(keyword) like '%' || lower(search_query) || '%'
          )
          or similarity(lower(m.name), lower(search_query)) > 0.2
      )
    order by relevance_score desc, m.name asc
    limit result_limit;
end;
$$; 