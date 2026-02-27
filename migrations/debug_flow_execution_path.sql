-- Verify publish node is being executed in flow runs

-- 1. Get latest execution and check which nodes were processed
SELECT 
    id as execution_id,
    flow_id,
    status,
    started_at,
    completed_at,
    current_node_id,
    jsonb_array_length(execution_log) as total_nodes_executed,
    execution_log
FROM flow_executions
ORDER BY started_at DESC
LIMIT 1;

-- 2. Extract just the node IDs and types from execution log
SELECT 
    id as execution_id,
    jsonb_array_elements(execution_log)->>'nodeId' as node_id,
    jsonb_array_elements(execution_log)->>'nodeType' as node_type,
    jsonb_array_elements(execution_log)->>'status' as status
FROM flow_executions
ORDER BY started_at DESC
LIMIT 1;

-- 3. Check the flow structure to see if publish node is connected
SELECT 
    f.id as flow_id,
    f.name as flow_name,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'id', node->>'id',
            'type', node->>'type',
            'label', node->'data'->>'label'
        ))
        FROM jsonb_array_elements(f.nodes) as node
    ) as all_nodes,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'source', edge->>'source',
            'target', edge->>'target'
        ))
        FROM jsonb_array_elements(f.edges) as edge
    ) as all_edges
FROM flows f
ORDER BY f.updated_at DESC
LIMIT 1;

-- 4. Check specifically if there's an edge TO the publish node
SELECT 
    f.id as flow_id,
    f.name,
    EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(f.edges) as edge
        WHERE edge->>'target' IN (
            SELECT node->>'id' 
            FROM jsonb_array_elements(f.nodes) as node 
            WHERE node->>'type' = 'publish'
        )
    ) as publish_node_is_connected
FROM flows f
ORDER BY f.updated_at DESC
LIMIT 1;
