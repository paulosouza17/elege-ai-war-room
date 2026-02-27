-- Verify Realtime is enabled and flow_executions is published
SELECT 
    schemaname,
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check if flow_executions specifically is in the publication
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'flow_executions'
        ) THEN '✅ flow_executions IS in Realtime publication'
        ELSE '❌ flow_executions NOT in Realtime publication - Run: ALTER PUBLICATION supabase_realtime ADD TABLE flow_executions;'
    END as status;

-- Check recent execution
SELECT 
    id,
    status,
    started_at,
    current_node_id,
    jsonb_array_length(execution_log) as log_count
FROM flow_executions
ORDER BY started_at DESC
LIMIT 3;
