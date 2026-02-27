-- Add numeric sequential ID to monitored_entities
ALTER TABLE monitored_entities ADD COLUMN IF NOT EXISTS seq_id SERIAL;
