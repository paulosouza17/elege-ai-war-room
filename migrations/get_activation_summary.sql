-- ============================================
-- RPC: get_activation_summary
-- Returns aggregated KPIs for a single activation
-- ============================================

CREATE OR REPLACE FUNCTION get_activation_summary(p_activation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_act JSONB;
  v_act_id UUID;
  v_act_created_by UUID;
  v_total_citations INT;
  v_total_files INT;
  v_first_citation TIMESTAMPTZ;
  v_last_citation TIMESTAMPTZ;
  v_positive INT;
  v_negative INT;
  v_neutral INT;
  v_avg_risk NUMERIC;
  v_max_risk INT;
  v_high_risk_count INT;
  v_escalated_crises INT;
  v_top_keywords JSONB;
  v_target_mentions JSONB;
  v_top_risk_items JSONB;
  v_emergent_keywords JSONB;
  v_cooccurrence JSONB;
  v_sources JSONB;
  v_crises JSONB;
  v_creator_name TEXT;
  v_keywords TEXT[];
  v_people TEXT[];
BEGIN
  -- 1. Fetch activation as JSONB (resilient to missing columns)
  SELECT to_jsonb(a.*) INTO v_act FROM activations a WHERE a.id = p_activation_id;
  IF v_act IS NULL THEN
    RETURN jsonb_build_object('error', 'Activation not found');
  END IF;

  v_act_id := (v_act->>'id')::UUID;
  v_act_created_by := (v_act->>'created_by')::UUID;
  v_keywords := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_act->'keywords')), ARRAY[]::TEXT[]);
  v_people := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_act->'people_of_interest')), ARRAY[]::TEXT[]);

  -- 1b. Creator name
  SELECT COALESCE(full_name, email) INTO v_creator_name
  FROM profiles WHERE id = v_act_created_by;

  -- 2. Overview metrics
  SELECT
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
  INTO v_total_citations, v_first_citation, v_last_citation
  FROM intelligence_feed
  WHERE activation_id = p_activation_id;

  SELECT COUNT(*) INTO v_total_files
  FROM activation_files
  WHERE activation_id = p_activation_id;

  -- 3. Sentiment breakdown
  SELECT
    COUNT(*) FILTER (WHERE sentiment = 'positive'),
    COUNT(*) FILTER (WHERE sentiment = 'negative'),
    COUNT(*) FILTER (WHERE sentiment = 'neutral')
  INTO v_positive, v_negative, v_neutral
  FROM intelligence_feed
  WHERE activation_id = p_activation_id;

  -- 4. Risk metrics
  SELECT
    COALESCE(AVG(risk_score), 0),
    COALESCE(MAX(risk_score), 0),
    COUNT(*) FILTER (WHERE risk_score >= 80)
  INTO v_avg_risk, v_max_risk, v_high_risk_count
  FROM intelligence_feed
  WHERE activation_id = p_activation_id;

  SELECT COUNT(*) INTO v_escalated_crises
  FROM crisis_events
  WHERE activation_id = p_activation_id;

  -- 5. Top keywords by frequency
  SELECT COALESCE(jsonb_agg(kw_row ORDER BY kw_row->>'count' DESC), '[]'::jsonb)
  INTO v_top_keywords
  FROM (
    SELECT jsonb_build_object('keyword', kw, 'count', COUNT(*)) AS kw_row
    FROM intelligence_feed, unnest(keywords) AS kw
    WHERE activation_id = p_activation_id
    GROUP BY kw
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ) sub;

  -- 6. Emergent keywords
  SELECT COALESCE(jsonb_agg(ek_row ORDER BY ek_row->>'count' DESC), '[]'::jsonb)
  INTO v_emergent_keywords
  FROM (
    SELECT jsonb_build_object('keyword', kw, 'count', COUNT(*)) AS ek_row
    FROM intelligence_feed, unnest(keywords) AS kw
    WHERE activation_id = p_activation_id
      AND kw != ALL(v_keywords)
    GROUP BY kw
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) sub;

  -- 7. Target mentions with sentiment
  SELECT COALESCE(jsonb_agg(tm_row), '[]'::jsonb)
  INTO v_target_mentions
  FROM (
    SELECT jsonb_build_object(
      'name', person,
      'count', COUNT(*),
      'sentiment_positive', COUNT(*) FILTER (WHERE sentiment = 'positive'),
      'sentiment_negative', COUNT(*) FILTER (WHERE sentiment = 'negative'),
      'sentiment_neutral', COUNT(*) FILTER (WHERE sentiment = 'neutral')
    ) AS tm_row
    FROM unnest(v_people) AS person
    CROSS JOIN LATERAL (
      SELECT sentiment
      FROM intelligence_feed
      WHERE activation_id = p_activation_id
        AND (
          title ILIKE '%' || person || '%'
          OR content::text ILIKE '%' || person || '%'
        )
    ) matched
    GROUP BY person
    ORDER BY COUNT(*) DESC
  ) sub;

  -- 8. Co-occurrence
  SELECT COALESCE(jsonb_agg(co_row), '[]'::jsonb)
  INTO v_cooccurrence
  FROM (
    SELECT jsonb_build_object(
      'pair', ARRAY[p1, p2],
      'count', COUNT(DISTINCT f.id)
    ) AS co_row
    FROM unnest(v_people) AS p1
    CROSS JOIN unnest(v_people) AS p2
    INNER JOIN intelligence_feed f
      ON f.activation_id = p_activation_id
      AND (f.title ILIKE '%' || p1 || '%' OR f.content::text ILIKE '%' || p1 || '%')
      AND (f.title ILIKE '%' || p2 || '%' OR f.content::text ILIKE '%' || p2 || '%')
    WHERE p1 < p2
    GROUP BY p1, p2
    HAVING COUNT(DISTINCT f.id) >= 1
    ORDER BY COUNT(DISTINCT f.id) DESC
    LIMIT 10
  ) sub;

  -- 9. Top risk items
  SELECT COALESCE(jsonb_agg(ri_row), '[]'::jsonb)
  INTO v_top_risk_items
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'title', title,
      'risk_score', risk_score,
      'sentiment', sentiment,
      'summary', CASE
        WHEN content IS NOT NULL AND content->>'summary' IS NOT NULL THEN content->>'summary'
        ELSE LEFT(title, 200)
      END,
      'created_at', created_at
    ) AS ri_row
    FROM intelligence_feed
    WHERE activation_id = p_activation_id AND risk_score IS NOT NULL
    ORDER BY risk_score DESC
    LIMIT 5
  ) sub;

  -- 10. Sources / Vehicles
  SELECT COALESCE(jsonb_agg(src_row ORDER BY src_row->>'count' DESC), '[]'::jsonb)
  INTO v_sources
  FROM (
    SELECT jsonb_build_object(
      'source', COALESCE(source, 'Desconhecida'),
      'count', COUNT(*),
      'last_seen', MAX(created_at)
    ) AS src_row
    FROM intelligence_feed
    WHERE activation_id = p_activation_id AND source IS NOT NULL
    GROUP BY source
    ORDER BY COUNT(*) DESC
  ) sub;

  -- 11. Crisis events detail
  SELECT COALESCE(jsonb_agg(cr_row ORDER BY cr_row->>'created_at' DESC), '[]'::jsonb)
  INTO v_crises
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'title', title,
      'severity', severity,
      'status', status,
      'created_at', created_at,
      'resolved_at', resolved_at,
      'resolution_notes', resolution_notes
    ) AS cr_row
    FROM crisis_events
    WHERE activation_id = p_activation_id
    ORDER BY created_at DESC
    LIMIT 20
  ) sub;

  -- Build final response (use JSONB extraction — safe for missing columns)
  RETURN jsonb_build_object(
    'activation', jsonb_build_object(
      'id', v_act->>'id',
      'title', COALESCE(v_act->>'name', v_act->>'title', 'Sem título'),
      'category', COALESCE(v_act->>'category', ''),
      'priority', COALESCE(v_act->>'priority', 'normal'),
      'keywords', COALESCE(v_act->'keywords', '[]'::jsonb),
      'people_of_interest', COALESCE(v_act->'people_of_interest', '[]'::jsonb),
      'configured_sources', COALESCE(v_act->'sources', '[]'::jsonb),
      'status', COALESCE(v_act->>'status', 'active'),
      'created_at', v_act->>'created_at',
      'created_by_name', COALESCE(v_creator_name, 'Sistema')
    ),
    'overview', jsonb_build_object(
      'total_citations', v_total_citations,
      'total_files', v_total_files,
      'first_citation_at', v_first_citation,
      'last_citation_at', v_last_citation,
      'monitoring_days', CASE
        WHEN v_first_citation IS NOT NULL THEN
          EXTRACT(DAY FROM NOW() - v_first_citation)::int
        ELSE 0
      END
    ),
    'sentiment', jsonb_build_object(
      'positive', v_positive,
      'negative', v_negative,
      'neutral', v_neutral,
      'ratio_neg_pos', CASE WHEN v_positive > 0 THEN ROUND(v_negative::numeric / v_positive, 2) ELSE 0 END
    ),
    'risk', jsonb_build_object(
      'avg_risk_score', ROUND(v_avg_risk, 1),
      'max_risk_score', v_max_risk,
      'high_risk_count', v_high_risk_count,
      'escalated_crises', v_escalated_crises
    ),
    'top_keywords', v_top_keywords,
    'emergent_keywords', v_emergent_keywords,
    'target_mentions', v_target_mentions,
    'target_cooccurrence', v_cooccurrence,
    'top_risk_items', v_top_risk_items,
    'sources', v_sources,
    'crises', v_crises
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_activation_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_activation_summary(UUID) TO service_role;
