-- Add numeric sequential ID to media_outlets
ALTER TABLE media_outlets ADD COLUMN IF NOT EXISTS seq_id SERIAL;
