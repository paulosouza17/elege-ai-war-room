-- ============================================
-- Phase 11: Scheduling & Attribution Schema
-- ============================================

-- 1. Create flow_schedules table
CREATE TABLE IF NOT EXISTS public.flow_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
    cron_expression TEXT NOT NULL, -- e.g. "0 8 * * *"
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add user_id to flow_executions (Attribution)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flow_executions' AND column_name='user_id') THEN
        ALTER TABLE public.flow_executions ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. Add user_id to intelligence_feed (Attribution)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='intelligence_feed' AND column_name='user_id') THEN
        ALTER TABLE public.intelligence_feed ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.flow_schedules ENABLE ROW LEVEL SECURITY;

-- 5. Create Permissive Policies (MVP)
DROP POLICY IF EXISTS "Enable all access for all users" ON public.flow_schedules;
CREATE POLICY "Enable all access for all users" ON public.flow_schedules FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Grant permissions
GRANT ALL ON public.flow_schedules TO anon, authenticated, service_role;
