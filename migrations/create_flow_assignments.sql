-- Create flow_assignments table
CREATE TABLE IF NOT EXISTS public.flow_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

-- Add is_template column to flows if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flows' AND column_name='is_template') THEN
        ALTER TABLE public.flows ADD COLUMN is_template BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Enable RLS on assignments
ALTER TABLE public.flow_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflict
DROP POLICY IF EXISTS "Enable read access for all users" ON public.flow_assignments;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.flow_assignments;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.flow_assignments;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.flow_assignments;

-- Create permissive policies (for MVP/Dev ease)
CREATE POLICY "Enable read access for all users" ON public.flow_assignments FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.flow_assignments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.flow_assignments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON public.flow_assignments FOR DELETE TO public USING (true);
