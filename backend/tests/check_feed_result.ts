
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';

import { supabase } from '../src/config/supabase';

async function checkFeed() {
    console.log("Checking latest intelligence feed item...");
    const { data, error } = await supabase
        .from('intelligence_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error("Error fetching feed:", error);
        return;
    }

    console.log("Feed Item Source:", data.source);
    console.log("Feed Item Title:", data.title);
    console.log("Metadata:", JSON.stringify(data.classification_metadata, null, 2));
}

checkFeed();
