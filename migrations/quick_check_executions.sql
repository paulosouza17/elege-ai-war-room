-- 🔍 QUICK CHECK: Verify if table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'flow_executions'
        ) THEN '✅ Table EXISTS'
        ELSE '❌ Table MISSING - Run run_flow_executions_setup.sql'
    END as status;

-- If table exists, check if you can SELECT (test RLS)
-- Comment this out if table doesn't exist
SELECT COUNT(*) as execution_count FROM flow_executions;
