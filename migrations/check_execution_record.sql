-- Check if the execution record was actually created
SELECT 
    id,
    status,
    started_at,
    current_node_id,
    jsonb_array_length(execution_log) as log_entries,
    execution_log
FROM flow_executions
WHERE id = '808749c7-c0fd-4ddf-a64f-13c61f4f3f45'
ORDER BY started_at DESC;

-- Check all recent executions
SELECT 
    id,
    status,
    started_at,
    completed_at,
    jsonb_array_length(execution_log) as steps,
    current_node_id
FROM flow_executions
ORDER BY started_at DESC
LIMIT 5;

-- Verify Realtime is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'flow_executions';
