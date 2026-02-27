-- Check if feed item was actually inserted
SELECT 
    id,
    title,
    category,
    created_at,
    demand_id,
    source
FROM intelligence_feed
WHERE demand_id = '9e231ede-6db0-499f-83ee-09fea2ecaef5'
ORDER BY created_at DESC;

-- Check RLS policies on intelligence_feed
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
WHERE tablename = 'intelligence_feed';

-- Check if activation_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'intelligence_feed';
