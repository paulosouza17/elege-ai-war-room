-- Check saved flow structure to see if publish node exists

SELECT 
    id,
    name,
    nodes,
    edges
FROM flows
ORDER BY updated_at DESC
LIMIT 1;

-- Extract just the publish node if it exists
SELECT 
    id,
    name,
    jsonb_pretty(
        (
            SELECT jsonb_agg(node)
            FROM jsonb_array_elements(nodes) as node
            WHERE node->>'type' = 'publish'
        )
    ) as publish_nodes
FROM flows
ORDER BY updated_at DESC
LIMIT 1;
