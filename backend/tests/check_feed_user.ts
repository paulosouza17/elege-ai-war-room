
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';

import { supabase } from '../src/config/supabase';

async function checkFeedUser() {
    console.log("Checking latest intelligence feed items...");

    // We expect user_id: '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523'
    const targetUserId = '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523';

    const { data, error } = await supabase
        .from('intelligence_feed')
        .select('id, title, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching feed:", error);
        return;
    }

    console.log("Feed Items found:", data.length);
    data.forEach(item => {
        console.log(`- [${item.created_at}] ${item.title} | UserID: ${item.user_id} | Match: ${item.user_id === targetUserId}`);
    });

    // Check count for this user
    const { count, error: countError } = await supabase
        .from('intelligence_feed')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

    if (countError) console.error("Error counting:", countError);
    else console.log(`Total count for user ${targetUserId}: ${count}`);
}

checkFeedUser();
