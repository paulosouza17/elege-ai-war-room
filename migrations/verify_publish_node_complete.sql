-- Deep verification of publish node in saved flow

-- 1. Get latest flow with all details
SELECT 
    id,
    name,
    jsonb_pretty(nodes) as all_nodes,
    jsonb_pretty(edges) as all_edges,
    updated_at
FROM flows
ORDER BY updated_at DESC
LIMIT 1;

-- 2. Extract ONLY publish node with ALL its data
SELECT 
    id as flow_id,
    name as flow_name,
    (
        SELECT jsonb_pretty(node)
        FROM jsonb_array_elements(nodes) as node
        WHERE node->>'type' = 'publish'
        LIMIT 1
    ) as publish_node_full_data
FROM flows
ORDER BY updated_at DESC
LIMIT 1;

-- 3. Check what's in the publish node data field specifically
SELECT 
    id as flow_id,
    (
        SELECT node->>'id'
        FROM jsonb_array_elements(nodes) as node
        WHERE node->>'type' = 'publish'
        LIMIT 1
    ) as publish_node_id,
    (
        SELECT node->'data'->>'title'
        FROM jsonb_array_elements(nodes) as node
        WHERE node->>'type' = 'publish'
        LIMIT 1
    ) as title,
    (
        SELECT node->'data'->>'category'
        FROM jsonb_array_elements(nodes) as node
        WHERE node->>'type' = 'publish'
        LIMIT 1
    ) as category,
    (
        SELECT node->'data'->>'template'
        FROM jsonb_array_elements(nodes) as node
        WHERE node->>'type' = 'publish'
        LIMIT 1
    ) as template,
    (
        SELECT node->'data'->'sourceNodes'
        FROM jsonb_array_elements(nodes) as node
        WHERE node->>'type' = 'publish'
        LIMIT 1
    ) as source_nodes
FROM flows
ORDER BY updated_at DESC
LIMIT 1;
