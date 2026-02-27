-- Ver a última entry criada no intelligence_feed
SELECT 
    id,
    title,
    content,
    category,
    created_at,
    meta
FROM intelligence_feed
ORDER BY created_at DESC
LIMIT 3;
