
-- 1. Create function to get dashboard stats (FIXED SCOPE)
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
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- 1. Count Total Mentions
  select count(*) into v_total_mentions 
  from intelligence_feed 
  where intelligence_feed.user_id = v_user_id;

  -- 2. Sentiment Breakdown
  select count(*) into v_positive_sentiment 
  from intelligence_feed 
  where intelligence_feed.user_id = v_user_id and sentiment = 'positive';

  select count(*) into v_negative_sentiment 
  from intelligence_feed 
  where intelligence_feed.user_id = v_user_id and sentiment = 'negative';

  select count(*) into v_neutral_sentiment 
  from intelligence_feed 
  where intelligence_feed.user_id = v_user_id and sentiment = 'neutral';

  -- 3. Overview Counts
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

-- 2. Grant permissions
grant execute on function get_dashboard_stats() to authenticated;
grant execute on function get_dashboard_stats() to service_role;
