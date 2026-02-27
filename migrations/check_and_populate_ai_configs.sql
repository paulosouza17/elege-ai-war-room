-- Check if ai_configs table has data
SELECT COUNT(*) as total_models, 
       COUNT(*) FILTER (WHERE is_active = true) as active_models
FROM ai_configs;

-- View all models
SELECT id, model, provider, is_active, created_at
FROM ai_configs
ORDER BY created_at DESC;

-- If table is empty, insert some default models
INSERT INTO ai_configs (model, provider, api_key, is_active)
VALUES 
    ('gpt-4-turbo', 'openai', NULL, true),
    ('gpt-4o', 'openai', NULL, true),
    ('claude-3-opus-20240229', 'anthropic', NULL, true),
    ('gemini-pro', 'google', NULL, true)
ON CONFLICT DO NOTHING;

-- Verify inserted models
SELECT id, model, provider, is_active
FROM ai_configs
WHERE is_active = true
ORDER BY model;
