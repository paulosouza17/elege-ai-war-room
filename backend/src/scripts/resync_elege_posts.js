/**
 * Re-sync incomplete items that use elegeai-post-* URL pattern.
 */
require('dotenv').config();
const axios = require('axios');
const sb = require('@supabase/supabase-js');

const baseUrl = (process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001') + '/api';
const token = process.env.ELEGEAI_API_TOKEN || '';
const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

function mapSourceType(channelKind) {
    const kind = String(channelKind || '').toLowerCase();
    if (kind === 'tv' || kind === '2') return 'tv';
    if (kind === 'radio' || kind === '3') return 'radio';
    if (kind === 'youtube') return 'tv';
    if (['social', 'twitter', 'instagram', 'facebook', 'tiktok'].includes(kind) || kind === '4') return 'social_media';
    if (kind === 'whatsapp') return 'social_media';
    return 'portal';
}

async function fetchFullPost(postId) {
    try {
        const res = await axios.get(`${baseUrl}/posts/${postId}`, { headers, timeout: 15000 });
        return res.data;
    } catch (e) {
        console.warn(`  ⚠ Could not fetch post ${postId}: ${e.message}`);
        return null;
    }
}

// Fetch channel info for a post
async function fetchChannel(channelId) {
    try {
        const res = await axios.get(`${baseUrl}/channels/${channelId}`, { headers, timeout: 10000 });
        return res.data;
    } catch { return null; }
}

async function main() {
    // Find all items with "Sem resumo" that weren't caught by the first script
    const { data: items, error } = await supabase
        .from('intelligence_feed')
        .select('id, title, summary, content, source, source_type, url, classification_metadata')
        .eq('summary', 'Sem resumo')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) { console.error('DB error:', error); return; }
    console.log(`🔍 Found ${(items || []).length} remaining "Sem resumo" items\n`);

    // Pre-load channels
    let channelCache = {};
    try {
        const res = await axios.get(`${baseUrl}/channels?limit=100`, { headers, timeout: 15000 });
        const channels = res.data.channels || res.data.data || [];
        for (const ch of channels) { channelCache[ch.id] = ch; }
        console.log(`📡 Loaded ${Object.keys(channelCache).length} channels\n`);
    } catch (e) { console.warn('Could not load channels:', e.message); }

    // Pre-load latest mentions for subject data
    let mentionsByPostId = {};
    try {
        const res = await axios.get(`${baseUrl}/analytics/mentions/latest?limit=200&period=30d`, { headers, timeout: 30000 });
        const mentions = res.data.mentions || res.data.data || [];
        for (const m of mentions) {
            if (m.post?.id) {
                if (!mentionsByPostId[m.post.id]) mentionsByPostId[m.post.id] = [];
                mentionsByPostId[m.post.id].push(m);
            }
        }
        console.log(`📡 Loaded mentions for ${Object.keys(mentionsByPostId).length} posts\n`);
    } catch (e) { console.warn('Could not load mentions:', e.message); }

    let updated = 0, failed = 0, skipped = 0;

    for (const item of items) {
        const cm = item.classification_metadata || {};
        const postId = cm.elege_post_id;
        if (!postId) { skipped++; continue; }

        const fullPost = await fetchFullPost(postId);
        if (!fullPost) { failed++; continue; }

        // Get channel info
        const channelKind = cm.channel_kind;
        let channelName = item.source;
        if (channelName === 'Elege.AI API' && fullPost.channel_id && channelCache[fullPost.channel_id]) {
            channelName = channelCache[fullPost.channel_id].title || channelName;
        }

        // Get mention subject
        const mentions = mentionsByPostId[postId] || [];
        const subject = mentions[0]?.subject || null;

        const fullContent = fullPost.content || '';
        const summary = subject
            || fullPost.summary
            || fullPost.subject
            || (fullContent ? fullContent.substring(0, 300) : null)
            || item.title
            || 'Sem resumo';

        const contentText = fullContent || subject || item.title || '';
        const sourceType = mapSourceType(channelKind || (channelCache[fullPost.channel_id]?.kind));
        const assets = fullPost.assets || [];
        const realUrl = fullPost.url || item.url;

        // Get best channel name
        if (channelName === 'Elege.AI API' && mentions[0]?.channel?.title) {
            channelName = mentions[0].channel.title;
        }
        if (channelName === 'Elege.AI API' && fullPost.channel_id) {
            const ch = channelCache[fullPost.channel_id];
            if (ch) channelName = ch.title;
        }

        const updateData = {
            summary,
            content: contentText,
            source: channelName,
            source_type: sourceType,
            url: realUrl,
            published_at: fullPost.published_at || undefined,
            classification_metadata: {
                ...cm,
                assets,
                source_name: channelName,
                content_type_detected: sourceType,
            }
        };

        const { error: updateError } = await supabase
            .from('intelligence_feed')
            .update(updateData)
            .eq('id', item.id);

        if (updateError) {
            console.log(`  ❌ ${item.id.substring(0, 8)}: ${updateError.message}`);
            failed++;
        } else {
            console.log(`  ✅ ${item.id.substring(0, 8)} "${item.title.substring(0, 40)}" → ${sourceType} | ${channelName} | assets: ${assets.length} | content: ${contentText.length} chars`);
            updated++;
        }

        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n📊 Results: ${updated} updated, ${failed} failed, ${skipped} skipped`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
