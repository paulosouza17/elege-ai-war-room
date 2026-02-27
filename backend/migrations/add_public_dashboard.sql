-- Public Dashboard sharing per activation
-- Adds token, enabled flag, and optional password to activations table

ALTER TABLE activations ADD COLUMN IF NOT EXISTS public_dashboard_token VARCHAR(64) UNIQUE;
ALTER TABLE activations ADD COLUMN IF NOT EXISTS public_dashboard_enabled BOOLEAN DEFAULT false;
ALTER TABLE activations ADD COLUMN IF NOT EXISTS public_dashboard_password VARCHAR(256);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_activations_dashboard_token ON activations(public_dashboard_token);
