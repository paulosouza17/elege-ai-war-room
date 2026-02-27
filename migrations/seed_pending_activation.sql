-- Inserir Ativação Pendente para Teste de Fluxo
INSERT INTO activations (
    name, 
    description, 
    category, 
    priority, 
    status, 
    keywords, 
    people_of_interest, 
    sources_config, 
    created_by,
    insight_preview
) VALUES (
    'Teste de Disparo Automático',
    'Esta ativação serve para testar se o fluxo mestre é disparado corretamente após a aprovação.',
    'Teste Técnico',
    'high',
    'pending',
    ARRAY['teste', 'automação', 'flow'],
    ARRAY['Dev Team'],
    '{"selected": ["twitter", "news"]}'::jsonb,
    (SELECT id FROM auth.users WHERE email LIKE 'ike%' LIMIT 1), -- Tenta pegar o ID do Ike
    '{"estimated_volume": "N/A", "complexity_score": 10, "recommended_sources": ["Debug"]}'::jsonb
);
