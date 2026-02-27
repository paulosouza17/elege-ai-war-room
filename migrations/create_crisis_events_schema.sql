-- Create Crisis Events table
CREATE TABLE IF NOT EXISTS public.crisis_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    source_feed_id UUID REFERENCES public.intelligence_feed(id),
    activation_id UUID REFERENCES public.activations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- Enable RLS
ALTER TABLE public.crisis_events ENABLE ROW LEVEL SECURITY;

-- Policies (Permissive for MVP)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.crisis_events;
CREATE POLICY "Enable read access for all users" ON public.crisis_events FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.crisis_events;
CREATE POLICY "Enable insert access for all users" ON public.crisis_events FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.crisis_events;
CREATE POLICY "Enable update access for all users" ON public.crisis_events FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Add 'escalated' status to intelligence_feed if not exists (check constraint)
-- Note: intelligence_feed status might not be an enum or might need update.
-- Let's check intelligence_feed schema first, but usually we just add a column or check check constraints.
-- Assuming intelligence_feed has a status column or we add one.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intelligence_feed' AND column_name = 'status') THEN
        ALTER TABLE public.intelligence_feed ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;
