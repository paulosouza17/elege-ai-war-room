-- ============================================================
-- Seed: Popular intelligence_feed com menções fictícias (7 dias)
-- Distribuição: ~64% neutral, 16% positive, 20% negative
-- Avg risk: ~59 | Source: mix twitter/portal
-- Activation: a7f6f2d7-4bc9-496c-a1e2-6560c4c52ae0
-- ============================================================

-- ~45 menções/dia × 7 dias = ~315 registros (com oscilação ±35%)
-- Variação: 30-60 por dia para simular oscilações orgânicas

DO $$
DECLARE
  v_activation_id UUID := 'a7f6f2d7-4bc9-496c-a1e2-6560c4c52ae0';
  v_user_id UUID;
  v_day INT;
  v_item INT;
  v_items_per_day INT;
  v_hour INT;
  v_minute INT;
  v_ts TIMESTAMPTZ;
  v_sentiment TEXT;
  v_risk INT;
  v_source TEXT;
  v_source_type TEXT;
  v_title TEXT;
  v_summary TEXT;
  v_keywords TEXT[];
  v_rand FLOAT;
  v_titles TEXT[] := ARRAY[
    'Flávio Bolsonaro defende reforma tributária em entrevista',
    'Senador Flávio se posiciona sobre pauta econômica',
    'PL articula estratégia para eleições municipais',
    'Flávio Bolsonaro comenta decisão do STF sobre julgamento',
    'Oposição critica projeto de lei do governo federal',
    'Analistas avaliam cenário eleitoral de 2026',
    'Flávio Bolsonaro participa de evento em São Paulo',
    'Pesquisa aponta crescimento nas intenções de voto',
    'Governo anuncia pacote de investimentos em infraestrutura',
    'Debate sobre reforma política ganha força no Congresso',
    'Flávio Bolsonaro se reúne com lideranças do Nordeste',
    'Especialistas discutem impacto das redes sociais na política',
    'PL apresenta propostas para segurança pública',
    'Flávio Bolsonaro critica burocracia estatal em discurso',
    'Movimentos sociais organizam manifestação contra o governo',
    'Flávio recebe apoio de prefeitos em agenda no interior',
    'Congresso vota projeto de lei sobre educação',
    'Flávio Bolsonaro compartilha dados econômicos positivos',
    'Oposição questiona gastos do governo com publicidade',
    'Flávio sugere auditoria em programas sociais'
  ];
  v_summaries_pos TEXT[] := ARRAY[
    'Conteúdo demonstra apoio à atuação de Flavio Bolsonaro no Senado, destacando sua postura firme em temas econômicos.',
    'Menção positiva à liderança de Flavio Bolsonaro no PL, reforçando sua imagem como potencial candidato à presidência.',
    'Elogio à articulação política de Flavio Bolsonaro em negociações com bancadas aliadas no Congresso.',
    'Destaque para crescimento de Flavio Bolsonaro nas pesquisas eleitorais, indicando tendência favorável.'
  ];
  v_summaries_neg TEXT[] := ARRAY[
    'Crítica à posição de Flavio Bolsonaro em relação a políticas trabalhistas, associando-o a interesses empresariais.',
    'Oposição utiliza declarações de Flavio Bolsonaro para questionar sua experiência como gestor público.',
    'Menção negativa associando Flavio Bolsonaro a controvérsias internas do PL e disputas de poder.',
    'Conteúdo questiona posicionamentos de Flavio Bolsonaro sobre temas ambientais e sua relação com o agronegócio.'
  ];
  v_summaries_neu TEXT[] := ARRAY[
    'Menção factual a Flavio Bolsonaro em contexto de cobertura jornalística sobre agenda do Senado.',
    'Reportagem cita Flavio Bolsonaro entre parlamentares que discutiram pauta econômica na semana.',
    'Análise técnica do cenário pré-eleitoral menciona Flavio Bolsonaro como um dos nomes cotados.',
    'Cobertura jornalística sobre movimentações no Congresso cita Flavio Bolsonaro de forma descritiva.',
    'Matéria aborda agenda legislativa e menciona participação de Flavio Bolsonaro em comissão.',
    'Registro factual de evento político com presença de Flavio Bolsonaro entre outros senadores.'
  ];
  v_kw_options TEXT[][] := ARRAY[
    ARRAY['Flavio Bolsonaro', 'PL', 'Senado'],
    ARRAY['Flavio Bolsonaro', 'eleições 2026'],
    ARRAY['Flavio Bolsonaro', 'reforma tributária'],
    ARRAY['Flavio Bolsonaro', 'economia'],
    ARRAY['Flavio Bolsonaro', 'STF'],
    ARRAY['Flavio Bolsonaro', 'oposição'],
    ARRAY['Flavio Bolsonaro', 'segurança pública'],
    ARRAY['Flavio Bolsonaro']
  ];
