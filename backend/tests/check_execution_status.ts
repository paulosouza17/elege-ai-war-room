
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';

import { supabase } from '../src/config/supabase';

async function checkExecution() {
    console.log("Checking latest flow execution...");
    const { data, error } = await supabase
        .from('flow_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error("Error fetching execution:", error);
        return;
    }

    console.log("Latest Execution:", JSON.stringify(data, null, 2));
}

checkExecution();
