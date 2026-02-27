-- Adicionar TODAS as colunas que estão faltando no Intelligence Feed
ALTER TABLE intelligence_feed
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();

-- Atualizar cache do postgrest
NOTIFY pgrst, 'reload config';
