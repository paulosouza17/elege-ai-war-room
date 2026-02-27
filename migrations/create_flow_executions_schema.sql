-- ============================================
-- Flow Execution Tracking Schema
-- ============================================
-- Purpose: Track flow executions in real-time and store historical execution logs
-- Features: Node-level tracking, execution status, outputs, errors, duration

-- 1. Create flow_executions table
CREATE TABLE IF NOT EXISTS flow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    demand_id UUID REFERENCES demands(id),
    activation_id UUID REFERENCES activations(id),
    
    -- Execution metadata
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Node tracking for real-time updates
    current_node_id TEXT, -- ID of node currently being executed
    nodes_executed TEXT[] DEFAULT '{}', -- Array of node IDs already completed
    
    -- Full execution log (node-by-node details)
    execution_log JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ nodeId, nodeType, nodeLabel, status, startedAt, completedAt, output, error, duration }]
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_status ON flow_executions(status);
CREATE INDEX IF NOT EXISTS idx_flow_executions_started_at ON flow_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_executions_demand_id ON flow_executions(demand_id);

-- 3. Create helper function to append execution log entries
CREATE OR REPLACE FUNCTION append_execution_log(
    p_execution_id UUID,
    p_log_entry JSONB
) RETURNS VOID AS $$
BEGIN
    UPDATE flow_executions
    SET 
        execution_log = execution_log || p_log_entry::jsonb,
        updated_at = NOW()
    WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create helper function to update execution status
CREATE OR REPLACE FUNCTION update_execution_status(
    p_execution_id UUID,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE flow_executions
    SET 
        status = p_status,
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE NULL END,
        error_message = p_error_message,
        updated_at = NOW()
    WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Create helper function to set current node
CREATE OR REPLACE FUNCTION set_current_node(
    p_execution_id UUID,
    p_node_id TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE flow_executions
    SET 
        current_node_id = p_node_id,
        updated_at = NOW()
    WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create helper function to mark node as completed
CREATE OR REPLACE FUNCTION mark_node_completed(
    p_execution_id UUID,
    p_node_id TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE flow_executions
    SET 
        nodes_executed = array_append(nodes_executed, p_node_id),
        updated_at = NOW()
    WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_flow_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_flow_executions_updated_at
    BEFORE UPDATE ON flow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_flow_executions_updated_at();

-- 8. Enable Row Level Security (RLS)
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
-- Policy: Authenticated users can view all executions (adjust as needed)
CREATE POLICY flow_executions_select_policy ON flow_executions
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can insert their own executions
CREATE POLICY flow_executions_insert_policy ON flow_executions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Service role can do anything
CREATE POLICY flow_executions_service_policy ON flow_executions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Verification Queries
-- ============================================

-- Check if table was created
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'flow_executions'
) as table_exists;

-- Check all indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'flow_executions';

-- Check all functions
SELECT proname, pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname LIKE '%execution%';

-- Sample query to test structure
SELECT 
    id,
    status,
    current_node_id,
    nodes_executed,
    jsonb_array_length(execution_log) as log_entries,
    started_at,
    completed_at
FROM flow_executions
LIMIT 5;
