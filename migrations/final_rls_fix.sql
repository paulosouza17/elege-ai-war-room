-- SAFE FIX FOR RLS POLICIES (Run this in Supabase SQL Editor)

BEGIN;

-- 1. Ensure Realtime Publication exists (Ignore error if already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- 2. Add tables to publication (Check if they are already added)
DO $$
BEGIN
    -- Add flow_executions if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'flow_executions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE flow_executions;
    END IF;

    -- Add intelligence_feed if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'intelligence_feed'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE intelligence_feed;
    END IF;
END
$$;

-- 3. FIX RLS POLICIES (Drop and Recreate to be safe)

-- Enable RLS (Idempotent)
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_feed ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Anon/Authenticated to READ flow_executions
DROP POLICY IF EXISTS "Public Read Executions" ON flow_executions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON flow_executions;
DROP POLICY IF EXISTS "Enable read access for executions" ON flow_executions;

CREATE POLICY "Public Read Executions"
ON flow_executions FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: Allow Anon/Authenticated to READ intelligence_feed
DROP POLICY IF EXISTS "Public Read Feed" ON intelligence_feed;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON intelligence_feed;

CREATE POLICY "Public Read Feed"
ON intelligence_feed FOR SELECT
TO anon, authenticated
USING (true);

COMMIT;
