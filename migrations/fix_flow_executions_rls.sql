-- Fix RLS Policies to allow anon role to read executions
-- This allows the frontend (using anon key) to poll for execution updates

-- Drop existing SELECT policy
DROP POLICY IF EXISTS flow_executions_select_policy ON flow_executions;

-- Create new SELECT policy for both authenticated and anon
CREATE POLICY flow_executions_select_policy ON flow_executions
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Verify policies
SELECT 
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'flow_executions';
