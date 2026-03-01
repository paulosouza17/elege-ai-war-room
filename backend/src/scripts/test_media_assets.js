#!/usr/bin/env node
/**
 * test_media_assets.js — Diagnostic: verifica se assets de mídia (vídeo/áudio)
 * estão sendo retornados corretamente pela API do Elege.AI
 * 
 * Uso: node test_media_assets.js
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = (process.env.ELEGE_BASE_URL || 'http://api.elege.ai') + '/api';
const TOKEN = process.env.ELEGEAI_API_TOKEN;
const PROXY_URL = 'http://localhost:3000/api/elege/assets';

async function api(path) {
    const res = await axios.get(`${BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
        timeout: 15000,
    });
    return res.data;
}

async function testAssetDownload(postId, assetId) {
    try {
        const res = await axios.head(`${PROXY_URL}/${postId}/${assetId}`, { timeout: 15000 });
        return {
            status: res.status,
            contentType: res.headers['content-type'],
            contentLength: res.headers['content-length'],
        };
    } catch (err) {
        return { status: err.response?.status || 'ERROR', error: err.message };
    }
}

async function main() {
    if (!TOKEN) {
        console.error('❌ ELEGEAI_API_TOKEN não definido no .env');
        process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('  Diagnóstico de Mídias — Elege.AI API');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  API Base: ${BASE_URL}`);
    console.log(`  Token:    ${TOKEN.substring(0, 6)}...`);
    console.log('');

    // 1. Buscar menções recentes de TV/Radio (via channels)
    console.log('📡 Buscando canais...');
    const channelsData = await api('/channels?limit=200');
    const channels = channelsData.channels || channelsData.data || [];

    const tvChannels = channels.filter(c => String(c.kind) === '0' || String(c.kind).toLowerCase() === 'tv');
    const radioChannels = channels.filter(c => String(c.kind) === '1' || String(c.kind).toLowerCase() === 'radio');
    const youtubeChannels = channels.filter(c => String(c.kind) === '9' || String(c.kind).toLowerCase() === 'youtube');

    console.log(`  TV:      ${tvChannels.length} canais`);
    console.log(`  Radio:   ${radioChannels.length} canais`);
    console.log(`  YouTube: ${youtubeChannels.length} canais`);
    console.log('');

    // 2. Pegar menções de 1 canal TV + 1 Radio
    const testChannels = [
        ...tvChannels.slice(0, 2).map(c => ({ ...c, label: 'TV' })),
        ...radioChannels.slice(0, 1).map(c => ({ ...c, label: 'Radio' })),
        ...youtubeChannels.slice(0, 1).map(c => ({ ...c, label: 'YouTube' })),
    ];

    let totalPosts = 0;
    let postsWithVideo = 0;
    let postsWithAudio = 0;
    let postsWithFrames = 0;
    let downloadOk = 0;
    let downloadFail = 0;

    for (const ch of testChannels) {
        console.log(`\n🔍 Canal: ${ch.title} (${ch.label}, kind=${ch.kind}, id=${ch.id})`);
        console.log('─'.repeat(60));

        try {
            const mentionsData = await api(`/analytics/mentions/latest?channel_id=${ch.id}&limit=5`);
            const mentions = mentionsData.mentions || mentionsData.data || [];
            console.log(`  Menções encontradas: ${mentions.length}`);

            if (mentions.length === 0) continue;

            // Fetch full post data for each mention
            const postIds = [...new Set(mentions.map(m => m.post?.id).filter(Boolean))];
            console.log(`  Posts únicos: ${postIds.length}`);

            for (const postId of postIds.slice(0, 3)) {
                totalPosts++;
                try {
                    const post = await api(`/posts/${postId}`);
                    const assets = post.assets || [];
                    const videos = assets.filter(a => a.kind === 'video' || (a.media_type && a.media_type.startsWith('video')));
                    const audios = assets.filter(a => a.kind === 'audio' || (a.media_type && a.media_type.startsWith('audio')));
                    const frames = assets.filter(a => a.kind === 'image' && a.name?.startsWith('frame_'));

                    const hasVideo = videos.length > 0;
                    const hasAudio = audios.length > 0;
                    const hasFrames = frames.length > 0;

                    if (hasVideo) postsWithVideo++;
                    if (hasAudio) postsWithAudio++;
                    if (hasFrames) postsWithFrames++;

                    console.log(`\n  📄 Post ${postId}: "${(post.title || '').substring(0, 50)}..."`);
                    console.log(`     Assets: ${assets.length} total | ${videos.length} vídeo | ${audios.length} áudio | ${frames.length} frames`);

                    // Test download de 1 asset de cada tipo
                    const testAssets = [...videos.slice(0, 1), ...audios.slice(0, 1), ...frames.slice(0, 1)];

                    for (const asset of testAssets) {
                        const result = await testAssetDownload(postId, asset.id);
                        const icon = result.status === 200 ? '✅' : '❌';
                        const size = result.contentLength ? `${Math.round(result.contentLength / 1024)}KB` : 'N/A';
                        console.log(`     ${icon} Asset ${asset.id} (${asset.kind || asset.media_type}): ${result.status} | ${result.contentType || 'N/A'} | ${size}`);

                        if (result.status === 200) downloadOk++;
                        else downloadFail++;
                    }

                    if (testAssets.length === 0) {
                        console.log(`     ⚠️  Nenhum asset de mídia neste post`);
                    }

                } catch (err) {
                    console.log(`  ❌ Post ${postId}: ${err.message}`);
                }
            }
        } catch (err) {
            console.log(`  ❌ Erro ao buscar menções: ${err.response?.status || err.message}`);
        }
    }

    // Summary
    console.log('\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('  RESUMO');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Posts analisados:    ${totalPosts}`);
    console.log(`  Com vídeo:           ${postsWithVideo}`);
    console.log(`  Com áudio:           ${postsWithAudio}`);
    console.log(`  Com frames:          ${postsWithFrames}`);
    console.log(`  Downloads OK:        ${downloadOk}`);
    console.log(`  Downloads FALHA:     ${downloadFail}`);
    console.log('═══════════════════════════════════════════════════');

    if (downloadFail > 0) {
        console.log('\n⚠️  Alguns assets falharam no download via proxy.');
        console.log('   Verifique se ELEGE_BASE_URL e ELEGEAI_API_TOKEN estão corretos no .env');
    }
    if (postsWithVideo === 0 && postsWithAudio === 0) {
        console.log('\n⚠️  Nenhum post com vídeo/áudio encontrado!');
        console.log('   A API pode não estar retornando assets para esses canais.');
    }
}

main().catch(err => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
});
