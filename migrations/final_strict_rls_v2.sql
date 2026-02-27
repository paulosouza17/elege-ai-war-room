
-- 1. Reset RLS on intelligence_feed to STRICT mode
alter table intelligence_feed enable row level security;

-- Drop loose policies
drop policy if exists "Enable read access for all authenticated users" on intelligence_feed;
drop policy if exists "Enable select for authenticated users" on intelligence_feed;
drop policy if exists "Enable insert for authenticated users" on intelligence_feed;
drop policy if exists "Strict Access: Own Feed Items" on intelligence_feed; -- Remove previous attempt

-- Create STRICT Read Policy
-- Users can see feed items if:
-- A) They own the item (user_id match)
-- B) The item belongs to an activation they created (activations.created_by)
create policy "Strict Access: Own Feed Items"
on intelligence_feed for select
to authenticated
using (
  auth.uid() = user_id 
  OR 
  activation_id in (select id from activations where created_by = auth.uid())
);

-- Note: 'activations' table uses 'created_by', not 'user_id'.

-- Create Insert Policy
create policy "Strict Insert: Own Data"
on intelligence_feed for insert
to authenticated
with check ( auth.uid() = user_id );

-- 2. Reset RLS on activations
alter table activations enable row level security;
drop policy if exists "Enable read access for authenticated users" on activations;
drop policy if exists "Strict Access: Own Activations" on activations;

create policy "Strict Access: Own Activations"
on activations for select
to authenticated
using ( auth.uid() = created_by ); 

-- 3. Reset RLS on monitored_entities
alter table monitored_entities enable row level security;
drop policy if exists "Enable read access for authenticated users" on monitored_entities;
drop policy if exists "Strict Access: Own Watchlist" on monitored_entities;

create policy "Strict Access: Own Watchlist"
on monitored_entities for select
to authenticated
using ( auth.uid() = user_id );
