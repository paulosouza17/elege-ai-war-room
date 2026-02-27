-- Add plan column to crisis_packets if it doesn't exist
ALTER TABLE public.crisis_packets ADD COLUMN IF NOT EXISTS plan JSONB;

-- Ensure RLS allows updating this column (already covered by generic update policy if exists, but good to verify)
