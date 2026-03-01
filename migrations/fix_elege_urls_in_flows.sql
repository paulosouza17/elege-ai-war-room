-- Fix hardcoded Elege internal IPs in flow node configurations
-- Replace 10.144.103.1:3001 → app.elege.ai:3001
-- Replace 10.144.103.1:8011 → app.elege.ai:8011 (People Service)

-- Preview what will be changed (run this FIRST to verify)
-- SELECT id, name, 
--     (SELECT count(*) FROM jsonb_array_elements(nodes) n 
--      WHERE n::text LIKE '%10.144.103%') as affected_nodes
-- FROM flows 
-- WHERE nodes::text LIKE '%10.144.103%';

-- Update flow nodes: replace internal IP with domain
UPDATE flows
SET nodes = REPLACE(REPLACE(
    nodes::text,
    'http://10.144.103.1:3001', 'http://app.elege.ai:3001'
), 'http://10.144.103.185:8001', 'http://app.elege.ai:8001')::jsonb,
    updated_at = NOW()
WHERE nodes::text LIKE '%10.144.103%';

-- Also fix any data_sources credentials that might have the old IP
UPDATE data_sources
SET credentials = REPLACE(
    credentials::text,
    'http://10.144.103.1:3001', 'http://app.elege.ai:3001'
)::jsonb,
    updated_at = NOW()
WHERE credentials::text LIKE '%10.144.103%';
