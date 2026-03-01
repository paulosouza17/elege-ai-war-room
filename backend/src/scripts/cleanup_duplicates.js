/**
 * Cleanup script: removes duplicate intelligence_feed items.
 * 
 * Duplicates are identified by:
 * 1. Same elege_post_id within the same activation_id (keeps the oldest)
 * 2. Same title within the same activation_id (keeps the oldest)
 * 
 * Run: node -r dotenv/config src/scripts/cleanup_duplicates.js
 */
require('dotenv').config();
const sb = require('@supabase/supabase-js');

const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    console.log('\n🔍 Scanning for duplicate feed items...\n');

    // 1. Fetch all feed items with their elege_post_id and title
    const { data: items, error } = await supabase
        .from('intelligence_feed')
        .select('id, title, activation_id, created_at, source, source_type, classification_metadata')
        .order('created_at', { ascending: true }); // oldest first → keep oldest

    if (error) { console.error('DB error:', error); return; }
    if (!items || items.length === 0) { console.log('No items found.'); return; }

    console.log(`📊 Total items in feed: ${items.length}\n`);

    const idsToDelete = new Set();
    const seen = {};  // key → first item id

    // Pass 1: Dedup by elege_post_id + activation_id
    let postIdDupes = 0;
    for (const item of items) {
        const postId = item.classification_metadata?.elege_post_id;
        if (!postId) continue;

        const key = `postid:${item.activation_id}:${postId}`;
        if (seen[key]) {
            idsToDelete.add(item.id);
            postIdDupes++;
        } else {
            seen[key] = item.id;
        }
    }

    // Pass 2: Dedup by title + activation_id (for items not already flagged)
    let titleDupes = 0;
    const seenTitles = {};
    for (const item of items) {
        if (idsToDelete.has(item.id)) continue;

        const title = (item.title || '').trim();
        if (!title || title === 'Sem título') continue;

        const key = `title:${item.activation_id}:${title}`;
        if (seenTitles[key]) {
            idsToDelete.add(item.id);
            titleDupes++;
        } else {
            seenTitles[key] = item.id;
        }
    }

    console.log(`🔴 Duplicates by elege_post_id: ${postIdDupes}`);
    console.log(`🟡 Duplicates by title: ${titleDupes}`);
    console.log(`📋 Total duplicates to remove: ${idsToDelete.size}\n`);

    if (idsToDelete.size === 0) {
        console.log('✅ No duplicates found! Feed is clean.');
        return;
    }

    // Delete in batches of 50
    const deleteIds = Array.from(idsToDelete);
    const BATCH = 50;
    let deleted = 0;

    for (let i = 0; i < deleteIds.length; i += BATCH) {
        const batch = deleteIds.slice(i, i + BATCH);
        const { error: delError } = await supabase
            .from('intelligence_feed')
            .delete()
            .in('id', batch);

        if (delError) {
            console.error(`  ❌ Batch delete error:`, delError.message);
        } else {
            deleted += batch.length;
            console.log(`  🗑 Deleted batch ${Math.floor(i / BATCH) + 1}: ${batch.length} items`);
        }
    }

    console.log(`\n✅ Cleanup complete: ${deleted} duplicates removed, ${items.length - deleted} items remain.`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
