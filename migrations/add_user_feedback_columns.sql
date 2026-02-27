-- Add user_feedback and comments columns to crisis_packets
ALTER TABLE public.crisis_packets ADD COLUMN IF NOT EXISTS user_feedback TEXT;
ALTER TABLE public.crisis_packets ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
