-- =============================================================================
-- SEED HISTÓRICO — Últimos 5 dias (dados simulados para demo/apresentação)
-- Tag de rastreamento: SEED_HISTORICO_2026
-- Data de geração: 2026-03-02
--
-- COMO EXCLUIR DEPOIS:
--   DELETE FROM intelligence_feed
--   WHERE title LIKE '[SEED_HISTORICO_2026]%';
--
-- Lógica:
--   • Twitter: milhares de menções/dia, 60% positivas
--   • TV/Rádio/Portal: entre 8 e 17 matérias por dia (aleatório)
--   • Cada KPI tem variação aleatória de ±25%
--   • Rastreável pelo prefixo [SEED_HISTORICO_2026] no title
-- =============================================================================

DO $$
DECLARE
    v_user_id        uuid;
    v_activation_id  uuid;

    -- Contadores
    v_day_offset     int;
    v_i              int;
    v_twitter_count  int;
    v_materias_count int;

    -- Campos do registro
    v_ts             timestamptz;
    v_sentiment      text;
    v_risk           int;
    v_source         text;
    v_source_type    text;
    v_kw             text[];

    -- Arrays de fontes
    sources_tv       text[] := ARRAY['TV Globo', 'Record News', 'Band News', 'CNN Brasil', 'SBT', 'GloboNews'];
    sources_radio    text[] := ARRAY['CBN', 'Jovem Pan', 'Band FM', 'Rádio Eldorado', 'BandNews FM'];
    sources_portal   text[] := ARRAY['G1', 'UOL', 'R7', 'Metrópoles', 'Folha', 'Estadão', 'O Globo', 'Valor Econômico'];

    -- Sentimentos ponderados para Twitter (60% positivo)
    sent_twitter     text[] := ARRAY[
        'positive','positive','positive','positive','positive','positive',  -- 60%
        'negative','negative',                                              -- 20%
        'neutral','neutral'                                                 -- 20%
    ];

    -- Sentimentos para matérias (distribuição mais equilibrada)
    sent_materias    text[] := ARRAY[
        'positive','positive','positive','positive',  -- 40%
        'negative','negative','negative',             -- 30%
        'neutral','neutral','neutral'                 -- 30%
    ];

    -- Pool de keywords para Twitter (terms that match word cloud)
    kw_twitter       text[][] := ARRAY[
        ARRAY['candidato', 'apoio', 'campanha'],
        ARRAY['debate', 'eleição', 'propostas'],
        ARRAY['votação', 'urna', 'resultado'],
        ARRAY['liderança', 'popularidade', 'pesquisa'],
        ARRAY['movimento', 'evento', 'mobilização'],
        ARRAY['programa', 'governo', 'plano'],
        ARRAY['discurso', 'declaração', 'posição'],
        ARRAY['entrevista', 'coletiva', 'resposta'],
        ARRAY['aliança', 'coalizão', 'partido'],
        ARRAY['economia', 'emprego', 'saúde'],
        ARRAY['Bolsonaro', 'senado', 'reforma'],
        ARRAY['corrupção', 'investigação', 'denúncia'],
        ARRAY['segurança', 'violência', 'policial'],
        ARRAY['educação', 'escola', 'universidade'],
        ARRAY['Bolsonaro', 'presidente', 'candidato'],
        ARRAY['Lula', 'oposição', 'crítica'],
        ARRAY['tributária', 'reforma', 'imposto'],
        ARRAY['Bolsonaro', 'campanha', 'eleição'],
        ARRAY['pesquisa', 'aprovação', 'rejeição'],
        ARRAY['congresso', 'legislação', 'plenário']
    ];

    -- Pool de keywords para matérias
    kw_materias      text[][] := ARRAY[
        ARRAY['candidato', 'proposta', 'programa'],
        ARRAY['debate', 'eleição', 'cobertura'],
        ARRAY['crítica', 'oposição', 'conflito'],
        ARRAY['entrevista', 'declaração', 'discurso'],
        ARRAY['pesquisa', 'instituto', 'cenário'],
        ARRAY['congresso', 'legislação', 'reforma'],
        ARRAY['Bolsonaro', 'senado', 'plenário'],
        ARRAY['economia', 'inflação', 'emprego'],
        ARRAY['corrupção', 'denúncia', 'investigação'],
        ARRAY['segurança', 'policial', 'violência'],
        ARRAY['Lula', 'governo', 'oposição'],
        ARRAY['saúde', 'SUS', 'vacina'],
        ARRAY['educação', 'universidade', 'escola'],
        ARRAY['tributária', 'reforma', 'imposto']
    ];

    v_src_idx int;

