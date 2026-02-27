-- Enable RLS (just to be safe it's on)
ALTER TABLE public.crisis_evidence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict or just add new permisive ones
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.crisis_evidence;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.crisis_evidence;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.crisis_evidence;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.crisis_evidence;

-- Create permissive policies for ALL users (anon + authenticated)
CREATE POLICY "Enable read access for all users" ON public.crisis_evidence
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert access for all users" ON public.crisis_evidence
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.crisis_evidence
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON public.crisis_evidence
    FOR DELETE
    TO public
    USING (true);
