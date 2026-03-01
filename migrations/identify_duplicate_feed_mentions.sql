-- =============================================================================
-- Script: Identificação e Limpeza de Menções Duplicadas no Feed
-- Tabela: intelligence_feed
-- Data: 2026-03-01
-- =============================================================================
-- Este script identifica menções idênticas no intelligence_feed e marca quais
-- devem ser removidas, mantendo apenas UMA de cada grupo de duplicatas
-- (a mais antiga, ou seja, a primeira inserida).
--
-- CRITÉRIOS DE DUPLICATA:
-- Duas entradas são consideradas idênticas quando possuem o MESMO:
--   - title (título)
--   - summary (resumo) 
--   - source (fonte)
--   - source_type (tipo de fonte)
--   - activation_id (ativação)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 1: Diagnóstico — Quantos grupos de duplicatas existem?
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 
    'RESUMO DE DUPLICATAS' AS info,
    COUNT(*) AS total_grupos_duplicados,
    SUM(quantidade - 1) AS total_registros_a_remover,
    SUM(quantidade) AS total_registros_envolvidos
FROM (
    SELECT 
        COALESCE(title, '') AS title,
        COALESCE(LEFT(summary, 500), '') AS summary_trunc,
        COALESCE(source, '') AS source,
        COALESCE(source_type, '') AS source_type,
        activation_id,
        COUNT(*) AS quantidade
    FROM intelligence_feed
    GROUP BY 
        COALESCE(title, ''),
        COALESCE(LEFT(summary, 500), ''),
        COALESCE(source, ''),
        COALESCE(source_type, ''),
        activation_id
    HAVING COUNT(*) > 1
) AS duplicatas;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 2: Listar os grupos de duplicatas com detalhes
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 
    COALESCE(title, '(sem título)') AS titulo,
    COALESCE(source, '(sem fonte)') AS fonte,
    COALESCE(source_type, '') AS tipo_fonte,
    activation_id,
    COUNT(*) AS quantidade_duplicatas,
    MIN(created_at) AS primeira_entrada,
    MAX(created_at) AS ultima_entrada,
    ARRAY_AGG(id ORDER BY created_at) AS ids_envolvidos
FROM intelligence_feed
GROUP BY 
    COALESCE(title, ''),
    COALESCE(LEFT(summary, 500), ''),
    COALESCE(source, ''),
    COALESCE(source_type, ''),
    activation_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, MIN(created_at) DESC
LIMIT 50;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 3: Identificar os IDs que devem ser REMOVIDOS
--          (mantém o registro mais antigo de cada grupo)
-- ─────────────────────────────────────────────────────────────────────────────
-- Esta query usa ROW_NUMBER() para numerar os registros dentro de cada grupo.
-- Apenas o primeiro (rn = 1) é mantido; os demais (rn > 1) são marcados para remoção.

SELECT 
    id AS id_para_remover,
    title AS titulo,
    source AS fonte,
    source_type AS tipo_fonte,
    activation_id,
    created_at,
    rn AS numero_na_sequencia
FROM (
    SELECT 
        id,
        title,
        summary,
        source,
        source_type,
        activation_id,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY 
                COALESCE(title, ''),
                COALESCE(LEFT(summary, 500), ''),
                COALESCE(source, ''),
                COALESCE(source_type, ''),
                activation_id
            ORDER BY created_at ASC
        ) AS rn
    FROM intelligence_feed
) AS ranked
WHERE rn > 1
ORDER BY created_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 4: CONTAGEM FINAL — Quantos registros serão removidos vs mantidos
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 
    COUNT(*) FILTER (WHERE rn = 1) AS registros_mantidos,
    COUNT(*) FILTER (WHERE rn > 1) AS registros_a_remover,
    COUNT(*) AS total_registros
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY 
                COALESCE(title, ''),
                COALESCE(LEFT(summary, 500), ''),
                COALESCE(source, ''),
                COALESCE(source_type, ''),
                activation_id
            ORDER BY created_at ASC
        ) AS rn
    FROM intelligence_feed
) AS ranked;


-- ═════════════════════════════════════════════════════════════════════════════
-- PASSO 5: REMOÇÃO DAS DUPLICATAS (DESCOMENTE PARA EXECUTAR)
-- ═════════════════════════════════════════════════════════════════════════════
-- ⚠️  ATENÇÃO: Este comando é DESTRUTIVO. Execute os passos acima primeiro
--     para verificar quais registros serão removidos.
--
-- DELETE FROM intelligence_feed
-- WHERE id IN (
--     SELECT id
--     FROM (
--         SELECT 
--             id,
--             ROW_NUMBER() OVER (
--                 PARTITION BY 
--                     COALESCE(title, ''),
--                     COALESCE(LEFT(summary, 500), ''),
--                     COALESCE(source, ''),
--                     COALESCE(source_type, ''),
--                     activation_id
--                 ORDER BY created_at ASC
--             ) AS rn
--         FROM intelligence_feed
--     ) AS ranked
--     WHERE rn > 1
-- );
--
-- Após a remoção, verifique:
-- SELECT COUNT(*) AS total_apos_limpeza FROM intelligence_feed;


-- ═════════════════════════════════════════════════════════════════════════════
-- PASSO 6 (OPCIONAL): Verificação EXTRA por URL idêntica
-- ═════════════════════════════════════════════════════════════════════════════
-- Algumas menções podem ter títulos diferentes mas a MESMA URL.
-- Esta query identifica esse cenário separadamente.

SELECT 
    url,
    COUNT(*) AS quantidade,
    ARRAY_AGG(id ORDER BY created_at) AS ids,
    ARRAY_AGG(DISTINCT title) AS titulos_diferentes,
    MIN(created_at) AS primeira,
    MAX(created_at) AS ultima
FROM intelligence_feed
WHERE url IS NOT NULL AND url != ''
GROUP BY url, activation_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 30;


-- ═════════════════════════════════════════════════════════════════════════════
-- PASSO 7 (OPCIONAL): Verificação por conteúdo idêntico (content)
-- ═════════════════════════════════════════════════════════════════════════════
-- Identifica menções com conteúdo textual idêntico, mesmo com título diferente.

SELECT 
    LEFT(content, 100) AS preview_conteudo,
    COUNT(*) AS quantidade,
    ARRAY_AGG(DISTINCT title) AS titulos,
    ARRAY_AGG(DISTINCT source) AS fontes,
    MIN(created_at) AS primeira,
    MAX(created_at) AS ultima
FROM intelligence_feed
WHERE content IS NOT NULL AND content != ''
GROUP BY LEFT(content, 500), activation_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 30;
