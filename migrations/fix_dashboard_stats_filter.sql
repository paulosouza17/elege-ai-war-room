
create or replace function get_dashboard_stats()
returns json
language plpgsql
security definer
as $$
declare
  v_total_mentions int;
  v_positive_sentiment int;
  v_negative_sentiment int;
  v_neutral_sentiment int;
  v_total_entities int;
  v_active_activations int;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  -- 1. Count Total Mentions (FILTERED by detected_entities)
  -- Only count items where 'detected_entities' array exists and is not empty
  select count(*) into v_total_mentions 
  from intelligence_feed 
  where intelligence_feed.user_id = v_user_id
  and jsonb_array_length(case when classification_metadata->'detected_entities' is null then '[]'::jsonb else classification_metadata->'detected_entities' end) > 0;

  -- 2. Sentiment Breakdown (ALSO FILTERED)
  select count(*) into v_positive_sentiment 
  from intelligence_feed 
  where intelligence_feed.user_id = v_user_id 
  and sentiment = 'positive'
  and jsonb_array_length(case when classification_metadata->'detected_entities' is null then '[]'::jsonb else classification_metadata->'detected_entities' end) > 0;

  select count(*) into v_negative_sentiment 
  from intelligence_feed 
  where intelligence_feed.user_id = v_user_id 
  and sentiment = 'negative'
  and jsonb_array_length(case when classification_metadata->'detected_entities' is null then '[]'::jsonb else classification_metadata->'detected_entities' end) > 0;

  select count(*) into v_neutral_sentiment 
  from intelligence_feed 
  where intelligence_feed.user_id = v_user_id 
  and sentiment = 'neutral'
  and jsonb_array_length(case when classification_metadata->'detected_entities' is null then '[]'::jsonb else classification_metadata->'detected_entities' end) > 0;

  -- 3. Overview Counts (Unchanged)
  select count(*) into v_total_entities 
  from monitored_entities 
  where monitored_entities.user_id = v_user_id;

  select count(*) into v_active_activations 
  from activations 
  where activations.user_id = v_user_id and status = 'active';

  return json_build_object(
    'total_mentions', v_total_mentions,
    'sentiment', json_build_object(
      'positive', v_positive_sentiment,
      'negative', v_negative_sentiment,
      'neutral', v_neutral_sentiment
    ),
    'overview', json_build_object(
      'total_entities', v_total_entities,
      'active_activations', v_active_activations
    )
  );
end;
$$;

grant execute on function get_dashboard_stats() to authenticated;
grant execute on function get_dashboard_stats() to service_role;
