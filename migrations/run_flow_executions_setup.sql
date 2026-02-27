-- Quick setup: Create flow_executions table if missing
-- This is a condensed version for quick deployment

CREATE TABLE IF NOT EXISTS flow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    demand_id UUID REFERENCES demands(id),
    activation_id UUID,
    
    status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    current_node_id TEXT,
    nodes_executed TEXT[] DEFAULT '{}',
    execution_log JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;

-- Simple policy: Allow authenticated users to view all
DROP POLICY IF EXISTS flow_executions_select_policy ON flow_executions;
CREATE POLICY flow_executions_select_policy ON flow_executions
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert
DROP POLICY IF EXISTS flow_executions_insert_policy ON flow_executions;
CREATE POLICY flow_executions_insert_policy ON flow_executions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update
DROP POLICY IF EXISTS flow_executions_update_policy ON flow_executions;
CREATE POLICY flow_executions_update_policy ON flow_executions
    FOR UPDATE
    TO authenticated
    USING (true);

-- Service role full access
DROP POLICY IF EXISTS flow_executions_service_policy ON flow_executions;
CREATE POLICY flow_executions_service_policy ON flow_executions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_status ON flow_executions(status);
CREATE INDEX IF NOT EXISTS idx_flow_executions_started_at ON flow_executions(started_at DESC);

-- Create helper functions
CREATE OR REPLACE FUNCTION append_execution_log(p_execution_id UUID, p_log_entry JSONB)
RETURNS VOID AS $$
BEGIN
    UPDATE flow_executions
    SET execution_log = execution_log || p_log_entry
    WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_execution_status(
    p_execution_id UUID,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE flow_executions
    SET 
        status = p_status,
        completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
        error_message = COALESCE(p_error_message, error_message)
    WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_current_node(p_execution_id UUID, p_node_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE flow_executions
    SET current_node_id = p_node_id
    WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_node_completed(p_execution_id UUID, p_node_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE flow_executions
    SET nodes_executed = array_append(nodes_executed, p_node_id)
    WHERE id = p_execution_id
    AND NOT (p_node_id = ANY(nodes_executed));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION append_execution_log TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_execution_status TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION set_current_node TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_node_completed TO authenticated, service_role;
