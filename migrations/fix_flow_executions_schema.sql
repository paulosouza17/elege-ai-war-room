-- Adicionar coluna 'context' em flow_executions se não existir
ALTER TABLE flow_executions
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::JSONB;

-- Garantir que user_id também exista (para log de quem executou)
ALTER TABLE flow_executions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Relaxar constraint de status para permitir 'pending' e 'queued'
ALTER TABLE flow_executions DROP CONSTRAINT IF EXISTS flow_executions_status_check;
ALTER TABLE flow_executions ADD CONSTRAINT flow_executions_status_check 
CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled'));

-- Recarregar schema cache (hack: um comentário no schema não faz nada, mas o DDL acima já força)
NOTIFY pgrst, 'reload config';
