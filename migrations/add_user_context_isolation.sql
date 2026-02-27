-- Migration: Add User Context Isolation
-- This migration adds user_id/created_by columns to enable per-user data isolation

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

-- Set existing activations to first admin user (or first user if no admin)
UPDATE activations 
SET created_by = (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT id FROM profiles WHERE role = 'admin')
    LIMIT 1
)
WHERE created_by IS NULL;

-- If no admin, use first user
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

-- 5. Add user_id to crisis_events (nullable, as some may be auto-generated)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activations_created_by ON activations(created_by);
CREATE INDEX IF NOT EXISTS idx_flows_user_id ON flows(user_id);
CREATE INDEX IF NOT EXISTS idx_demands_user_id ON demands(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_events_user_id ON crisis_events(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_schedules_user_id ON flow_schedules(user_id);
