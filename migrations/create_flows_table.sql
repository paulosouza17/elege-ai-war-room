-- Create flows table
CREATE TABLE IF NOT EXISTS public.flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure active column exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flows' AND column_name='active') THEN
        ALTER TABLE public.flows ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflict
DROP POLICY IF EXISTS "Enable read access for all users" ON public.flows;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.flows;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.flows;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.flows;

-- Create permissive policies
CREATE POLICY "Enable read access for all users" ON public.flows FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.flows FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.flows FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON public.flows FOR DELETE TO public USING (true);
