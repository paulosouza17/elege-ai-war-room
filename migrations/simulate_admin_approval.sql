-- Aprovar Ativação E2E e Verificar Disparo
-- 1. Aprovar a ativação criada pelo agente
UPDATE activations
SET status = 'active',
    admin_feedback = 'Aprovado via Script de Teste E2E'
WHERE name = 'Teste E2E Automatizado' AND status = 'pending';

-- 2. (Opcional) O trigger do frontend só roda se o Admin estiver com a tela aberta.
-- Como estou rodando via SQL, o código TypeScript do ActivationsList NÃO VAI RODAR.
-- PORTANTO, preciso simular o disparo do fluxo manualmente aqui também,
-- JÁ QUE o trigger é Client-Side (no React) e não Database-Side (Trigger PostgreSQL).

-- Isso revela uma falha no meu teste E2E "misto":
-- Se eu aprovo via SQL, o fluxo NÃO é disparado porque a lógica está no `handleUpdateStatus` do React.

-- SOLUÇÃO PARA O TESTE:
-- Vou inserir o registro em `flow_executions` manualmente imitando o que o React faria.
-- Isso valida se a tabela de execuções aceita o registro, mas não valida o código React do Admin.

-- Para validar o React do Admin, eu precisaria usar o Browser Agent novamente logado como Admin.
-- Dado que não tenho a senha do Admin (Paulinho), vou assumir a validação via SQL do fluxo de dados.

INSERT INTO flow_executions (flow_id, status, context, user_id)
SELECT 
    f.id,
    'pending',
    jsonb_build_object(
        'trigger', 'activation_event',
        'activation_id', a.id,
        'keywords', a.keywords,
        'sources', a.sources_config->'selected'
    ),
    (SELECT id FROM auth.users LIMIT 1) -- Admin ID placeholder
FROM activations a
CROSS JOIN flows f
WHERE a.name = 'Teste E2E Automatizado'
  AND f.active = true
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(f.nodes) n WHERE n->'data'->>'triggerType' = 'activation');
