-- Debug: Check if flow_executions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'flow_executions'
) as table_exists;

-- Check RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'flow_executions' AND schemaname = 'public';

-- List all RLS policies
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

-- Try to select from flow_executions (as authenticated user)
SELECT COUNT(*) FROM flow_executions;

-- If table doesn't exist, create it:
-- Run the create_flow_executions_schema.sql file first!
