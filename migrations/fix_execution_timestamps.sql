-- Permitir NULL em datas de execução
ALTER TABLE flow_executions
ALTER COLUMN started_at DROP NOT NULL,
ALTER COLUMN completed_at DROP NOT NULL;

-- Aproveitar para garantir que execution_log também aceite NULL
ALTER TABLE flow_executions
ALTER COLUMN execution_log DROP NOT NULL;

-- Resetar falhas agora deve funcionar
UPDATE flow_executions
SET status = 'pending',
    execution_log = NULL,
    started_at = NULL, -- Agora permitido
    completed_at = NULL
WHERE status = 'failed' OR status = 'running';
