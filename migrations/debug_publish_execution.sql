-- Verificar se o publish node está sendo executado

-- 1. Últimas execuções de flow
SELECT 
    id,
    flow_id,
    status,
    started_at,
    completed_at,
    current_node_id,
    jsonb_array_length(execution_log) as nodes_executed
FROM flow_executions
ORDER BY started_at DESC
LIMIT 5;

-- 2. Ver quais nós foram executados na última execução
SELECT 
    id as execution_id,
    jsonb_array_elements(execution_log)->>'nodeId' as node_id,
    jsonb_array_elements(execution_log)->>'nodeType' as node_type,
    jsonb_array_elements(execution_log)->>'status' as node_status
FROM flow_executions
ORDER BY started_at DESC
LIMIT 1;

-- 3. Verificar se alguma entry foi criada no intelligence_feed nos últimos 10 minutos
SELECT 
    id,
    title,
    category,
    created_at,
    meta->>'flowNodeId' as from_node,
    meta->>'template' as template_used
FROM intelligence_feed
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- 4. Ver a configuração do publish node no flow atual
SELECT 
    f.id as flow_id,
    f.name as flow_name,
    node->>'id' as node_id,
    node->>'type' as node_type,
    node->'data'->>'title' as title_config,
    node->'data'->>'category' as category_config,
    node->'data'->>'template' as template_config
FROM flows f,
     jsonb_array_elements(f.nodes) as node
WHERE node->>'type' = 'publish'
ORDER BY f.updated_at DESC
LIMIT 1;
