-- Ver TODAS as configurações do publish node no flow atual

SELECT 
    f.id as flow_id,
    f.name as flow_name,
    node->>'id' as node_id,
    node->>'type' as node_type,
    node->'data'->>'label' as node_label,
    node->'data'->>'title' as title_config,
    node->'data'->>'category' as category_config,
    node->'data'->>'template' as template_config,
    node->'data'->'sourceNodes' as source_nodes_config
FROM flows f,
     jsonb_array_elements(f.nodes) as node
WHERE node->>'type' = 'publish'
ORDER BY f.updated_at DESC
LIMIT 5;
