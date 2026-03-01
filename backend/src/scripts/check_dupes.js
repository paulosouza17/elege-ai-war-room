require('dotenv').config();
const sb = require('@supabase/supabase-js');
const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    const { count } = await supabase.from('intelligence_feed').select('id', { count: 'exact' });
    console.log('Total items:', count);

    const { data: items } = await supabase.from('intelligence_feed').select('id, title, activation_id, source_type').order('created_at', { ascending: true });

    // Title dupes
    const seen = {};
    let titleDupes = 0;
    for (const i of items || []) {
        const t = (i.title || '').trim();
        if (!t || t === 'Sem titulo') continue;
        const k = i.activation_id + ':' + t;
        if (seen[k]) titleDupes++;
        else seen[k] = true;
    }
    console.log('Remaining title dupes:', titleDupes);

    // Source type distribution
    const types = {};
    for (const i of items || []) { types[i.source_type] = (types[i.source_type] || 0) + 1; }
    console.log('Source types:', JSON.stringify(types, null, 2));
})();
