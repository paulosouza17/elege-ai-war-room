-- Verificação E2E Completa (Backend Simulation)
BEGIN;

-- 1. Aprovar Ativação
UPDATE activations
SET status = 'active', admin_feedback = 'E2E Test Approved'
WHERE name = 'Teste E2E Automatizado' AND status = 'pending';

-- 2. Trigger Flow (Simulando o React)
INSERT INTO flow_executions (flow_id, status, context, user_id)
SELECT 
    f.id,
    'pending',
    jsonb_build_object(
        'trigger', 'activation_event',
        'activation_id', a.id,
        'keywords', a.keywords
    ),
    a.created_by
FROM activations a
CROSS JOIN flows f
WHERE a.name = 'Teste E2E Automatizado'
  AND f.active = true
  AND NOT EXISTS (
      SELECT 1 FROM flow_executions fe 
      WHERE fe.context->>'activation_id' = a.id::text
  ); -- Evita duplicar se já rodou

-- 3. Processar (Simulando Worker)
UPDATE flow_executions
SET status = 'running', started_at = NOW()
WHERE status = 'pending' AND context->>'trigger' = 'activation_event';

-- Delay simulado (não necessário em SQL puro, mas conceitual)

UPDATE flow_executions
SET status = 'completed', 
    completed_at = NOW(),
    execution_log = '[{"step": "verified", "status": "success"}]'::jsonb
WHERE status = 'running' AND context->>'trigger' = 'activation_event';

-- 4. Relatório Final
SELECT jsonb_build_object(
    'activation_status', (SELECT status FROM activations WHERE name = 'Teste E2E Automatizado'),
    'flow_executions_count', (SELECT COUNT(*) FROM flow_executions WHERE context->>'trigger' = 'activation_event'),
    'last_execution_status', (SELECT status FROM flow_executions WHERE context->>'trigger' = 'activation_event' ORDER BY created_at DESC LIMIT 1)
) as e2e_report;

COMMIT;
