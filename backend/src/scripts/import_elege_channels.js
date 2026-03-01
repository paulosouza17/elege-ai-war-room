/**
 * Import Elege API channels into Supabase channel_activations.
 * 
 * Fetches all channels from the Elege API (TV, Radio, YouTube, Website, Instagram),
 * and links them to all active activations in channel_activations table.
 * Skips channels that are already linked.
 * 
 * Usage: cd backend && node src/scripts/import_elege_channels.js
 */
require('dotenv').config();
const axios = require('axios');
const sb = require('@supabase/supabase-js');

const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const baseUrl = (process.env.ELEGE_BASE_URL || 'https://api.elege.ai') + '/api';
const token = process.env.ELEGEAI_API_TOKEN;

async function fetchAllChannels() {
    const allChannels = [];
    let page = 1;
    while (true) {
        try {
            const r = await axios.get(`${baseUrl}/channels?page=${page}&limit=100`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                timeout: 15000,
            });
            const channels = r.data.channels || [];
            const meta = r.data.meta || {};
            allChannels.push(...channels);
            console.log(`  Fetched page ${page}: ${channels.length} channels (total so far: ${allChannels.length}/${meta.total || '?'})`);
            if (channels.length < 100 || page >= (meta.total_pages || 999)) break;
            page++;
        } catch (e) {
            console.error(`  Error fetching page ${page}:`, e.response ? e.response.status : e.message);
            break;
        }
    }
    return allChannels;
}

async function main() {
    console.log('\n📡 Importing Elege channels into Supabase...\n');

    if (!token) {
        console.error('❌ ELEGEAI_API_TOKEN not set in .env');
        return;
    }

    // 1. Fetch all channels from Elege API
    console.log('1️⃣  Fetching channels from Elege API...');
    const channels = await fetchAllChannels();
    console.log(`   Total: ${channels.length} channels\n`);

    // Group by kind
    const byKind = {};
    channels.forEach(c => { byKind[c.kind] = (byKind[c.kind] || 0) + 1; });
    console.log('   By kind:', JSON.stringify(byKind));

    // 2. Get active activations
    console.log('\n2️⃣  Fetching active activations...');
    const { data: activations, error: actErr } = await supabase
        .from('activations')
        .select('id, name')
        .eq('status', 'active');
    if (actErr) { console.error('❌ Error:', actErr.message); return; }
    console.log(`   Found ${activations.length} active activations:`, activations.map(a => a.name).join(', '));

    // 3. Get existing channel_activations to avoid duplicates
    console.log('\n3️⃣  Checking existing channel links...');
    const { data: existing } = await supabase
        .from('channel_activations')
        .select('elege_channel_id, activation_id');
    const existingSet = new Set((existing || []).map(e => `${e.activation_id}:${e.elege_channel_id}`));
    console.log(`   ${existingSet.size} existing links found`);

    // 4. Insert new channel_activations
    console.log('\n4️⃣  Inserting new channel links...');
    let inserted = 0;
    let skipped = 0;

    for (const activation of activations) {
        const toInsert = [];
        for (const channel of channels) {
            const key = `${activation.id}:${channel.id}`;
            if (existingSet.has(key)) {
                skipped++;
                continue;
            }
            toInsert.push({
                activation_id: activation.id,
                elege_channel_id: channel.id,
                channel_kind: channel.kind,
                channel_title: channel.title,
            });
        }

        if (toInsert.length > 0) {
            // Insert in batches of 50
            for (let i = 0; i < toInsert.length; i += 50) {
                const batch = toInsert.slice(i, i + 50);
                const { error: insErr } = await supabase.from('channel_activations').insert(batch);
                if (insErr) {
                    console.error(`   ❌ Error inserting batch for "${activation.name}":`, insErr.message);
                } else {
                    inserted += batch.length;
                    console.log(`   ✅ ${activation.name}: inserted ${batch.length} channels (batch ${Math.floor(i / 50) + 1})`);
                }
            }
        }
    }

    console.log(`\n✅ Done! ${inserted} new links created, ${skipped} already existed.\n`);

    // 5. Summary
    const { data: finalCount } = await supabase
        .from('channel_activations')
        .select('channel_kind');
    const finalByKind = {};
    (finalCount || []).forEach(c => { finalByKind[c.channel_kind] = (finalByKind[c.channel_kind] || 0) + 1; });
    console.log('📊 Final channel_activations by kind:', JSON.stringify(finalByKind, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
