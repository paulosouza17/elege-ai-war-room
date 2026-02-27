-- Debug: Check if execution record exists and RLS policies
-- Replace the ID with your latest execution ID

-- 1. Check if record exists (bypasses RLS with admin view)
SELECT 
    id,
    status,
    started_at,
    current_node_id,
    jsonb_array_length(execution_log) as log_entries
FROM flow_executions
WHERE id = 'f5e98b44-f24a-438f-89e8-e9f088c80c87';

-- 2. Check RLS policies on flow_executions
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'flow_executions';

-- 3. Check if anon role can read
SET ROLE anon;
SELECT * FROM flow_executions WHERE id = 'f5e98b44-f24a-438f-89e8-e9f088c80c87';
RESET ROLE;
