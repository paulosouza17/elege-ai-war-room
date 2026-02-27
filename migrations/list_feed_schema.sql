SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('intelligence_feed', 'flows', 'flow_assignments', 'users', 'profiles');
