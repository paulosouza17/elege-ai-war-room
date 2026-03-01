/**
 * Re-sync script: updates existing intelligence_feed items from ElegeAI
 * that have incomplete data (no content, no assets, source='Elege.AI API').
 * 
 * Fetches full post data from /api/posts/{id} and updates each item.
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
    if (['news', 'web', 'site', 'portal'].includes(kind)) return 'portal';
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

async function fetchMention(mentionId) {
    // Try to find the mention data in the latest mentions
    try {
        const res = await axios.get(`${baseUrl}/analytics/mentions/latest?limit=100&period=30d`, { headers, timeout: 30000 });
        const mentions = res.data.mentions || res.data.data || [];
        return mentions.find(m => m.id === mentionId) || null;
    } catch (e) {
        return null;
    }
}

async function main() {
    // 1. Find all items from ElegeAI that have incomplete data
    const { data: incompleteItems, error } = await supabase
        .from('intelligence_feed')
        .select('id, title, summary, content, source, source_type, url, classification_metadata')
        .like('url', '%elegeai-mention-%')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) { console.error('DB error:', error); return; }

    console.log(`\n🔍 Found ${(incompleteItems || []).length} ElegeAI items in feed\n`);

    // Filter for truly incomplete items
    const toFix = (incompleteItems || []).filter(item => {
        const cm = item.classification_metadata || {};
        const hasEmptyAssets = !cm.assets || cm.assets.length === 0;
        const hasNoContent = !item.content || item.content === item.title;
        const hasNoSummary = !item.summary || item.summary === 'Sem resumo';
        return hasEmptyAssets || hasNoContent || hasNoSummary;
    });

    console.log(`🔧 ${toFix.length} items need re-enrichment\n`);

    // 2. Fetch all mentions to build a lookup
    let mentionsMap = {};
    try {
        const res = await axios.get(`${baseUrl}/analytics/mentions/latest?limit=200&period=30d`, { headers, timeout: 30000 });
        const mentions = res.data.mentions || res.data.data || [];
        for (const m of mentions) { mentionsMap[m.id] = m; }
        console.log(`📡 Loaded ${Object.keys(mentionsMap).length} mentions from API\n`);
    } catch (e) {
        console.warn('Could not pre-load mentions:', e.message);
    }

    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of toFix) {
        const cm = item.classification_metadata || {};
        const postId = cm.elege_post_id;
        const mentionId = cm.elege_mention_id;

        if (!postId) {
            console.log(`  ⏭ Skip ${item.id.substring(0, 8)}: no elege_post_id`);
            skipped++;
            continue;
        }

        // Fetch full post
        const fullPost = await fetchFullPost(postId);
        if (!fullPost) {
            failed++;
            continue;
        }

        // Get mention data for subject/channel
        const mention = mentionsMap[mentionId] || null;
        const channel = mention?.channel || {};

        // Build updated data
        const fullContent = fullPost.content || '';
        const summary = mention?.subject
            || fullPost.summary
            || fullPost.subject
            || (fullContent ? fullContent.substring(0, 300) : null)
            || item.title
            || 'Sem resumo';

        const contentText = fullContent || mention?.subject || item.title || '';
        const channelName = channel.title || channel.name || cm.source_name || item.source;
        const sourceType = channel.kind ? mapSourceType(channel.kind) : (cm.channel_kind ? mapSourceType(cm.channel_kind) : item.source_type);
        const realUrl = fullPost.url || item.url;
        const assets = fullPost.assets || [];

        // Update sentiment from mention if available  
        let sentiment = item.sentiment;
        let riskScore = item.risk_score;
        if (mention?.sentiment) {
            const s = typeof mention.sentiment === 'string' ? mention.sentiment : mention.sentiment.tone;
            if (s === 'negative') { sentiment = 'negative'; riskScore = 75; }
            else if (s === 'positive') { sentiment = 'positive'; riskScore = 20; }
            else if (s === 'mixed') { sentiment = 'neutral'; riskScore = 55; }
            else { sentiment = 'neutral'; riskScore = 50; }
        }

        // Update in DB
        const updateData = {
            summary,
            content: contentText,
            source: channelName,
            source_type: sourceType,
            sentiment,
            risk_score: riskScore,
            url: realUrl,
            published_at: fullPost.published_at || undefined,
            classification_metadata: {
                ...cm,
                assets,
                channel_kind: channel.kind || cm.channel_kind,
                source_name: channelName,
                content_type_detected: sourceType,
            }
        };

        const { error: updateError } = await supabase
            .from('intelligence_feed')
            .update(updateData)
            .eq('id', item.id);

        if (updateError) {
            console.log(`  ❌ ${item.id.substring(0, 8)} "${item.title.substring(0, 40)}": ${updateError.message}`);
            failed++;
        } else {
            console.log(`  ✅ ${item.id.substring(0, 8)} "${item.title.substring(0, 40)}" → ${sourceType} | ${channelName} | assets: ${assets.length} | content: ${contentText.length} chars`);
            updated++;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n📊 Results: ${updated} updated, ${failed} failed, ${skipped} skipped`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
