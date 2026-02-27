-- ============================================
-- Table: report_links
-- Manages public report links with password protection and view limits
-- ============================================

CREATE TABLE IF NOT EXISTS public.report_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id UUID NOT NULL REFERENCES public.activations(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    max_views INT NOT NULL DEFAULT 10,
    current_views INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional date-based expiration
    revoked_at TIMESTAMPTZ  -- Soft-delete for revocation
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_links_token ON report_links(token);
CREATE INDEX IF NOT EXISTS idx_report_links_activation ON report_links(activation_id);

-- Enable RLS
ALTER TABLE public.report_links ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
DROP POLICY IF EXISTS "admin_all_report_links" ON report_links;
CREATE POLICY "admin_all_report_links" ON report_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can manage their own
DROP POLICY IF EXISTS "user_own_report_links" ON report_links;
CREATE POLICY "user_own_report_links" ON report_links
    FOR ALL USING (created_by = auth.uid());

-- Service role can read/update for public access verification
DROP POLICY IF EXISTS "service_read_report_links" ON report_links;
CREATE POLICY "service_read_report_links" ON report_links
    FOR SELECT USING (true);

-- Grant
GRANT ALL ON report_links TO authenticated;
GRANT SELECT, UPDATE ON report_links TO service_role;
