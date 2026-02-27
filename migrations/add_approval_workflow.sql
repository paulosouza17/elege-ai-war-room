-- Adicionar colunas para fluxo de aprovação
ALTER TABLE activations 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS insight_preview JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS admin_feedback TEXT;

-- Atualizar check constraint de status para incluir novos status
ALTER TABLE activations DROP CONSTRAINT IF EXISTS activations_status_check;
ALTER TABLE activations ADD CONSTRAINT activations_status_check 
CHECK (status IN ('active', 'inactive', 'archived', 'pending', 'rejected'));

-- Atualizar status de ativações existentes (manter active)
-- Novas ativações criadas via UI entrarão como 'pending'
