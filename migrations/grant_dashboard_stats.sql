
-- Grant execute permission to authenticated users and service role
grant execute on function get_dashboard_stats() to authenticated;
grant execute on function get_dashboard_stats() to service_role;
