-- SOLUÇÃO RÁPIDA: Configurar o publish node manualmente

UPDATE flows
SET nodes = jsonb_set(
    nodes,
    jsonb_array_position(nodes, (SELECT jsonb_array_elements(nodes) FROM flows WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc' AND jsonb_array_elements(nodes)->>'id' = 'node-3'))::text::int[],
    jsonb_build_object(
        'id', 'node-3',
        'type', 'publish',
        'position', (SELECT jsonb_array_elements(nodes)->'position' FROM flows WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc' AND jsonb_array_elements(nodes)->>'id' = 'node-3'),
        'data', jsonb_build_object(
            'label', 'Publicar no Feed',
            'iconType', 'publish',
            'title', 'Análise Política - Lula',
            'category', 'neutral',
            'template', 'Resultado da análise: {node-1} | Contexto adicional: {node-2}',
            'sourceNodes', (SELECT jsonb_array_elements(nodes)->'data'->'sourceNodes' FROM flows WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc'AND jsonb_array_elements(nodes)->>'id' = 'node-3')
        )
    )
)
WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc'
AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(nodes) n WHERE n->>'id' = 'node-3'
);

-- Verificar se funcionou
SELECT 
    node->>'id' as node_id,
    node->'data'->>'title' as title,
    node->'data'->>'category' as category,
    node->'data'->>'template' as template
FROM flows,
     jsonb_array_elements(nodes) as node
WHERE id = 'fccdee26-215b-41a6-8218-65b54db0fbfc'
  AND node->>'type' = 'publish';
