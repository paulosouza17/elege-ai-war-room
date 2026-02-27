-- Enable RLS for Escalation Flow

-- Allow INSERT on crisis_packets
CREATE POLICY "Enable insert for authenticated users only" ON crisis_packets
FOR INSERT WITH CHECK (true); -- Ideally restrict by org, but for demo: true

-- Allow UPDATE on Mentions (Status change)
CREATE POLICY "Enable update for authenticated users only" ON mentions
FOR UPDATE USING (true);

-- Allow UPDATE on Crisis Packets (Status change/Title fix)
CREATE POLICY "Enable update for authenticated users only" ON crisis_packets
FOR UPDATE USING (true);
