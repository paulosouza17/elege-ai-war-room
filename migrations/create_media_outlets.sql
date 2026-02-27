-- Tabela de Veículos de Mídia
CREATE TABLE IF NOT EXISTS media_outlets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tv', 'radio', 'portal', 'instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'other')),
    url TEXT,
    logo_url TEXT,
    description TEXT,
    city TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE media_outlets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all media outlets"
    ON media_outlets FOR SELECT
    USING (true);

CREATE POLICY "Users can insert media outlets"
    ON media_outlets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media outlets"
    ON media_outlets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media outlets"
    ON media_outlets FOR DELETE
    USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_media_outlets_type ON media_outlets(type);
CREATE INDEX idx_media_outlets_user ON media_outlets(user_id);
