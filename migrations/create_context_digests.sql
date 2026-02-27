-- ============================================
-- Table: context_digests
-- Stores consolidated summaries from batches of intelligence_feed items
-- Part of the 3-level token optimization pipeline
-- ============================================

CREATE TABLE IF NOT EXISTS public.context_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id UUID NOT NULL REFERENCES public.activations(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    source_filter TEXT, -- NULL = all sources, otherwise specific source
    items_count INT NOT NULL DEFAULT 0,
    digest JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- digest schema:
    -- {
    --   "dominant_sentiment": "negative",
    --   "sentiment_breakdown": { "positive": 12, "negative": 45, "neutral": 30 },
    --   "top_themes": ["corte orçamentário", "greve"],
    --   "risk_level": "attention",
    --   "avg_risk_score": 62.5,
    --   "narrative_summary": "Cenário dominado por...",
    --   "key_entities_frequency": { "João Silva": 23, "Prefeitura": 45 },
    --   "key_facts": ["30% de redução", "prazo março"],
    --   "risk_indicators": ["escalada de protestos"]
    -- }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    feed_ids UUID[] DEFAULT '{}' -- References to processed intelligence_feed items
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_context_digests_activation ON context_digests(activation_id);
CREATE INDEX IF NOT EXISTS idx_context_digests_period ON context_digests(activation_id, period_start, period_end);

-- Enable RLS (same pattern as activation-scoped data)
ALTER TABLE public.context_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_digests" ON context_digests;
CREATE POLICY "admin_all_digests" ON context_digests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "user_activation_digests" ON context_digests;
CREATE POLICY "user_activation_digests" ON context_digests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM activations a
            WHERE a.id = context_digests.activation_id
            AND (
                a.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM activation_users au
                    WHERE au.activation_id = a.id
                    AND au.user_id = auth.uid()
                )
            )
        )
    );

-- Grant
GRANT ALL ON context_digests TO authenticated;
GRANT SELECT ON context_digests TO service_role;
