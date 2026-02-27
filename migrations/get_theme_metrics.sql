-- Create RPC function to get metrics for a specific THEME
-- Returns: 24h count and Spike boolean based on thresholds
create or replace function get_theme_metrics(theme_text text)
returns json as $$
declare
  count_24h integer;
  count_prev_24h integer;
  spike_threshold numeric;
  is_spike boolean;
  growth_percent numeric;
begin
  -- 1. Get Spike Threshold from parameters (default to 200 if missing)
  select (value::text)::numeric 
  into spike_threshold 
  from crisis_parameters 
  where parameter_key = 'spike_threshold_percent';
  
  if spike_threshold is null then
    spike_threshold := 200;
  end if;

  -- 2. Calculate mentions in last 24h for this theme
  select count(*)
  into count_24h
  from intelligence_feed
  where theme = theme_text
    and created_at >= (now() - interval '24 hours');

  -- 3. Calculate mentions in the previous 24h (24h-48h window) for comparison
  select count(*)
  into count_prev_24h
  from intelligence_feed
  where theme = theme_text
    and created_at >= (now() - interval '48 hours')
    and created_at < (now() - interval '24 hours');

  -- 4. Calculate Growth
  if count_prev_24h = 0 then
    if count_24h > 5 then -- Minimum volume to consider spike from zero
        growth_percent := 999; -- Infinite growth
    else
        growth_percent := 0;
    end if;
  else
    growth_percent := ((count_24h - count_prev_24h)::numeric / count_prev_24h::numeric) * 100;
  end if;

  -- 5. Determine if it's a spike
  is_spike := growth_percent >= spike_threshold;

  return json_build_object(
    'count_24h', count_24h,
    'growth_percent', growth_percent,
    'is_spike', is_spike
  );
end;
$$ language plpgsql security definer;
