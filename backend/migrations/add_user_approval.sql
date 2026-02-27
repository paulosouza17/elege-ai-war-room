-- Add is_approved column to profiles table
-- Admins can approve/reject users. Users created by admin are auto-approved.
-- Self-registered users will be pending until approved.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Auto-approve all existing users
UPDATE profiles SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;

-- Create an index for quick pending user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_approval ON profiles(is_approved);
