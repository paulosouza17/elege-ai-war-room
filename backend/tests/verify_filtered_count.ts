
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';

import { supabase } from '../src/config/supabase';

async function verifyFilteredCount() {
    const targetUserId = '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523';
    console.log(`Verifying counts for user: ${targetUserId}`);

    // 1. Total Raw Feed Items
    const { count: totalCount } = await supabase
        .from('intelligence_feed')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

    console.log(`[Total Feed Items]: ${totalCount}`);

    // 2. Filtered Items (Correct Logic simulation)
    // We fetch all and filter in memory to be 100% sure of the count, 
    // since PostgREST JSON filtering syntax can be tricky to replicate perfectly in a quick script.

    const { data: allItems } = await supabase
        .from('intelligence_feed')
        .select('id, classification_metadata')
        .eq('user_id', targetUserId);

    if (!allItems) {
        console.log("No items found.");
        return;
    }

    const validMentions = allItems.filter(item => {
        const meta = item.classification_metadata;
        if (!meta) return false;

        // Check if detected_entities is an array AND has length > 0
        if (Array.isArray(meta.detected_entities) && meta.detected_entities.length > 0) {
            return true;
        }
        return false;
    });

    console.log(`[ITEMS WITH DETECTED ENTITIES]: ${validMentions.length}`);
    console.log("---------------------------------------------------");
    if (validMentions.length !== totalCount) {
        console.log("CONCLUSION: The Dashboard SHOULD show", validMentions.length, ", but is likely showing", totalCount, "due to fallback.");
    } else {
        console.log("CONCLUSION: Counts match (or both 0).");
    }
}

verifyFilteredCount();
