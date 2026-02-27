-- Check what's being saved in flows table
SELECT 
    id,
    name,
    nodes,
    edges,
    created_at
FROM flows
ORDER BY created_at DESC
LIMIT 5;

-- Check node structure
SELECT 
    id,
    name,
    jsonb_pretty(nodes::jsonb) as nodes_structure
FROM flows
ORDER BY created_at DESC
LIMIT 1;
