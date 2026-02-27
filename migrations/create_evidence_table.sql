-- Create crisis_evidence table
CREATE TABLE IF NOT EXISTS public.crisis_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    crisis_id UUID NOT NULL REFERENCES public.crisis_packets(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('image', 'video', 'document', 'link', 'audio')) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.crisis_evidence ENABLE ROW LEVEL SECURITY;

-- Creating policies (similar to crisis_packets for now -> Open for authenticated users for demo)
CREATE POLICY "Enable read access for authenticated users" ON public.crisis_evidence
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.crisis_evidence
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.crisis_evidence
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.crisis_evidence
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions (just in case for public/anon if needed for dev, but keeping stricter for auth)
GRANT ALL ON public.crisis_evidence TO service_role;
GRANT ALL ON public.crisis_evidence TO authenticated;
