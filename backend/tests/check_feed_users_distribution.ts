
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';

import { supabase } from '../src/config/supabase';

async function checkDistribution() {
    console.log("Checking User ID distribution in 'intelligence_feed'...");

    const { data, error } = await supabase
        .from('intelligence_feed')
        .select('user_id');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const dist: Record<string, number> = {};
    data.forEach(row => {
        dist[row.user_id] = (dist[row.user_id] || 0) + 1;
    });

    console.log("User IDs found in Feed:", dist);
}

checkDistribution();
