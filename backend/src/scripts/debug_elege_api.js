/**
 * Investigate Elege.AI channel management API endpoints
 */
require('dotenv').config();
const axios = require('axios');

const baseUrl = (process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001') + '/api';
const token = process.env.ELEGEAI_API_TOKEN || '';
const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

async function main() {
    // 1. Get all channels with full details
    console.log('=== GET /channels ===');
    try {
        const res = await axios.get(`${baseUrl}/channels`, { headers, timeout: 15000 });
        console.log('Keys:', Object.keys(res.data));
        const channels = res.data.channels || res.data.data || res.data;
        if (Array.isArray(channels)) {
            console.log(`Total: ${channels.length}`);
            channels.forEach(ch => {
                console.log(`  ${JSON.stringify(ch)}`);
            });
        } else {
            console.log(JSON.stringify(res.data, null, 2).substring(0, 2000));
        }
    } catch (e) { console.error('Error:', e.response?.status, e.response?.data || e.message); }

    // 2. Try channel CRUD endpoints
    const crudEndpoints = [
        { method: 'GET', path: '/channels?limit=100' },
        { method: 'GET', path: '/channels/kinds' },
        { method: 'GET', path: '/channels/types' },
        { method: 'OPTIONS', path: '/channels' },
    ];

    console.log('\n=== TESTING CHANNEL ENDPOINTS ===');
    for (const ep of crudEndpoints) {
        try {
            const res = await axios({ method: ep.method, url: `${baseUrl}${ep.path}`, headers, timeout: 8000 });
            console.log(`  ✅ ${ep.method} ${ep.path} → ${res.status} | keys: ${typeof res.data === 'object' ? Object.keys(res.data).join(', ') : 'primitive'}`);
        } catch (e) {
            const allowed = e.response?.headers?.['allow'] || e.response?.headers?.['access-control-allow-methods'] || '';
            console.log(`  ❌ ${ep.method} ${ep.path} → ${e.response?.status || 'TIMEOUT'}${allowed ? ` (allow: ${allowed})` : ''}`);
        }
    }

    // 3. Check if we can POST a new channel (dry run - just check if endpoint accepts POST)
    console.log('\n=== TESTING CHANNEL CREATION ===');
    try {
        // Test with a minimal payload to see what the API expects
        const res = await axios.post(`${baseUrl}/channels`, {
            title: 'Test Channel',
            kind: 'instagram',
            url: 'https://instagram.com/test_account'
        }, { headers, timeout: 8000 });
        console.log(`  ✅ POST /channels → ${res.status}`);
        console.log(`  Response:`, JSON.stringify(res.data, null, 2).substring(0, 500));

        // If created, delete it
        if (res.data?.id) {
            console.log(`  → Created channel ID ${res.data.id}, attempting to delete...`);
            try {
                const delRes = await axios.delete(`${baseUrl}/channels/${res.data.id}`, { headers, timeout: 8000 });
                console.log(`  ✅ DELETE /channels/${res.data.id} → ${delRes.status}`);
            } catch (de) {
                console.log(`  ❌ DELETE failed: ${de.response?.status}`);
            }
        }
    } catch (e) {
        console.log(`  ❌ POST /channels → ${e.response?.status || 'TIMEOUT'}`);
        if (e.response?.data) console.log(`     Body:`, JSON.stringify(e.response.data).substring(0, 500));
    }

    // 4. Check PUT/PATCH
    console.log('\n=== TESTING CHANNEL UPDATE ===');
    try {
        const res = await axios.put(`${baseUrl}/channels/999`, { title: 'test' }, { headers, timeout: 5000 });
        console.log(`  ✅ PUT /channels/999 → ${res.status}`);
    } catch (e) {
        console.log(`  ❌ PUT /channels/999 → ${e.response?.status || 'TIMEOUT'}`);
    }
    try {
        const res = await axios.patch(`${baseUrl}/channels/999`, { title: 'test' }, { headers, timeout: 5000 });
        console.log(`  ✅ PATCH /channels/999 → ${res.status}`);
    } catch (e) {
        console.log(`  ❌ PATCH /channels/999 → ${e.response?.status || 'TIMEOUT'}`);
    }

    // 5. Check DELETE
    try {
        const res = await axios.delete(`${baseUrl}/channels/999`, { headers, timeout: 5000 });
        console.log(`  ✅ DELETE /channels/999 → ${res.status}`);
    } catch (e) {
        console.log(`  ❌ DELETE /channels/999 → ${e.response?.status || 'TIMEOUT'}`);
    }

    // 6. Check API docs for channel-related info
    console.log('\n=== API DOCS ===');
    try {
        const res = await axios.get(`${baseUrl}/docs`, { headers, timeout: 5000 });
        const html = typeof res.data === 'string' ? res.data : '';
        // Look for channel-related keywords
        const matches = html.match(/channel[^"<>]{0,100}/gi) || [];
        console.log(`  Found ${matches.length} channel references in docs`);
        matches.slice(0, 10).forEach(m => console.log(`    "${m}"`));
    } catch (e) {
        console.log(`  ❌ Could not fetch docs: ${e.message}`);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
