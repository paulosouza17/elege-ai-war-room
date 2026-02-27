-- Resetar falhas para tentar novamente (Segunda tentativa)
UPDATE flow_executions
SET status = 'pending',
    execution_log = NULL,
    started_at = NULL,
    completed_at = NULL
WHERE status = 'failed' OR status = 'running';
