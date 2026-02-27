
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';

import { supabase } from '../src/config/supabase';

async function checkStructure() {
    console.log("Fetching sample feed items to check metadata structure...");

    const targetUserId = '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523';

    // Fetch items that HAVE metadata
    const { data, error } = await supabase
        .from('intelligence_feed')
        .select('id, classification_metadata')
        .eq('user_id', targetUserId)
        .not('classification_metadata', 'is', null) // Correct syntax for null check
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Found items:", data.length);
    data.forEach((item, i) => {
        console.log(`\nItem ${i + 1}:`);
        console.log(JSON.stringify(item.classification_metadata, null, 2));
    });
}

checkStructure();
