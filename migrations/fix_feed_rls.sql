-- Allow authenticated users to insert into intelligence_feed (for manual inputs)
CREATE POLICY "Enable insert for authenticated users"
ON public.intelligence_feed
FOR INSERT
TO authenticated
WITH CHECK (true); -- Ideally restrict to own user_id, but for MVP/Team access, true is fine.

-- Ensure they can see their own inserts (if not covered by existing select policy)
CREATE POLICY "Enable select for authenticated users"
ON public.intelligence_feed
FOR SELECT
TO authenticated
USING (true); -- View all feed items
