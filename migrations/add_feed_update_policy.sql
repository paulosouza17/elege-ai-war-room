-- ============================================
-- Add UPDATE + DELETE policies for intelligence_feed
-- Required for: alert dismiss/archive, feed management
-- ============================================

-- 1. Add UPDATE policy for authenticated users
-- Users can update feed items from their own activations
DROP POLICY IF EXISTS "Strict Update: Own Feed Items" ON intelligence_feed;

CREATE POLICY "Strict Update: Own Feed Items"
ON intelligence_feed FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  activation_id IN (SELECT id FROM activations WHERE created_by = auth.uid())
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  activation_id IN (SELECT id FROM activations WHERE created_by = auth.uid())
);

-- 2. Add DELETE policy for authenticated users (future-proofing)
DROP POLICY IF EXISTS "Strict Delete: Own Feed Items" ON intelligence_feed;

CREATE POLICY "Strict Delete: Own Feed Items"
ON intelligence_feed FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  activation_id IN (SELECT id FROM activations WHERE created_by = auth.uid())
);

-- 3. Ensure status column exists (it should, but just in case)
ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 4. Create index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_intelligence_feed_status ON intelligence_feed(status);
