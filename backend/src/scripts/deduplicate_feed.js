/**
 * deduplicate_feed.js
 *
 * Universal feed deduplication script.
 * Scans the entire `intelligence_feed` table and removes duplicates using
 * three layers (oldest item wins):
 *   Layer 0: elege_post_id + activation_id
 *   Layer 1: URL + activation_id  (ignores elegeai-mention-* URLs)
 *   Layer 2: title + activation_id (ignores "Sem título" / empty)
 *
 * Usage:
 *   node backend/src/scripts/deduplicate_feed.js            # delete duplicates
 *   node backend/src/scripts/deduplicate_feed.js --dry-run   # audit only
 */

require('dotenv').config();
const sb = require('@supabase/supabase-js');

const supabase = sb.createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

async function fetchAllFeedItems() {
    let allItems = [];
    let page = 0;

    while (true) {
        const { data, error } = await supabase
            .from('intelligence_feed')
            .select('id, title, url, activation_id, classification_metadata, created_at')
            .order('created_at', { ascending: true })
            .range(page * 1000, (page + 1) * 1000 - 1);

        if (error) {
            console.error('❌ Fetch error:', error.message);
            break;
        }
        if (!data || data.length === 0) break;

        allItems = allItems.concat(data);
        console.log(`  📄 Page ${page + 1}: ${data.length} items (total: ${allItems.length})`);
        page++;
        if (data.length < 1000) break;
    }

    return allItems;
}

async function main() {
    console.log(`\n🔍 Feed Deduplication Scanner${DRY_RUN ? ' (DRY RUN — nenhuma exclusão será feita)' : ''}\n`);

    const allItems = await fetchAllFeedItems();
    console.log(`\n📊 Total de itens no feed: ${allItems.length}\n`);

    if (allItems.length === 0) {
        console.log('✅ Feed vazio, nada a fazer.');
        return;
    }

    const idsToDelete = new Set();

    // ── Layer 0: elege_post_id + activation_id ──
    const seenPostIds = {};
    let layer0 = 0;

    for (const item of allItems) {
        const postId = item.classification_metadata?.elege_post_id;
        if (!postId) continue;
        const key = `${item.activation_id}::${postId}`;
        if (seenPostIds[key]) {
            idsToDelete.add(item.id);
            layer0++;
        } else {
            seenPostIds[key] = item.id;
        }
    }

    // ── Layer 1: URL + activation_id ──
    const seenUrls = {};
    let layer1 = 0;

    for (const item of allItems) {
        if (idsToDelete.has(item.id)) continue;
        const url = (item.url || '').trim();
        if (!url || url.length < 5 || url.startsWith('elegeai-mention-')) continue;
        const key = `${item.activation_id}::${url}`;
        if (seenUrls[key]) {
            idsToDelete.add(item.id);
            layer1++;
        } else {
            seenUrls[key] = item.id;
        }
    }

    // ── Layer 2: title + activation_id ──
    const seenTitles = {};
    let layer2 = 0;

    for (const item of allItems) {
        if (idsToDelete.has(item.id)) continue;
        const title = (item.title || '').trim().toLowerCase();
        if (!title || title === 'sem título' || title === 'sem titulo') continue;
        const key = `${item.activation_id}::${title}`;
        if (seenTitles[key]) {
            idsToDelete.add(item.id);
            layer2++;
        } else {
            seenTitles[key] = item.id;
        }
    }

    // ── Report ──
    console.log('═══════════════════════════════════════');
    console.log(`  🔴 Duplicatas por elege_post_id: ${layer0}`);
    console.log(`  🟡 Duplicatas por URL:           ${layer1}`);
    console.log(`  🟠 Duplicatas por título:        ${layer2}`);
    console.log(`  ───────────────────────────────────`);
    console.log(`  📋 Total de duplicatas:          ${idsToDelete.size}`);
    console.log(`  ✅ Itens únicos restantes:       ${allItems.length - idsToDelete.size}`);
    console.log('═══════════════════════════════════════\n');

    if (idsToDelete.size === 0) {
        console.log('✅ Nenhuma duplicata encontrada! Feed limpo.');
        return;
    }

    if (DRY_RUN) {
        console.log('🔒 Modo DRY RUN — nenhum registro foi removido.');
        console.log('   Para executar a limpeza, rode sem --dry-run.\n');
        return;
    }

    // ── Delete in batches ──
    const deleteIds = Array.from(idsToDelete);
    let deleted = 0;

    for (let i = 0; i < deleteIds.length; i += 100) {
        const batch = deleteIds.slice(i, i + 100);
        const { error } = await supabase
            .from('intelligence_feed')
            .delete()
            .in('id', batch);

        if (error) {
            console.error(`  ❌ Erro ao deletar batch ${Math.floor(i / 100) + 1}:`, error.message);
        } else {
            deleted += batch.length;
            console.log(`  🗑 Batch ${Math.floor(i / 100) + 1}: ${batch.length} removidos (${deleted}/${idsToDelete.size})`);
        }
    }

    console.log(`\n✅ Limpeza completa: ${deleted} duplicatas removidas, ${allItems.length - deleted} itens restantes.\n`);
}

main()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
