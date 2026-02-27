-- Enable RLS
ALTER TABLE activation_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;

-- 1. Activation Files Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON activation_files;
CREATE POLICY "Enable read access for authenticated users"
ON activation_files FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON activation_files;
CREATE POLICY "Enable insert for authenticated users"
ON activation_files FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for service role only" ON activation_files;
CREATE POLICY "Enable update for service role only"
ON activation_files FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Flow Executions Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON flow_executions;
DROP POLICY IF EXISTS "Enable read access for executions" ON flow_executions; -- Possible dup name
CREATE POLICY "Enable read access for executions"
ON flow_executions FOR SELECT
TO authenticated
USING (true);
