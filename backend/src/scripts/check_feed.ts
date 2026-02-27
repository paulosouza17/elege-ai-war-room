import { supabase } from '../config/supabase';

async function checkFeed() {
    const { data, error } = await supabase
        .from('intelligence_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching feed:", error);
    } else {
        console.log("Latest 5 feed items:", JSON.stringify(data, null, 2));
    }
}

checkFeed();
