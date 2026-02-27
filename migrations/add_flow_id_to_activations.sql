-- Add flow_id column to activations table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activations' 
        AND column_name = 'flow_id'
    ) THEN
        ALTER TABLE public.activations 
        ADD COLUMN flow_id UUID REFERENCES public.flows(id);
        
        RAISE NOTICE 'Column flow_id added to activations table';
    ELSE
        RAISE NOTICE 'Column flow_id already exists in activations table';
    END IF;
END $$;
