
-- 1. Grant RPC Execution Permissions
grant execute on function get_dashboard_stats() to authenticated;
grant execute on function get_dashboard_stats() to service_role;
grant execute on function get_dashboard_stats() to anon; -- In case of public access requirements

-- 2. Fix 'intelligence_feed' RLS
alter table intelligence_feed enable row level security;

-- Remove potentially conflicting policies to start fresh (optional, but safer to add IF NOT EXISTS logic or just new names)
-- Note: 'create policy if not exists' is not standard SQL, so we use 'drop policy if exists'
drop policy if exists "Enable read access for all authenticated users" on intelligence_feed;
drop policy if exists "Enable insert for authenticated users" on intelligence_feed;

-- Allow authenticated users to SEE all feed items (or restrict to own if user_id is present)
create policy "Enable read access for all authenticated users"
on intelligence_feed for select
to authenticated
using (true); 
-- Note: 'using (true)' allows viewing ALL rows. Change to 'using (auth.uid() = user_id)' for privacy.
-- For this War Room app, 'true' ensures the team sees everything properly for now.

-- Allow inserts (already covered, but reinforcing)
create policy "Enable insert for authenticated users"
on intelligence_feed for insert
to authenticated
with check (true);

-- 3. Fix 'monitored_entities' RLS (for Dashboard top entities)
drop policy if exists "Enable read access for authenticated users" on monitored_entities;

create policy "Enable read access for authenticated users"
on monitored_entities for select
to authenticated
using (true); 
-- Again, 'using (true)' ensures the Dashboard can count total entities even if ownership varies.

-- 4. Fix 'activations' RLS
drop policy if exists "Enable read access for authenticated users" on activations;

create policy "Enable read access for authenticated users"
on activations for select
to authenticated
using (true);
