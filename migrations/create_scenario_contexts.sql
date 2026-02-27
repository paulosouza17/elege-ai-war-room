-- ============================================
-- Table: scenario_contexts
-- Manual text inputs for base scenario creation
-- References activation's critical analysis grouping
-- ============================================

CREATE TABLE IF NOT EXISTS public.scenario_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id UUID NOT NULL REFERENCES public.activations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- 'narrative', 'hypothesis', 'context', 'general'
    sort_order INT DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scenario_contexts_activation ON public.scenario_contexts(activation_id);
CREATE INDEX IF NOT EXISTS idx_scenario_contexts_sort ON public.scenario_contexts(activation_id, sort_order);

-- RLS
ALTER TABLE public.scenario_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scenario contexts of their activations"
    ON public.scenario_contexts FOR SELECT
    USING (
        activation_id IN (
            SELECT id FROM public.activations
            WHERE created_by = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can manage scenario contexts"
    ON public.scenario_contexts FOR ALL
    USING (
        created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Service role full access
CREATE POLICY "Service role full access to scenario_contexts"
    ON public.scenario_contexts FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_scenario_contexts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scenario_contexts_timestamp
    BEFORE UPDATE ON public.scenario_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_scenario_contexts_timestamp();
