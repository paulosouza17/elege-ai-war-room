
-- Allow Service Role to access monitored_entities ignoring RLS
create policy "Service Role Full Access"
  on monitored_entities
  for all
  to service_role
  using (true)
  with check (true);
