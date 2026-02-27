-- Ver quais nós existem no seu flow "Lula 2"
SELECT 
    node->>'id' as node_id,
    node->>'type' as node_type,
    node->'data'->>'label' as label,
    node->'data'->>'iconType' as icon_type
FROM flows,
     jsonb_array_elements(nodes) as node
WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc'
ORDER BY (node->>'id');

-- Ver as conexões (edges) do flow
SELECT 
    edge->>'id' as edge_id,
    edge->>'source' as source_node,
    edge->>'target' as target_node
FROM flows,
     jsonb_array_elements(edges) as edge
WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc';
