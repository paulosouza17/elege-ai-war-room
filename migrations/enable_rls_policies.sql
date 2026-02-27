-- Migration: Enable Row Level Security Policies for User Context Isolation

-- 1. ACTIVATIONS
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "admin_all_activations" ON activations;
DROP POLICY IF EXISTS "user_own_activations" ON activations;

-- Admin sees everything
CREATE POLICY "admin_all_activations" ON activations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Users see their own activations OR shared activations
CREATE POLICY "user_own_activations" ON activations
    FOR ALL USING (
        created_by = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM activation_users 
            WHERE activation_users.activation_id = activations.id 
            AND activation_users.user_id = auth.uid()
        )
    );

-- 2. FLOWS
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_flows" ON flows;
DROP POLICY IF EXISTS "user_own_flows" ON flows;

CREATE POLICY "admin_all_flows" ON flows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "user_own_flows" ON flows
    FOR ALL USING (user_id = auth.uid());

-- 3. DEMANDS
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_demands" ON demands;
DROP POLICY IF EXISTS "user_activation_demands" ON demands;

CREATE POLICY "admin_all_demands" ON demands
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Users see demands from activations they have access to
CREATE POLICY "user_activation_demands" ON demands
    FOR ALL USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM activations a
            LEFT JOIN activation_users au ON a.id = au.activation_id
            WHERE demands.activation_id = a.id
            AND (a.created_by = auth.uid() OR au.user_id = auth.uid())
        )
    );

-- 4. FLOW_EXECUTIONS
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_executions" ON flow_executions;
DROP POLICY IF EXISTS "user_own_executions" ON flow_executions;

CREATE POLICY "admin_all_executions" ON flow_executions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "user_own_executions" ON flow_executions
    FOR ALL USING (user_id = auth.uid());

-- 5. INTELLIGENCE_FEED
ALTER TABLE intelligence_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_feed" ON intelligence_feed;
DROP POLICY IF EXISTS "user_own_feed" ON intelligence_feed;

CREATE POLICY "admin_all_feed" ON intelligence_feed
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Users see feed from their own executions
CREATE POLICY "user_own_feed" ON intelligence_feed
    FOR ALL USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM demands d
            WHERE intelligence_feed.demand_id = d.id
            AND d.user_id = auth.uid()
        )
    );

-- 6. CRISIS_EVENTS
ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_crisis" ON crisis_events;
DROP POLICY IF EXISTS "user_activation_crisis" ON crisis_events;

CREATE POLICY "admin_all_crisis" ON crisis_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Users see crisis events from activations they have access to
CREATE POLICY "user_activation_crisis" ON crisis_events
    FOR ALL USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM activations a
            LEFT JOIN activation_users au ON a.id = au.activation_id
            WHERE crisis_events.activation_id = a.id
            AND (a.created_by = auth.uid() OR au.user_id = auth.uid())
        )
    );

-- 7. FLOW_SCHEDULES
ALTER TABLE flow_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_schedules" ON flow_schedules;
DROP POLICY IF EXISTS "user_own_schedules" ON flow_schedules;

CREATE POLICY "admin_all_schedules" ON flow_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "user_own_schedules" ON flow_schedules
    FOR ALL USING (user_id = auth.uid());

-- 8. ACTIVATION_USERS (sharing table)
ALTER TABLE activation_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_activation_users" ON activation_users;
DROP POLICY IF EXISTS "users_see_own_shares" ON activation_users;

-- Admin can manage all shares
CREATE POLICY "admin_all_activation_users" ON activation_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Users can see shares for activations they own OR shares where they are the shared user
CREATE POLICY "users_see_own_shares" ON activation_users
    FOR SELECT USING (
        user_id = auth.uid()
    );
