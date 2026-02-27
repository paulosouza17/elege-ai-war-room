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

-- Create Intelligence Feed table (fixing missing table error)
CREATE TABLE IF NOT EXISTS public.intelligence_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID REFERENCES public.demands(id),
    title TEXT NOT NULL,
    content JSONB, -- JSONB to store objects/results flexibly
    source TEXT,
    input_type TEXT DEFAULT 'text',
    source_node_id TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_feed ENABLE ROW LEVEL SECURITY;

-- Policies for Demands
DROP POLICY IF EXISTS "Enable read access for all users" ON public.demands;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.demands;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.demands;

CREATE POLICY "Enable read access for all users" ON public.demands FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.demands FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.demands FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Policies for Feed
DROP POLICY IF EXISTS "Enable read access for all users" ON public.intelligence_feed;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.intelligence_feed;

CREATE POLICY "Enable read access for all users" ON public.intelligence_feed FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.intelligence_feed FOR INSERT TO public WITH CHECK (true);
