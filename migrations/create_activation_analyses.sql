-- ============================================
-- Table: activation_analyses
-- Persists AI-generated analyses per activation
-- Regeneration overwrites (UPSERT on activation_id)
-- ============================================

CREATE TABLE IF NOT EXISTS public.activation_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id UUID NOT NULL REFERENCES public.activations(id) ON DELETE CASCADE,
    analysis TEXT NOT NULL,
    generated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activation_id) -- One analysis per activation, overwrite on regenerate
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activation_analyses_activation ON public.activation_analyses(activation_id);

-- RLS
ALTER TABLE public.activation_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analyses of their activations"
    ON public.activation_analyses FOR SELECT
    USING (
        activation_id IN (
            SELECT id FROM public.activations
            WHERE created_by = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can manage analyses"
    ON public.activation_analyses FOR ALL
    USING (
        generated_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Service role full access to activation_analyses"
    ON public.activation_analyses FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_activation_analyses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activation_analyses_timestamp
    BEFORE UPDATE ON public.activation_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_activation_analyses_timestamp();
