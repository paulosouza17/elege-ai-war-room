-- Create system_keywords table for centralized keyword management
CREATE TABLE IF NOT EXISTS public.system_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    source TEXT DEFAULT 'manual', -- 'manual' or 'auto' (from monitoring)
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT system_keywords_unique UNIQUE (keyword)
);

-- Enable RLS
ALTER TABLE public.system_keywords ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read system_keywords" ON public.system_keywords FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert system_keywords" ON public.system_keywords FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated users can update system_keywords" ON public.system_keywords FOR UPDATE TO public USING (true);
CREATE POLICY "Authenticated users can delete system_keywords" ON public.system_keywords FOR DELETE TO public USING (true);

-- Index for search
CREATE INDEX IF NOT EXISTS idx_system_keywords_keyword ON public.system_keywords(keyword);
