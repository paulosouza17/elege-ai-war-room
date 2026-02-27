-- Check for triggers, functions, and policies on intelligence_feed

-- 1. Check all triggers on intelligence_feed
SELECT 
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'intelligence_feed';

-- 2. Check RLS policies on intelligence_feed
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'intelligence_feed';

-- 3. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'intelligence_feed';

-- 4. Check recent entries (last 24h)
SELECT 
    id,
    title,
    category,
    created_at,
    meta->>'flowNodeId' as from_flow
FROM intelligence_feed
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Try to insert directly to test if INSERT works
INSERT INTO intelligence_feed (
    title,
    category,
    meta
) VALUES (
    'Test Backend Flow INSERT',
    'neutral',
    '{"source": "test_from_sql", "content": "Testing if backend can INSERT", "timestamp": "2026-02-17T12:14:00Z"}'::jsonb
) RETURNING id, title, created_at;
