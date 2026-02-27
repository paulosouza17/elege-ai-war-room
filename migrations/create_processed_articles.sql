-- Tabela de artigos já processados (deduplicação de links)
CREATE TABLE IF NOT EXISTS processed_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT,
    source_outlet_id UUID REFERENCES media_outlets(id),
    flow_id UUID,
    activation_id UUID,
    processed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(url)
);

-- RLS
ALTER TABLE processed_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on processed_articles"
    ON processed_articles FOR ALL
    USING (true)
    WITH CHECK (true);

-- Index para busca rápida por URL
CREATE INDEX idx_processed_articles_url ON processed_articles(url);
CREATE INDEX idx_processed_articles_processed_at ON processed_articles(processed_at);
