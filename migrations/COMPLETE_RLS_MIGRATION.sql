-- ============================================
-- MIGRATION BUNDLE: User Context Isolation
-- Execute this file in Supabase SQL Editor
-- ============================================

-- STEP 1: Add user_id/created_by columns
-- ============================================

-- 1. Create activation_users junction table for sharing
CREATE TABLE IF NOT EXISTS activation_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activation_id UUID NOT NULL REFERENCES activations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activation_users_activation ON activation_users(activation_id);
CREATE INDEX IF NOT EXISTS idx_activation_users_user ON activation_users(user_id);

-- 2. Add created_by to activations
ALTER TABLE activations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

UPDATE activations 
SET created_by = (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT id FROM profiles WHERE role = 'admin')
    LIMIT 1
)
WHERE created_by IS NULL;

UPDATE activations 
SET created_by = (SELECT id FROM auth.users LIMIT 1)
WHERE created_by IS NULL;

ALTER TABLE activations ALTER COLUMN created_by SET NOT NULL;

-- 3. Add user_id to flows
ALTER TABLE flows ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

UPDATE flows 
SET user_id = (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT id FROM profiles WHERE role = 'admin')
    LIMIT 1
)
WHERE user_id IS NULL;

UPDATE flows 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE flows ALTER COLUMN user_id SET NOT NULL;

-- 4. Add user_id to demands
ALTER TABLE demands ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

UPDATE demands 
SET user_id = (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT id FROM profiles WHERE role = 'admin')
    LIMIT 1
)
WHERE user_id IS NULL;

UPDATE demands 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE demands ALTER COLUMN user_id SET NOT NULL;

-- 5. Add user_id to crisis_events
ALTER TABLE crisis_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

UPDATE crisis_events 
SET user_id = (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT id FROM profiles WHERE role = 'admin')
    LIMIT 1
)
WHERE user_id IS NULL;

-- 6. Add user_id to flow_schedules
ALTER TABLE flow_schedules ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

UPDATE flow_schedules 
SET user_id = (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT id FROM profiles WHERE role = 'admin')
    LIMIT 1
)
WHERE user_id IS NULL;

UPDATE flow_schedules 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE flow_schedules ALTER COLUMN user_id SET NOT NULL;

-- 7. Add keywords to intelligence_feed
ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activations_created_by ON activations(created_by);
CREATE INDEX IF NOT EXISTS idx_flows_user_id ON flows(user_id);
CREATE INDEX IF NOT EXISTS idx_demands_user_id ON demands(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_events_user_id ON crisis_events(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_schedules_user_id ON flow_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_feed_keywords ON intelligence_feed USING GIN(keywords);


-- STEP 2: Enable RLS Policies
-- ============================================

-- 1. ACTIVATIONS
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_activations" ON activations;
DROP POLICY IF EXISTS "user_own_activations" ON activations;

CREATE POLICY "admin_all_activations" ON activations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

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

CREATE POLICY "admin_all_activation_users" ON activation_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "users_see_own_shares" ON activation_users
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
