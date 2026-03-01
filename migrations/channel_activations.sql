-- Migration: channel_activations
-- Links Elege.AI channels to War Room activations (many-to-many)

CREATE TABLE IF NOT EXISTS channel_activations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    elege_channel_id INTEGER NOT NULL,
    channel_kind TEXT NOT NULL,
    channel_title TEXT NOT NULL,
    activation_id UUID NOT NULL REFERENCES activations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_activation_unique
    ON channel_activations(elege_channel_id, activation_id);

-- Index for fast lookup by channel
CREATE INDEX IF NOT EXISTS idx_channel_activations_channel
    ON channel_activations(elege_channel_id);

-- Index for fast lookup by activation
CREATE INDEX IF NOT EXISTS idx_channel_activations_activation
    ON channel_activations(activation_id);

-- Enable RLS
ALTER TABLE channel_activations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "channel_activations_select" ON channel_activations
    FOR SELECT USING (true);

-- Allow authenticated users to insert/delete
CREATE POLICY "channel_activations_insert" ON channel_activations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "channel_activations_delete" ON channel_activations
    FOR DELETE USING (true);
