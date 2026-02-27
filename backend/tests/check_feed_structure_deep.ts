
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';

import { supabase } from '../src/config/supabase';

async function checkStructure() {
    console.log("Searching for items WITH detected_entities...");

    const targetUserId = '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523';

    // Fetch items where metadata contains 'detected_entities'
    // Note: Supabase/PostgREST syntax for JSONB containment is a bit specific.
    // .contains('classification_metadata', { detected_entities: [] }) might work if array is not empty?
    // Or just fetch latest 50 and filter in JS to see if ANY exist.

    const { data, error } = await supabase
        .from('intelligence_feed')
        .select('id, classification_metadata')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error:", error);
        return;
    }

    const itemsWithEntities = data.filter((item: any) =>
        item.classification_metadata &&
        item.classification_metadata.detected_entities &&
        item.classification_metadata.detected_entities.length > 0
    );

    console.log(`Total scanned: ${data.length}`);
    console.log(`Items with 'detected_entities' > 0: ${itemsWithEntities.length}`);

    if (itemsWithEntities.length > 0) {
        console.log("Sample Structure:", JSON.stringify(itemsWithEntities[0].classification_metadata, null, 2));
    }
}

checkStructure();
