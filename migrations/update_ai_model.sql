-- Update AI Config to use a valid model
-- Based on list_all_models.ts output

UPDATE ai_configs
SET model = 'gemini-2.0-flash'
WHERE client_id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

SELECT * FROM ai_configs WHERE client_id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