BEGIN
  -- Get user_id from the activation
  SELECT user_id INTO v_user_id FROM activations WHERE id = v_activation_id LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Activation not found, using NULL user_id';
  END IF;

  -- Loop 7 days (day 1 = 6 days ago, day 7 = today)
  FOR v_day IN 1..7 LOOP
    -- Base: ~45/day, oscillation ±35% (range: ~30-60)
    -- Alternating pattern: high-low-high creates natural-looking chart
    v_items_per_day := CASE
      WHEN v_day IN (1, 3, 5, 7) THEN 45 + floor(random() * 16)::INT  -- high days: 45-60
      ELSE                            30 + floor(random() * 10)::INT   -- low days: 30-39
    END;

    FOR v_item IN 1..v_items_per_day LOOP
      -- Random hour (6-23) and minute
      v_hour := 6 + floor(random() * 18)::INT;
      v_minute := floor(random() * 60)::INT;
      v_ts := (NOW() - ((7 - v_day) || ' days')::INTERVAL)::DATE + (v_hour || ':' || v_minute || ':' || floor(random()*60)::INT)::TIME;
      v_ts := v_ts AT TIME ZONE 'America/Sao_Paulo'; -- Correct timezone

      -- Sentiment distribution: 64% neutral, 16% positive, 20% negative
      v_rand := random();
      IF v_rand < 0.16 THEN
        v_sentiment := 'positive';
        v_risk := 10 + floor(random() * 25)::INT; -- 10-35
        v_summary := v_summaries_pos[1 + floor(random() * array_length(v_summaries_pos, 1))::INT];
      ELSIF v_rand < 0.36 THEN
        v_sentiment := 'negative';
        v_risk := 55 + floor(random() * 40)::INT; -- 55-95
        v_summary := v_summaries_neg[1 + floor(random() * array_length(v_summaries_neg, 1))::INT];
      ELSE
        v_sentiment := 'neutral';
        v_risk := 20 + floor(random() * 40)::INT; -- 20-60
        v_summary := v_summaries_neu[1 + floor(random() * array_length(v_summaries_neu, 1))::INT];
      END IF;

      -- Source mix: 60% twitter, 25% portal, 15% tv
      v_rand := random();
      IF v_rand < 0.60 THEN
        v_source := 'twitter';
        v_source_type := 'social_media';
      ELSIF v_rand < 0.85 THEN
        v_source := (ARRAY['Folha de S.Paulo', 'O Globo', 'Estadão', 'UOL', 'G1', 'Agência Brasil'])[1 + floor(random() * 6)::INT];
        v_source_type := 'portal';
      ELSE
        v_source := (ARRAY['GloboNews', 'CNN Brasil', 'BandNews', 'Jovem Pan'])[1 + floor(random() * 4)::INT];
        v_source_type := 'tv';
      END IF;

      -- Title and keywords
      v_title := v_titles[1 + floor(random() * array_length(v_titles, 1))::INT];
      v_keywords := v_kw_options[1 + floor(random() * array_length(v_kw_options, 1))::INT];

      -- Fallback for NULLs from array indexing
      IF v_title IS NULL THEN v_title := 'Menção a Flávio Bolsonaro em contexto político'; END IF;
      IF v_summary IS NULL THEN v_summary := 'Análise de menção ao alvo monitorado.'; END IF;
      IF v_keywords IS NULL THEN v_keywords := ARRAY['Flavio Bolsonaro']; END IF;

      INSERT INTO intelligence_feed (
        title, summary, content, source, source_type, sentiment, risk_score,
        keywords, activation_id, user_id, status, created_at, published_at,
        classification_metadata
      ) VALUES (
        v_title,
        v_summary,
        v_title, -- content = title (simplificado, não precisa de post real)
        v_source,
        v_source_type,
        v_sentiment,
        v_risk,
        v_keywords,
        v_activation_id,
        v_user_id,
        'active',
        v_ts,
        v_ts,
        jsonb_build_object(
          'keywords', to_jsonb(v_keywords),
          'entities', '[]'::jsonb,
          'detected_entities', '[]'::jsonb,
          'per_entity_analysis', '[]'::jsonb,
          'source_name', v_source,
          'content_type_detected', v_source_type,
          'reasoning', v_summary
        )
      );
    END LOOP;

    RAISE NOTICE 'Dia % (% dias atrás): % menções inseridas', v_day, 7 - v_day, v_items_per_day;
  END LOOP;
END $$;
