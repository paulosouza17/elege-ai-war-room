-- Check RLS policies on intelligence_feed
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'intelligence_feed';

-- Check if category and meta columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'intelligence_feed'
ORDER BY ordinal_position;

-- Test insert manually
INSERT INTO intelligence_feed (
    demand_id,
    title,
    content,
    category,
    source,
    input_type,
    meta
) VALUES (
    NULL,  -- Test without demand_id
    'Test Feed',
    'Test content',
    'neutral',
    'test',
    'test',
    '{"test": true}'::jsonb
);

-- Check recent feeds
SELECT id, demand_id, title, category, source, created_at
FROM intelligence_feed
ORDER BY created_at DESC
LIMIT 5;
