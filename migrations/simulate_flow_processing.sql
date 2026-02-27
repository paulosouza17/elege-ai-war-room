-- Simular Worker de Processamento
-- 1. Pegar execuções pendentes e marcar como running
UPDATE flow_executions
SET status = 'running',
    started_at = NOW()
WHERE status = 'pending';

-- Aguardar um pouco (na vida real) ... 

-- 2. Pegar execuções running e marcar como completed com log de sucesso
UPDATE flow_executions
SET status = 'completed',
    completed_at = NOW(),
    execution_log = '[
        {"nodeId": "node-1", "status": "completed", "output": "Trigger acionado"},
        {"nodeId": "node-2", "status": "completed", "output": "Log realizado com sucesso"}
    ]'::jsonb
WHERE status = 'running';
