-- Insert Default Sources
-- Executar para criar fontes válidas para ingestão

-- Manual Entry
INSERT INTO sources (id, name, type, layer, client_id, status)
VALUES 
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Entrada Manual', 'manual', 1, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'active'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Twitter / X', 'social', 1, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'active'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Portal de Notícias', 'news', 1, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'active')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    type = EXCLUDED.type;

SELECT * FROM sources;
