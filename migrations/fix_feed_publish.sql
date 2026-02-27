-- Quick fix: Check and add activation_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'intelligence_feed' 
        AND column_name = 'activation_id'
    ) THEN
        ALTER TABLE intelligence_feed ADD COLUMN activation_id UUID REFERENCES activations(id);
        RAISE NOTICE 'Added activation_id column';
    ELSE
        RAISE NOTICE 'activation_id column already exists';
    END IF;
END $$;

-- Temporarily disable RLS to test
ALTER TABLE intelligence_feed DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
-- ALTER TABLE intelligence_feed ENABLE ROW LEVEL SECURITY;
