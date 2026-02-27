-- Enable RLS for Escalation Flow (PUBLIC / DEMO MODE)

-- Drop previous restrictive policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON crisis_packets;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON mentions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON crisis_packets;

-- Allow INSERT on crisis_packets for EVERYONE (Demo)
CREATE POLICY "Allow public insert for demo" ON crisis_packets
FOR INSERT WITH CHECK (true);

-- Allow UPDATE on Mentions for EVERYONE (Demo)
CREATE POLICY "Allow public update for demo" ON mentions
FOR UPDATE USING (true);

-- Allow UPDATE on Crisis Packets for EVERYONE (Demo)
CREATE POLICY "Allow public update for demo" ON crisis_packets
FOR UPDATE USING (true);
