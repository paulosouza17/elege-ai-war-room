require('dotenv').config();
const sb = require('@supabase/supabase-js');
const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fetchAll() {
    const PAGE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data } = await supabase
            .from('intelligence_feed')
            .select('id, title, activation_id, created_at')
            .order('created_at', { ascending: true })
            .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
    }
    return all;
}

async function main() {
    console.log('Fetching all items (paginated)...');
    const items = await fetchAll();
    console.log('Total items:', items.length);

    const seen = {};
    const dupeIds = [];

    for (const item of items) {
        const title = (item.title || '').trim();
        if (!title || title === 'Sem título') continue;
        const key = item.activation_id + ':' + title;
        if (seen[key]) { dupeIds.push(item.id); }
        else { seen[key] = item.id; }
    }

    console.log('Duplicates found:', dupeIds.length);
    if (dupeIds.length === 0) { console.log('Clean!'); return; }

    let cleaned = 0;
    for (const id of dupeIds) {
        await supabase.from('crisis_events').update({ source_feed_id: null }).eq('source_feed_id', id);
        const { error } = await supabase.from('intelligence_feed').delete().eq('id', id);
        if (error) console.log('Failed:', id.substring(0, 8), error.message);
        else cleaned++;
    }
    console.log('Cleaned', cleaned, '/', dupeIds.length);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
