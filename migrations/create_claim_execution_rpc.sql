-- Atomic Claim: Only ONE worker can claim an execution at a time.
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions.

create or replace function claim_pending_execution()
returns setof flow_executions
language plpgsql
security definer
as $$
begin
  return query
  update flow_executions
  set status = 'running', started_at = now()
  where id = (
    select id from flow_executions
    where status = 'pending'
    order by created_at asc
    limit 1
    for update skip locked
  )
  returning *;
end;
$$;

grant execute on function claim_pending_execution() to service_role;
grant execute on function claim_pending_execution() to authenticated;
