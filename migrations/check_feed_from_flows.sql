-- Quick check: Was publish node executed in latest flow run?

SELECT 
    COUNT(*) as publish_entries_from_flows
FROM intelligence_feed
WHERE meta->>'flowNodeId' IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour';

-- Show all feed entries created in last hour
SELECT 
    id,
    title,
    category,
    created_at,
    meta->>'flowNodeId' as from_flow_node,
    meta->>'source' as source_type
FROM intelligence_feed
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
