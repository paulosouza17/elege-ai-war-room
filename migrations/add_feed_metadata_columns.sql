-- Add category and meta columns to intelligence_feed
-- Part of Flow Output Architecture implementation

-- Add category column for feed item classification
ALTER TABLE intelligence_feed
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'neutral';

-- Add meta JSONB column for storing raw flow data and traceability
ALTER TABLE intelligence_feed
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN intelligence_feed.category IS 'Feed item category: threat, opportunity, neutral, crisis';
COMMENT ON COLUMN intelligence_feed.meta IS 'Metadata including flowNodeId, sourceNodes, and rawData from flow execution';

-- Verify changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'intelligence_feed'
  AND column_name IN ('category', 'meta')
ORDER BY ordinal_position;
