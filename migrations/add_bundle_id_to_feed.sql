-- Add bundle_id to intelligence_feed for crisis bundling
-- When a mention is escalated, related mentions (shared keywords/entities)
-- get their bundle_id set to the primary mention's ID

ALTER TABLE public.intelligence_feed 
    ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES public.intelligence_feed(id);

-- Index for fast lookups of bundled mentions
CREATE INDEX IF NOT EXISTS idx_intelligence_feed_bundle_id 
    ON public.intelligence_feed(bundle_id) 
    WHERE bundle_id IS NOT NULL;
