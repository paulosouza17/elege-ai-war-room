-- Debug: Check if Publish node is creating entries in intelligence_feed

-- 1. Check recent entries in intelligence_feed
SELECT 
    id,
    title,
    category,
    created_at,
    meta
FROM intelligence_feed
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if there are any entries from flows
SELECT 
    id,
    title,
    category,
    created_at,
    meta->>'source' as source,
    meta
FROM intelligence_feed
WHERE meta->>'source' = 'flow'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check schema of intelligence_feed
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'intelligence_feed'
ORDER BY ordinal_position;

-- 4. Try manual insert to test
INSERT INTO intelligence_feed (title, category, meta)
VALUES ('Test from SQL', 'neutral', '{"source": "manual_test"}'::jsonb)
RETURNING *;
