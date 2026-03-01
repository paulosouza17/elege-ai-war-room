require('dotenv').config();
const sb = require('@supabase/supabase-js');
const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    console.log('\\n🔍 Full-scan duplicate cleanup...\\n');

    // Fetch ALL items using pagination
    let allItems = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('intelligence_feed')
            .select('id, title, activation_id, classification_metadata')
            .order('created_at', { ascending: true })
            .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) { console.error('Fetch error:', error); break; }
        if (!data || data.length === 0) break;
        allItems = allItems.concat(data);
        console.log(`  Fetched page ${page + 1}: ${data.length} items (total: ${allItems.length})`);
        page++;
        if (data.length < 1000) break;
    }
    console.log(`\\n📊 Total items fetched: ${allItems.length}\\n`);

    const idsToDelete = new Set();
    const seen = {};

    // Pass 1: Dedup by elege_post_id + activation_id
    let postIdDupes = 0;
    for (const item of allItems) {
        const postId = item.classification_metadata?.elege_post_id;
        if (!postId) continue;
        const key = `postid:${item.activation_id}:${postId}`;
        if (seen[key]) { idsToDelete.add(item.id); postIdDupes++; }
        else seen[key] = item.id;
    }

    // Pass 2: Dedup by title + activation_id
    let titleDupes = 0;
    const seenTitles = {};
    for (const item of allItems) {
        if (idsToDelete.has(item.id)) continue;
        const t = (item.title || '').trim();
        if (!t || t === 'Sem título' || t === 'Sem titulo') continue;
        const key = `title:${item.activation_id}:${t}`;
        if (seenTitles[key]) { idsToDelete.add(item.id); titleDupes++; }
        else seenTitles[key] = item.id;
    }

    console.log(`🔴 Duplicates by elege_post_id: ${postIdDupes}`);
    console.log(`🟡 Duplicates by title: ${titleDupes}`);
    console.log(`📋 Total duplicates to remove: ${idsToDelete.size}\\n`);

    if (idsToDelete.size === 0) {
        console.log('✅ No duplicates found! Feed is clean.');
        return;
    }

    // Delete in batches of 100
    const deleteIds = Array.from(idsToDelete);
    let deleted = 0;
    for (let i = 0; i < deleteIds.length; i += 100) {
        const batch = deleteIds.slice(i, i + 100);
        const { error } = await supabase.from('intelligence_feed').delete().in('id', batch);
        if (error) console.error('  ❌ Delete error:', error.message);
        else { deleted += batch.length; console.log(`  🗑 Deleted batch ${Math.floor(i / 100) + 1}: ${batch.length} items`); }
    }

    console.log(`\\n✅ Full cleanup complete: ${deleted} duplicates removed, ${allItems.length - deleted} items remain.`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
