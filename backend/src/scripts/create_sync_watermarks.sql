-- Tabela para armazenar watermarks de sync incremental.
-- Cada coletor (elege_mentions, elege_channels, twitter, portals)
-- salva o último timestamp/ID processado por ativação.

CREATE TABLE IF NOT EXISTS sync_watermarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activation_id UUID NOT NULL REFERENCES activations(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,        -- 'elege_mentions', 'elege_channels', 'twitter', 'portal'
    source_key TEXT DEFAULT NULL,     -- person_id, channel_id, query hash, portal URL
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_item_id TEXT DEFAULT NULL,   -- último tweet ID ou post ID
    last_item_date TIMESTAMPTZ DEFAULT NULL, -- data do último item processado
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_watermarks_unique
    ON sync_watermarks(activation_id, source_type, COALESCE(source_key, ''));

-- Índice para queries de lookup rápido
CREATE INDEX IF NOT EXISTS idx_sync_watermarks_lookup
    ON sync_watermarks(activation_id, source_type);

-- RLS: Desabilitar para service_role (backend usa service key)
ALTER TABLE sync_watermarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON sync_watermarks
    FOR ALL USING (true) WITH CHECK (true);
