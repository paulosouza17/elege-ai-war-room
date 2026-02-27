-- RPC to generate a crisis plan using AI
-- This wraps the logic that was previously in the Express route /api/v1/crisis/plan
-- It calls pg_net to invoke supabase edge function, but for MVP we store request and let worker handle it

-- For now, this function just stores the request context and returns it
-- The actual AI call will happen from the backend worker or the existing Express server
-- This is a placeholder that ensures the frontend doesn't need localhost:3000

create or replace function generate_crisis_plan(
  p_crisis_id uuid,
  p_user_feedback text default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_crisis record;
  v_plan json;
begin
  -- Fetch crisis
  select * into v_crisis from crisis_packets where id = p_crisis_id;
  
  if not found then
    return json_build_object('success', false, 'message', 'Crisis not found');
  end if;

  -- If plan already exists and no refinement, return it
  if v_crisis.plan is not null and p_user_feedback is null then
    return json_build_object('success', true, 'plan', v_crisis.plan);
  end if;

  -- Store feedback for later use
  if p_user_feedback is not null then
    update crisis_packets 
    set user_feedback = p_user_feedback 
    where id = p_crisis_id;
  end if;

  -- Return signal that plan needs generation (will be handled by backend)
  return json_build_object(
    'success', true, 
    'pending', true,
    'message', 'Plan generation requested'
  );
end;
$$;

grant execute on function generate_crisis_plan(uuid, text) to authenticated;
grant execute on function generate_crisis_plan(uuid, text) to service_role;
