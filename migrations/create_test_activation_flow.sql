INSERT INTO flows (name, description, nodes, edges, active, user_id)
VALUES (
    'Fluxo Mestre de Ativação (Teste)',
    'Fluxo disparado automaticamente ao aprovar uma ativação. Recebe palavras-chave e fontes.',
    '[
        {
            "id": "node-1",
            "type": "trigger",
            "position": { "x": 100, "y": 100 },
            "data": { 
                "label": "Nova Ativação Aprovada", 
                "iconType": "activation", 
                "triggerType": "activation",
                "numericId": 1
            }
        },
        {
            "id": "node-2",
            "type": "action",
            "position": { "x": 400, "y": 100 },
            "data": { 
                "label": "Log de Início", 
                "iconType": "script", 
                "numericId": 2,
                "script": "console.log(\"Iniciando coleta para: \" + context.keywords)"
            }
        }
    ]'::jsonb,
    '[
        {
            "id": "edge-1-2",
            "source": "node-1",
            "target": "node-2",
            "animated": true,
            "style": { "stroke": "#64748b" }
        }
    ]'::jsonb,
    true,
    (SELECT id FROM auth.users LIMIT 1) -- Atribui ao primeiro usuário encontrado (Admin)
);
