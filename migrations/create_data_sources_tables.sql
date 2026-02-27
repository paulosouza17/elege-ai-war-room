-- Create data_sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'social', 'seo', 'news', 'political', 'ai'
    config JSONB DEFAULT '{}'::jsonb, -- Encrypted keys, settings
    is_active BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create external_data_logs table for auditing
CREATE TABLE IF NOT EXISTS external_data_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    endpoint TEXT,
    status TEXT, -- 'success', 'error'
    payload JSONB,
    response JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies (Open for now, similar to other tables in this dev environment)
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_data_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid errors on rerun
DROP POLICY IF EXISTS "Enable all access for all users" ON data_sources;
DROP POLICY IF EXISTS "Enable all access for all users" ON external_data_logs;

CREATE POLICY "Enable all access for all users" ON data_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for all users" ON external_data_logs FOR ALL USING (true) WITH CHECK (true);

-- Insert initial supported sources (inactive by default)
INSERT INTO data_sources (name, type, config, is_active) VALUES
    ('Perplexity AI', 'ai', '{"model": "sonar-pro"}', false),
    ('Google Trends', 'market', '{"region": "BR"}', false),
    ('SEMrush', 'seo', '{}', false),
    ('BuzzSumo', 'content', '{}', false),
    ('X (Twitter)', 'social', '{}', false),
    ('Brandwatch', 'social', '{}', false),
    ('SimilarWeb', 'market', '{}', false),
    ('Ahrefs', 'seo', '{}', false),
    ('Brasil.IO (TSE)', 'political', '{}', false)
ON CONFLICT DO NOTHING; -- No unique constraint on name yet, but good practice if we add one
