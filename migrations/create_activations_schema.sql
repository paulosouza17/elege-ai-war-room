-- Create Activations table
CREATE TABLE IF NOT EXISTS public.activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    keywords TEXT[] DEFAULT '{}',
    people_of_interest TEXT[] DEFAULT '{}',
    sources TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    flow_id UUID REFERENCES public.flows(id), -- Optional linked flow to run automatically
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add activation_id to demands (Execution Instances)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'demands' AND column_name = 'activation_id') THEN
        ALTER TABLE public.demands ADD COLUMN activation_id UUID REFERENCES public.activations(id);
    END IF;
END $$;

-- Add activation_id to intelligence_feed (Direct Traceability)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intelligence_feed' AND column_name = 'activation_id') THEN
        ALTER TABLE public.intelligence_feed ADD COLUMN activation_id UUID REFERENCES public.activations(id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;

-- Policies for Activations (Permissive for MVP, restrict later)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.activations;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.activations;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.activations;

CREATE POLICY "Enable read access for all users" ON public.activations FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.activations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.activations FOR UPDATE TO public USING (true) WITH CHECK (true);
