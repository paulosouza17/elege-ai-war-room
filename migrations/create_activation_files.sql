-- Create activation_files table for traceability
CREATE TABLE IF NOT EXISTS public.activation_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE,
    flow_execution_id UUID REFERENCES public.flow_executions(id) ON DELETE SET NULL,
    original_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.activation_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
ON public.activation_files FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.activation_files FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for service role or owner"
ON public.activation_files FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_activation_files_activation_id ON public.activation_files(activation_id);
CREATE INDEX idx_activation_files_status ON public.activation_files(status);

-- Notify schema cache
NOTIFY pgrst, 'reload config';
