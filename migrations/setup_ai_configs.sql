-- Create ai_configs table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id), -- Optional: Link to specific client if multi-tenant
    provider TEXT NOT NULL, -- 'openai', 'gemini'
    model TEXT NOT NULL, -- 'gpt-4-turbo', 'gemini-1.5-flash'
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_ai_configs_provider ON ai_configs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_configs_active ON ai_configs(is_active);

-- RLS Policies (Simple for now, restrict to authenticated users)
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON ai_configs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write access for authenticated users" ON ai_configs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON ai_configs
    FOR UPDATE
    TO authenticated
    USING (true);

-- Example Insert (Commented out - User should run this with their actual key)
-- INSERT INTO ai_configs (provider, model, api_key, is_active) 
-- VALUES ('openai', 'gpt-4-turbo', 'sk-YOUR-KEY-HERE', true);
