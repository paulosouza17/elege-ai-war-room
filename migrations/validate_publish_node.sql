-- VALIDAÇÃO COMPLETA do Publish Node (CORRIGIDA)

-- 1. Ver a última entry criada (deve ser a mais recente)
SELECT 
    id,
    title,
    category,
    created_at,
    -- Verificar se ainda tem placeholders não substituídos
    CASE 
        WHEN content::text LIKE '%{node-%' THEN '❌ TEM PLACEHOLDERS NÃO SUBSTITUÍDOS'
        ELSE '✅ PLACEHOLDERS SUBSTITUÍDOS'
    END as placeholder_status,
    meta->'sourceNodes' as source_nodes_detected
FROM intelligence_feed
WHERE source = 'flow_automation'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Ver o conteúdo COMPLETO da última entry
SELECT 
    title,
    content,
    meta
FROM intelligence_feed
WHERE source = 'flow_automation'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Verificar as conexões atuais no flow (quantas entradas no node-3)
SELECT 
    edge->>'source' as source_node,
    edge->>'target' as target_node
FROM flows,
     jsonb_array_elements(edges) as edge
WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc'
  AND edge->>'target' = 'node-3';

-- 4. Verificar sourceNodes configurados no publish node
SELECT 
    node->'data'->'sourceNodes' as configured_source_nodes
FROM flows,
     jsonb_array_elements(nodes) as node
WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc'
  AND node->>'id' = 'node-3';
