-- Add missing keywords column to intelligence_feed
ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Create index for better performance on keyword searches
CREATE INDEX IF NOT EXISTS idx_intelligence_feed_keywords ON intelligence_feed USING GIN(keywords);
