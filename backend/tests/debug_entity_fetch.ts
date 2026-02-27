
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';

import { supabase } from '../src/config/supabase';

async function debugFetch() {
    const userId = '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523';
    console.log(`Debugging fetch for user: ${userId}`);

    // Fetch using Service Role (via supabase config) which bypasses RLS if configured that way, 
    // BUT 'supabase' exported from config might be using Anon key or Service key depending on how it's initialized.
    // Let's check the config/supabase.ts file content in a moment.

    // Attempt 1: Standard Select
    const { data, error } = await supabase
        .from('monitored_entities')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error("Error fetching entities:", error);
    } else {
        console.log(`Found ${data.length} entities:`, data);
    }
}

debugFetch();
