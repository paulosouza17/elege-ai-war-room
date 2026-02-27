-- Enable RLS for Escalation Flow (PUBLIC / DEMO MODE) - V2

-- Clean up existing policies (Drop if they exist to prevent errors)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON crisis_packets;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON mentions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON crisis_packets;

-- Clean up new policies if they already exist (Fix for "policy already exists" error)
DROP POLICY IF EXISTS "Allow public insert for demo" ON crisis_packets;
DROP POLICY IF EXISTS "Allow public update for demo" ON mentions;
DROP POLICY IF EXISTS "Allow public update for demo" ON crisis_packets;

-- 1. Allow INSERT on crisis_packets for EVERYONE (Demo)
CREATE POLICY "Allow public insert for demo" ON crisis_packets
FOR INSERT WITH CHECK (true);

-- 2. Allow UPDATE on Mentions for EVERYONE (Demo)
CREATE POLICY "Allow public update for demo" ON mentions
FOR UPDATE USING (true);

-- 3. Allow UPDATE on Crisis Packets for EVERYONE (Demo)
CREATE POLICY "Allow public update for demo" ON crisis_packets
FOR UPDATE USING (true);
