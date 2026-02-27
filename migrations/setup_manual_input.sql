-- Create storage bucket for manual uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-uploads', 'manual-uploads', true) -- Public strictly for MVP ease of access by Worker
ON CONFLICT (id) DO NOTHING;

-- Policies for storage
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'manual-uploads' );

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'manual-uploads' );

-- Update intelligence_feed schema
ALTER TABLE intelligence_feed
ADD COLUMN IF NOT EXISTS activation_id UUID REFERENCES activations(id),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feed_activation ON intelligence_feed(activation_id);

-- Notify schema cache
NOTIFY pgrst, 'reload config';
