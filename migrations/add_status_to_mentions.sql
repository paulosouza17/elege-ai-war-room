-- MIGRATION: Add Status to Mentions for Triage
-- Adiciona suporte a fluxo de trabalho no Feed (Pendente -> Processado -> Arquivado)

ALTER TABLE mentions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'archived', 'escalated'
ADD COLUMN IF NOT EXISTS handling_note TEXT;

-- Atualiza mentions existentes para 'pending' se estiver nulo
UPDATE mentions SET status = 'pending' WHERE status IS NULL;

-- Index para performance em filtros de status
CREATE INDEX IF NOT EXISTS idx_mentions_status ON mentions(status);

SELECT 'Migration applied: added status and handling_note to mentions' as result;
