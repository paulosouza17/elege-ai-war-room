-- Create Demands table
CREATE TABLE IF NOT EXISTS public.demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'archived')),
    flow_id UUID REFERENCES public.flows(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on demands
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.demands FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.demands FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.demands FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Update intelligence_feed for Traceability
DO $$
BEGIN
    -- Add demand_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='intelligence_feed' AND column_name='demand_id') THEN
        ALTER TABLE public.intelligence_feed ADD COLUMN demand_id UUID REFERENCES public.demands(id);
    END IF;

    -- Add input_type (text, document, link, image)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='intelligence_feed' AND column_name='input_type') THEN
        ALTER TABLE public.intelligence_feed ADD COLUMN input_type TEXT DEFAULT 'text';
    END IF;

    -- Add source_node (to track which node in flow created this)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='intelligence_feed' AND column_name='source_node_id') THEN
        ALTER TABLE public.intelligence_feed ADD COLUMN source_node_id TEXT;
    END IF;

    -- Add meta for raw callbacks (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='intelligence_feed' AND column_name='meta') THEN
        ALTER TABLE public.intelligence_feed ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
