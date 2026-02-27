-- Add political relevance score and audience data to media_outlets
-- political_relevance: 0-10 score (set by AI analysis)
-- audience_data: JSONB with monthly_visits, trend, projection, source, updated_at

ALTER TABLE media_outlets ADD COLUMN IF NOT EXISTS political_relevance SMALLINT DEFAULT NULL
    CHECK (political_relevance IS NULL OR (political_relevance >= 0 AND political_relevance <= 10));

ALTER TABLE media_outlets ADD COLUMN IF NOT EXISTS audience_data JSONB DEFAULT NULL;

-- Index for filtering/sorting by relevance
CREATE INDEX IF NOT EXISTS idx_media_outlets_relevance ON media_outlets(political_relevance);

COMMENT ON COLUMN media_outlets.political_relevance IS 'Political relevance score 0-10, populated by AI analysis';
COMMENT ON COLUMN media_outlets.audience_data IS 'Audience metrics: { monthly_visits, trend, projection, source, updated_at }';
