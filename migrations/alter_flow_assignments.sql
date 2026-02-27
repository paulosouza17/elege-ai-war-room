-- Add activation_id column and make user_id nullable
-- Allows assigning flows to activations (not just users)

-- 1. Make user_id nullable
ALTER TABLE public.flow_assignments ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add activation_id column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flow_assignments' AND column_name='activation_id') THEN
        ALTER TABLE public.flow_assignments ADD COLUMN activation_id UUID REFERENCES public.activations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Add constraint: at least one of user_id or activation_id must be set
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flow_assignments_target_check') THEN
        ALTER TABLE public.flow_assignments ADD CONSTRAINT flow_assignments_target_check
            CHECK (user_id IS NOT NULL OR activation_id IS NOT NULL);
    END IF;
END $$;

-- 4. Prevent duplicate assignments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flow_assignments_unique_user') THEN
        CREATE UNIQUE INDEX idx_flow_assignments_unique_user ON public.flow_assignments (flow_id, user_id) WHERE user_id IS NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flow_assignments_unique_activation') THEN
        CREATE UNIQUE INDEX idx_flow_assignments_unique_activation ON public.flow_assignments (flow_id, activation_id) WHERE activation_id IS NOT NULL;
    END IF;
END $$;
