-- Add analysis_instructions column to activations table
ALTER TABLE activations ADD COLUMN IF NOT EXISTS analysis_instructions TEXT DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN activations.analysis_instructions IS 'Custom AI analysis instructions for this activation. Directs how AI should analyze content (e.g., electoral, crisis management, narrative analysis).';
