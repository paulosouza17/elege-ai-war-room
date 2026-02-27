
-- Run this in Supabase Dashboard -> SQL Editor

ALTER TABLE activation_files 
ADD COLUMN IF NOT EXISTS processing_result JSONB;
