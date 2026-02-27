-- Adicionar colunas analíticas ao Intelligence Feed
ALTER TABLE intelligence_feed
ADD COLUMN IF NOT EXISTS classification_metadata JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS sentiment TEXT,
ADD COLUMN IF NOT EXISTS risk_score FLOAT,
ADD COLUMN IF NOT EXISTS narrative TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT[]; -- Array de palavras-chave associadas

-- Atualizar cache do postgrest
NOTIFY pgrst, 'reload config';
