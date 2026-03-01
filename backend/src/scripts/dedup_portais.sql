-- =============================================================
-- Deduplicação do Feed de Portais
-- Mantém o registro MAIS ANTIGO (primeiro inserido) de cada grupo
-- de duplicatas e remove os demais.
-- =============================================================

-- 1. PREVIEW: ver duplicatas por título (mesmo activation_id)
--    Rode este SELECT primeiro para validar antes de deletar.

SELECT
    title,
    activation_id,
    COUNT(*) AS total,
    MIN(created_at) AS primeiro,
    MAX(created_at) AS ultimo,
    ARRAY_AGG(id ORDER BY created_at) AS ids
FROM intelligence_feed
WHERE source_type NOT IN ('tv', 'radio', 'whatsapp', 'instagram', 'tiktok', 'social_media')
  AND title IS NOT NULL
  AND title != ''
  AND title != 'Sem título'
  AND status != 'archived'
GROUP BY title, activation_id
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 50;

-- 2. PREVIEW: ver duplicatas por URL (mesmo activation_id)

SELECT
    url,
    activation_id,
    COUNT(*) AS total,
    MIN(created_at) AS primeiro,
    MAX(created_at) AS ultimo,
    ARRAY_AGG(id ORDER BY created_at) AS ids
FROM intelligence_feed
WHERE source_type NOT IN ('tv', 'radio', 'whatsapp', 'instagram', 'tiktok', 'social_media')
  AND url IS NOT NULL
  AND url != ''
  AND url NOT LIKE 'elegeai-%'
  AND status != 'archived'
GROUP BY url, activation_id
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 50;

-- 3. CONTAGEM: total de registros que serão removidos

WITH duplicates_by_title AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY title, activation_id
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM intelligence_feed
    WHERE source_type NOT IN ('tv', 'radio', 'whatsapp', 'instagram', 'tiktok', 'social_media')
      AND title IS NOT NULL
      AND title != ''
      AND title != 'Sem título'
),
duplicates_by_url AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY url, activation_id
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM intelligence_feed
    WHERE source_type NOT IN ('tv', 'radio', 'whatsapp', 'instagram', 'tiktok', 'social_media')
      AND url IS NOT NULL
      AND url != ''
      AND url NOT LIKE 'elegeai-%'
)
SELECT
    (SELECT COUNT(*) FROM duplicates_by_title WHERE rn > 1) AS duplicatas_por_titulo,
    (SELECT COUNT(*) FROM duplicates_by_url WHERE rn > 1)   AS duplicatas_por_url;

-- =============================================================
-- 4. DELETE: Remover duplicatas por TÍTULO (mantém o mais antigo)
--    ⚠️  RODE O PREVIEW ANTES!
--    Pula registros vinculados a crisis_events.
-- =============================================================

DELETE FROM intelligence_feed
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY title, activation_id
                   ORDER BY created_at ASC, id ASC
               ) AS rn
        FROM intelligence_feed
        WHERE source_type NOT IN ('tv', 'radio', 'whatsapp', 'instagram', 'tiktok', 'social_media')
          AND title IS NOT NULL
          AND title != ''
          AND title != 'Sem título'
    ) ranked
    WHERE rn > 1
)
AND NOT EXISTS (
    SELECT 1 FROM crisis_events ce WHERE ce.source_feed_id = intelligence_feed.id
);

-- =============================================================
-- 5. DELETE: Remover duplicatas por URL (mantém o mais antigo)
--    ⚠️  RODE O PREVIEW ANTES!
--    Pula registros vinculados a crisis_events.
-- =============================================================

DELETE FROM intelligence_feed
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY url, activation_id
                   ORDER BY created_at ASC, id ASC
               ) AS rn
        FROM intelligence_feed
        WHERE source_type NOT IN ('tv', 'radio', 'whatsapp', 'instagram', 'tiktok', 'social_media')
          AND url IS NOT NULL
          AND url != ''
          AND url NOT LIKE 'elegeai-%'
    ) ranked
    WHERE rn > 1
)
AND NOT EXISTS (
    SELECT 1 FROM crisis_events ce WHERE ce.source_feed_id = intelligence_feed.id
);
