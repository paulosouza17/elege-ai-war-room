-- Fix ALL foreign key constraints related to flows table
-- This allows flows to be deleted without blocking

-- 1. Fix activations.flow_id constraint
ALTER TABLE public.activations 
DROP CONSTRAINT IF EXISTS activations_flow_id_fkey;

ALTER TABLE public.activations 
ADD CONSTRAINT activations_flow_id_fkey 
FOREIGN KEY (flow_id) 
REFERENCES public.flows(id) 
ON DELETE SET NULL;

-- 2. Fix demands.flow_id constraint
ALTER TABLE public.demands 
DROP CONSTRAINT IF EXISTS demands_flow_id_fkey;

ALTER TABLE public.demands 
ADD CONSTRAINT demands_flow_id_fkey 
FOREIGN KEY (flow_id) 
REFERENCES public.flows(id) 
ON DELETE SET NULL;

-- 3. Fix flow_assignments.flow_id constraint (if exists)
ALTER TABLE public.flow_assignments 
DROP CONSTRAINT IF EXISTS flow_assignments_flow_id_fkey;

ALTER TABLE public.flow_assignments 
ADD CONSTRAINT flow_assignments_flow_id_fkey 
FOREIGN KEY (flow_id) 
REFERENCES public.flows(id) 
ON DELETE CASCADE;  -- Assignments should be deleted with the flow

-- Verify constraints
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confdeltype as on_delete_action
FROM pg_constraint
WHERE confrelid = 'public.flows'::regclass
ORDER BY conrelid::regclass::text;
