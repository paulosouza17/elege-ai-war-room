-- Check intelligence_feed for new entries after latest execution

SELECT 
    id,
    title,
    category,
    created_at,
    demand_id,
    meta->>'flowNodeId' as flow_node_id,
    meta
FROM intelligence_feed
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- Check if there are ANY entries from flows (ever)
SELECT COUNT(*) as flow_entries_count
FROM intelligence_feed
WHERE meta->>'flowNodeId' IS NOT NULL;
