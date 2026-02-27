
-- Drop old function to be clean (optional, but good practice if not used)
drop function if exists get_dashboard_stats();

create or replace function get_dashboard_stats_v2()
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
  v_auth_user_id uuid;
begin
  -- Explicitly get the Authenticated User ID
  v_auth_user_id := auth.uid();
  
  -- 1. Count Total Mentions (Filtered by User AND Detected Entities)
  -- Logic: Must belong to user AND have at least one detected entity in metadata
  SELECT count(*) INTO v_total_mentions 
  FROM intelligence_feed 
  WHERE user_id = v_auth_user_id
  AND jsonb_array_length(
      CASE 
          WHEN classification_metadata->'detected_entities' IS NULL THEN '[]'::jsonb 
          ELSE classification_metadata->'detected_entities' 
      END
  ) > 0;

  -- 2. Sentiment Breakdown (Filtered by User AND Detected Entities)
  SELECT count(*) INTO v_positive_sentiment 
  FROM intelligence_feed 
  WHERE user_id = v_auth_user_id 
  AND sentiment = 'positive'
  AND jsonb_array_length(
      CASE 
          WHEN classification_metadata->'detected_entities' IS NULL THEN '[]'::jsonb 
          ELSE classification_metadata->'detected_entities' 
      END
  ) > 0;

  SELECT count(*) INTO v_negative_sentiment 
  FROM intelligence_feed 
  WHERE user_id = v_auth_user_id 
  AND sentiment = 'negative'
  AND jsonb_array_length(
      CASE 
          WHEN classification_metadata->'detected_entities' IS NULL THEN '[]'::jsonb 
          ELSE classification_metadata->'detected_entities' 
      END
  ) > 0;

  SELECT count(*) INTO v_neutral_sentiment 
  FROM intelligence_feed 
  WHERE user_id = v_auth_user_id 
  AND sentiment = 'neutral'
  AND jsonb_array_length(
      CASE 
          WHEN classification_metadata->'detected_entities' IS NULL THEN '[]'::jsonb 
          ELSE classification_metadata->'detected_entities' 
      END
  ) > 0;

  -- 3. Overview Counts (Monitored Entities & Activations)
  SELECT count(*) INTO v_total_entities 
  FROM monitored_entities 
  WHERE user_id = v_auth_user_id;

  SELECT count(*) INTO v_active_activations 
  FROM activations 
  WHERE user_id = v_auth_user_id AND status = 'active';

  RETURN json_build_object(
    'total_mentions', v_total_mentions,
    'sentiment', json_build_object(
      'positive', v_positive_sentiment,
      'negative', v_negative_sentiment,
      'neutral', v_neutral_sentiment
    ),
    'overview', json_build_object(
      'total_entities', v_total_entities,
      'active_activations', v_active_activations
    ),
    'debug_user', v_auth_user_id -- Returning this to verify in frontend response if needed
  );
end;
$$;

-- Grant permissions for V2
grant execute on function get_dashboard_stats_v2() to authenticated;
grant execute on function get_dashboard_stats_v2() to service_role;
