-- =============================================================
-- Deduplicação COMPLETA do intelligence_feed
-- Cobre TODAS as fontes de mídia (portais, social, TV, rádio,
-- WhatsApp, Instagram, TikTok) e ameaças.
-- Mantém o registro MAIS ANTIGO de cada grupo de duplicatas.
-- =============================================================

-- =============================================================
-- PARTE 1: PREVIEW — rode estes SELECTs para inspecionar antes
-- =============================================================

-- 1A. Duplicatas por TÍTULO (mesmo activation_id)
SELECT
    title,
    activation_id,
    source_type,
    COUNT(*) AS total,
    MIN(created_at) AS primeiro,
    MAX(created_at) AS ultimo,
    ARRAY_AGG(id ORDER BY created_at) AS ids
FROM intelligence_feed
WHERE title IS NOT NULL
  AND title != ''
  AND title != 'Sem título'
GROUP BY title, activation_id, source_type
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 100;

-- 1B. Duplicatas por URL (mesmo activation_id)
SELECT
    url,
    activation_id,
    source_type,
    COUNT(*) AS total,
    MIN(created_at) AS primeiro,
    MAX(created_at) AS ultimo,
    ARRAY_AGG(id ORDER BY created_at) AS ids
FROM intelligence_feed
WHERE url IS NOT NULL
  AND url != ''
  AND url NOT LIKE 'elegeai-%'
GROUP BY url, activation_id, source_type
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 100;

-- 1C. Duplicatas por CONTEÚDO (content/summary — para social media, WhatsApp, etc.)
--     Usa LEFT(content,500) para agrupar conteúdos idênticos sem estouro de memória
SELECT
    LEFT(COALESCE(content::text, summary), 500) AS conteudo_trunc,
    activation_id,
    source,
    COUNT(*) AS total,
    MIN(created_at) AS primeiro,
    MAX(created_at) AS ultimo,
    ARRAY_AGG(id ORDER BY created_at) AS ids
FROM intelligence_feed
WHERE (content IS NOT NULL AND content::text != '')
   OR (summary IS NOT NULL AND summary != '')
GROUP BY LEFT(COALESCE(content::text, summary), 500), activation_id, source
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 100;

-- =============================================================
-- PARTE 2: CONTAGEM — quantos registros serão removidos
-- =============================================================

WITH dups_title AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY title, activation_id
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM intelligence_feed
    WHERE title IS NOT NULL AND title != '' AND title != 'Sem título'
),
dups_url AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY url, activation_id
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM intelligence_feed
    WHERE url IS NOT NULL AND url != '' AND url NOT LIKE 'elegeai-%'
),
dups_content AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY LEFT(COALESCE(content::text, summary), 500), activation_id, source
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM intelligence_feed
    WHERE (content IS NOT NULL AND content::text != '')
       OR (summary IS NOT NULL AND summary != '')
)
SELECT
    (SELECT COUNT(*) FROM dups_title WHERE rn > 1)   AS duplicatas_por_titulo,
    (SELECT COUNT(*) FROM dups_url WHERE rn > 1)     AS duplicatas_por_url,
    (SELECT COUNT(*) FROM dups_content WHERE rn > 1) AS duplicatas_por_conteudo;

-- =============================================================
-- PARTE 3: DELETE — ⚠️  RODE O PREVIEW E CONTAGEM ANTES!
-- Protege registros vinculados a crisis_events.
-- =============================================================

-- 3A. DELETE duplicatas por TÍTULO
DELETE FROM intelligence_feed
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY title, activation_id
                   ORDER BY created_at ASC, id ASC
               ) AS rn
        FROM intelligence_feed
        WHERE title IS NOT NULL AND title != '' AND title != 'Sem título'
    ) ranked
    WHERE rn > 1
)
AND NOT EXISTS (
    SELECT 1 FROM crisis_events ce WHERE ce.source_feed_id = intelligence_feed.id
);

-- 3B. DELETE duplicatas por URL
DELETE FROM intelligence_feed
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY url, activation_id
                   ORDER BY created_at ASC, id ASC
               ) AS rn
        FROM intelligence_feed
        WHERE url IS NOT NULL AND url != '' AND url NOT LIKE 'elegeai-%'
    ) ranked
    WHERE rn > 1
)
AND NOT EXISTS (
    SELECT 1 FROM crisis_events ce WHERE ce.source_feed_id = intelligence_feed.id
);

-- 3C. DELETE duplicatas por CONTEÚDO (content/summary)
DELETE FROM intelligence_feed
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY LEFT(COALESCE(content::text, summary), 500), activation_id, source
                   ORDER BY created_at ASC, id ASC
               ) AS rn
        FROM intelligence_feed
        WHERE (content IS NOT NULL AND content::text != '')
           OR (summary IS NOT NULL AND summary != '')
    ) ranked
    WHERE rn > 1
)
AND NOT EXISTS (
    SELECT 1 FROM crisis_events ce WHERE ce.source_feed_id = intelligence_feed.id
);
