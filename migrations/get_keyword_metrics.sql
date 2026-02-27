-- Create RPC function to get metrics for a specific keyword
-- Returns: 24h count and last 7 days history
create or replace function get_keyword_metrics(keyword_text text)
returns json as $$
declare
  count_24h integer;
  history_data json;
begin
  -- 1. Calculate mentions in last 24h
  select count(*)
  into count_24h
  from intelligence_feed
  where 
    -- Check if keyword exists in the classification_metadata->keywords array
    -- Note: This assumes keywords are stored as a JSON array of strings
    -- We use '?' operator if the array stores strings directly, or @> for containment
    -- A robust way for JSON array of strings is:
    classification_metadata->'keywords' @> to_jsonb(keyword_text)
    and created_at >= (now() - interval '24 hours');

  -- 2. Calculate history for last 7 days
  select json_agg(row_to_json(t))
  into history_data
  from (
    select 
      to_char(day_series, 'YYYY-MM-DD') as date,
      coalesce(count(f.id), 0) as count
    from generate_series(
      date_trunc('day', now() - interval '6 days'),
      date_trunc('day', now()),
      '1 day'::interval
    ) as day_series
    left join intelligence_feed f on 
      date_trunc('day', f.created_at) = day_series
      and f.classification_metadata->'keywords' @> to_jsonb(keyword_text)
    group by day_series
    order by day_series asc
  ) t;

  -- 3. Return combined JSON
  return json_build_object(
    'count_24h', count_24h,
    'history', history_data
  );
end;
$$ language plpgsql security definer;
