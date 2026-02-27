-- Check ai_configs table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_configs'
ORDER BY ordinal_position;