BEGIN
    -- -----------------------------------------------------------------------
    -- A) Busca user_id e activation_id
    -- -----------------------------------------------------------------------
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    SELECT id INTO v_activation_id
    FROM activations WHERE status = 'active' LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado.';
    END IF;

    RAISE NOTICE 'User: % | Activation: %', v_user_id, v_activation_id;

    -- -----------------------------------------------------------------------
    -- B) Loop pelos 5 dias anteriores (D-5 a D-1)
    -- -----------------------------------------------------------------------
    FOR v_day_offset IN 1..5 LOOP

        -- ==================================================================
        -- TWITTER: milhares de menções (1200-2500 com variação ±25%)
        -- ==================================================================
        v_twitter_count := 1200 + FLOOR(RANDOM() * 1300)::int;  -- 1200 a 2500
        -- Aplica variação ±25%
        v_twitter_count := GREATEST(800, ROUND(v_twitter_count * (0.75 + RANDOM() * 0.50)));

        RAISE NOTICE 'Dia D-% → Twitter: % menções', v_day_offset, v_twitter_count;

        FOR v_i IN 1..v_twitter_count LOOP
            -- Timestamp aleatório entre 00h e 23h59 do dia
            v_ts := (CURRENT_DATE - v_day_offset)::timestamptz
                  + (RANDOM() * INTERVAL '23 hours 59 minutes');

            -- Sentimento (60% positivo)
            v_sentiment := sent_twitter[1 + FLOOR(RANDOM() * array_length(sent_twitter, 1))::int];

            -- Risk score base 35 ±25%
            v_risk := GREATEST(5, LEAST(100,
                ROUND(35 * (0.75 + RANDOM() * 0.50))::int
            ));
            IF v_sentiment = 'negative' THEN
                v_risk := GREATEST(v_risk, 45);
            ELSIF v_sentiment = 'positive' THEN
                v_risk := LEAST(v_risk, 55);
            END IF;

            -- Keywords
            v_kw := kw_twitter[1 + FLOOR(RANDOM() * array_length(kw_twitter, 1))::int];

            INSERT INTO intelligence_feed (
                id, user_id, activation_id,
                title, content, summary,
                source, source_type,
                sentiment, risk_score, keywords,
                status, created_at, published_at,
                classification_metadata
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_activation_id,
                '[SEED_HISTORICO_2026] Twitter D-' || v_day_offset || ' #' || v_i,
                to_jsonb('Menção no Twitter. Dia D-' || v_day_offset || '.'),
                'Tweet simulado — ' || v_sentiment || ', risco ' || v_risk || '.',
                'Twitter',
                'social',
                v_sentiment,
                v_risk,
                v_kw,
                'active',
                v_ts,
                v_ts,
                jsonb_build_object(
                    'detected_entities', jsonb_build_array(
                        jsonb_build_object('name', 'entidade_simulada', 'type', 'person', 'role', 'target')
                    ),
                    'is_seed', true,
                    'seed_tag', 'SEED_HISTORICO_2026',
                    'seed_day_offset', v_day_offset,
                    'confidence', ROUND((0.65 + RANDOM() * 0.30)::numeric, 2)
                )
            );
        END LOOP; -- twitter

        -- ==================================================================
        -- MATÉRIAS: TV, Rádio e Portal (8 a 17 por dia, aleatório)
        -- ==================================================================
        v_materias_count := 8 + FLOOR(RANDOM() * 10)::int;  -- 8 a 17

        RAISE NOTICE 'Dia D-% → Matérias: % itens', v_day_offset, v_materias_count;

        FOR v_i IN 1..v_materias_count LOOP
            -- Timestamp entre 06h e 22h (horário de notícias)
            v_ts := (CURRENT_DATE - v_day_offset)::timestamptz
                  + (INTERVAL '6 hours')
                  + (RANDOM() * INTERVAL '16 hours');

            -- Distribui entre TV (~40%), Portal (~35%), Rádio (~25%)
            DECLARE
                v_src_roll float := RANDOM();
            BEGIN
                IF v_src_roll < 0.40 THEN
                    v_src_idx   := 1 + FLOOR(RANDOM() * array_length(sources_tv, 1))::int;
                    v_source      := sources_tv[v_src_idx];
                    v_source_type := 'tv';
                ELSIF v_src_roll < 0.75 THEN
                    v_src_idx   := 1 + FLOOR(RANDOM() * array_length(sources_portal, 1))::int;
                    v_source      := sources_portal[v_src_idx];
                    v_source_type := 'portal';
                ELSE
                    v_src_idx   := 1 + FLOOR(RANDOM() * array_length(sources_radio, 1))::int;
                    v_source      := sources_radio[v_src_idx];
                    v_source_type := 'radio';
                END IF;
            END;

            -- Sentimento (distribuição equilibrada)
            v_sentiment := sent_materias[1 + FLOOR(RANDOM() * array_length(sent_materias, 1))::int];

            -- Risk score base 50 ±25%
            v_risk := GREATEST(15, LEAST(100,
                ROUND(50 * (0.75 + RANDOM() * 0.50))::int
            ));
            IF v_sentiment = 'negative' THEN
                v_risk := GREATEST(v_risk, 50);
            ELSIF v_sentiment = 'positive' THEN
                v_risk := LEAST(v_risk, 65);
            END IF;

            -- Keywords
            v_kw := kw_materias[1 + FLOOR(RANDOM() * array_length(kw_materias, 1))::int];

            INSERT INTO intelligence_feed (
                id, user_id, activation_id,
                title, content, summary,
                source, source_type,
                sentiment, risk_score, keywords,
                status, created_at, published_at,
                classification_metadata
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_activation_id,
                '[SEED_HISTORICO_2026] ' || v_source || ' D-' || v_day_offset || ' #' || v_i,
                to_jsonb('Matéria em ' || v_source || ' (' || v_source_type || '). Dia D-' || v_day_offset || '.'),
                'Matéria simulada — ' || v_sentiment || ', risco ' || v_risk || '.',
                v_source,
                v_source_type,
                v_sentiment,
                v_risk,
                v_kw,
                'active',
                v_ts,
                v_ts,
                jsonb_build_object(
                    'detected_entities', jsonb_build_array(
                        jsonb_build_object('name', 'entidade_simulada', 'type', 'person', 'role', 'target')
                    ),
                    'is_seed', true,
                    'seed_tag', 'SEED_HISTORICO_2026',
                    'seed_day_offset', v_day_offset,
                    'confidence', ROUND((0.70 + RANDOM() * 0.25)::numeric, 2)
                )
            );
        END LOOP; -- matérias

    END LOOP; -- dias

    RAISE NOTICE '✅ Seed concluído! Para excluir: DELETE FROM intelligence_feed WHERE title LIKE ''[SEED_HISTORICO_2026]%%'';';

END $$;


-- =============================================================================
-- VERIFICAÇÃO — Resumo por dia e fonte
-- =============================================================================
SELECT
    DATE(created_at)  AS dia,
    source_type       AS tipo,
    COUNT(*)          AS total,
    COUNT(*) FILTER (WHERE sentiment = 'positive') AS positivo,
    COUNT(*) FILTER (WHERE sentiment = 'negative') AS negativo,
    COUNT(*) FILTER (WHERE sentiment = 'neutral')  AS neutro,
    ROUND(AVG(risk_score)::numeric, 1)               AS avg_risk
FROM intelligence_feed
WHERE title LIKE '[SEED_HISTORICO_2026]%'
GROUP BY DATE(created_at), source_type
ORDER BY dia DESC, tipo;


-- =============================================================================
-- COMO EXCLUIR (execute quando quiser remover os dados de demo)
-- =============================================================================
-- DELETE FROM intelligence_feed
-- WHERE title LIKE '[SEED_HISTORICO_2026]%';
-- =============================================================================
