-- Fix: Allow same URL across different activations
-- The original UNIQUE(url) was too restrictive

-- Drop old constraint
ALTER TABLE processed_articles DROP CONSTRAINT IF EXISTS processed_articles_url_key;

-- Add new composite unique constraint
ALTER TABLE processed_articles ADD CONSTRAINT processed_articles_url_activation_unique UNIQUE(url, activation_id);
