import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
);

async function createCompleteFlow() {
    // 1. Authenticate as the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'paulosouza17@gmail.com',
        password: 'Proi933819391!'
    });

    if (authError || !authData.user) {
        console.error('❌ Auth failed:', authError?.message);
        return;
    }
    const userId = authData.user.id;
    console.log(`✅ Authenticated as ${authData.user.email} (${userId})`);

    // 2. Find activation "Flavio Bolsonaro"
    const { data: activations } = await supabase
        .from('activations')
        .select('id, name, status')
        .ilike('name', '%flavio bolsonaro%')
        .limit(1);

    if (!activations || activations.length === 0) {
        console.error('❌ Activation "Flavio Bolsonaro" not found');
        return;
    }
    const activation = activations[0];
    console.log(`✅ Activation: ${activation.name} (${activation.id}) — status: ${activation.status}`);

    // 3. Find G1 media outlet
    const { data: outlets } = await supabase
        .from('media_outlets')
        .select('id, name, type, url')
        .ilike('name', '%g1%')
        .limit(1);

    if (!outlets || outlets.length === 0) {
        console.error('❌ Media outlet "G1" not found');
        return;
    }
    const g1 = outlets[0];
    console.log(`✅ Outlet: ${g1.name} (${g1.id}) — type: ${g1.type}, url: ${g1.url}`);

    // 4. Build the complete flow
    const NEWS_API = 'http://localhost:8001';
    const PEOPLE_API = 'http://10.144.103.1:8011/api/v1';

    const nodes = [
        // TRIGGER — Activation event
        {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
                label: '🔔 Ativação: Evento Aprovado',
                iconType: 'activation',
                triggerType: 'activation',
                color: '#eab308',
            },
        },
        // MEDIA OUTLET — G1 selected
        {
            id: 'mediaoutlet-1',
            type: 'action',
            position: { x: 400, y: 200 },
            data: {
                label: '📺 Veículo: G1',
                iconType: 'mediaoutlet',
                outletFilterMode: 'selected',
                selectedOutletIds: [g1.id],
                color: '#0ea5e9',
            },
        },
        // LOOP — Portais
        {
            id: 'loop-portais',
            type: 'action',
            position: { x: 400, y: 350 },
            data: {
                label: '🔄 Loop: Para cada Portal',
                iconType: 'loop',
                loopVariable: 'mediaoutlet-1.items',
                loopAlias: 'portal',
                color: '#8b5cf6',
            },
        },
        // HTTP — Buscar Notícias do Portal (News API)
        {
            id: 'http-news',
            type: 'action',
            position: { x: 400, y: 500 },
            data: {
                label: '🌐 Buscar Notícias (News API)',
                iconType: 'httprequest',
                httpMethod: 'GET',
                httpUrl: `${NEWS_API}/news?url={loop-portais.portal.url}`,
                httpHeaders: '',
                httpBody: '',
                color: '#f97316',
            },
        },
        // LOOP — Notícias
        {
            id: 'loop-noticias',
            type: 'action',
            position: { x: 400, y: 650 },
            data: {
                label: '🔄 Loop: Para cada Notícia',
                iconType: 'loop',
                loopVariable: 'http-news.data',
                loopAlias: 'noticia',
                color: '#8b5cf6',
            },
        },
        // LINKCHECK — Deduplication
        {
            id: 'linkcheck-1',
            type: 'condition',
            position: { x: 400, y: 800 },
            data: {
                label: '🔗 Link já processado?',
                iconType: 'linkcheck',
                urlVariable: 'loop-noticias.noticia.url',
                color: '#14b8a6',
            },
        },
        // HTTP — Extrair Conteúdo (News API /content)
        {
            id: 'http-content',
            type: 'action',
            position: { x: 400, y: 950 },
            data: {
                label: '📰 Extrair Conteúdo (News API)',
                iconType: 'httprequest',
                httpMethod: 'GET',
                httpUrl: `${NEWS_API}/content?url={loop-noticias.noticia.url}`,
                httpHeaders: '',
                httpBody: '',
                color: '#f97316',
            },
        },
        // HTTP — Buscar Referências (People API /references/find/sync)
        {
            id: 'http-references',
            type: 'action',
            position: { x: 400, y: 1100 },
            data: {
                label: '🔍 Buscar Referências (People API)',
                iconType: 'httprequest',
                httpMethod: 'POST',
                httpUrl: `${PEOPLE_API}/references/find/sync`,
                httpHeaders: '{"Content-Type": "application/json"}',
                httpBody: JSON.stringify({
                    url: '{loop-noticias.noticia.url}',
                    min_accuracy: 0.7
                }),
                color: '#ec4899',
            },
        },
        // CONDITIONAL — People found?
        {
            id: 'conditional-1',
            type: 'condition',
            position: { x: 400, y: 1250 },
            data: {
                label: '🔀 Citação Encontrada?',
                iconType: 'conditional',
                conditionSource: 'http-references.people_found',
                conditionOperator: 'not_empty',
                conditionValue: '',
                color: '#6366f1',
            },
        },
        // PUBLISH — Feed
        {
            id: 'publish-1',
            type: 'action',
            position: { x: 400, y: 1400 },
            data: {
                label: '✅ Publicar no Feed',
                iconType: 'publish',
                color: '#22c55e',
            },
        },
    ];

    const edges = [
        { id: 'e-trigger-media', source: 'trigger-1', target: 'mediaoutlet-1', type: 'deletable' },
        { id: 'e-media-loop1', source: 'mediaoutlet-1', target: 'loop-portais', type: 'deletable' },
        { id: 'e-loop1-http1', source: 'loop-portais', target: 'http-news', type: 'deletable' },
        { id: 'e-http1-loop2', source: 'http-news', target: 'loop-noticias', type: 'deletable' },
        { id: 'e-loop2-linkcheck', source: 'loop-noticias', target: 'linkcheck-1', type: 'deletable' },
        { id: 'e-linkcheck-content', source: 'linkcheck-1', target: 'http-content', type: 'deletable' },
        { id: 'e-content-refs', source: 'http-content', target: 'http-references', type: 'deletable' },
        { id: 'e-refs-cond', source: 'http-references', target: 'conditional-1', type: 'deletable' },
        { id: 'e-cond-publish', source: 'conditional-1', target: 'publish-1', type: 'deletable' },
    ];

    // 5. Insert the flow
    const { data: flow, error: flowError } = await supabase
        .from('flows')
        .insert({
            name: 'Teste mais completo',
            nodes,
            edges,
            user_id: userId,
        })
        .select('id')
        .single();

    if (flowError) {
        console.error('❌ Flow insert error:', flowError.message);
        return;
    }

    console.log(`\n✅ Flow created: ${flow.id}`);
    console.log(`📋 Name: Teste mais completo`);
    console.log(`📊 Nodes: ${nodes.length} | Edges: ${edges.length}`);

    // 6. Assign activation to this flow
    const { error: assignError } = await supabase
        .from('flow_assignments')
        .insert({
            flow_id: flow.id,
            activation_id: activation.id,
            user_id: userId,
        });

    if (assignError) {
        console.log(`⚠️  Assignment warning: ${assignError.message}`);
    } else {
        console.log(`✅ Activation "${activation.name}" assigned to flow`);
    }

    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('📋 FLOW SUMMARY');
    console.log('═'.repeat(60));
    console.log();
    nodes.forEach((n, i) => {
        const indent = n.id.includes('loop-') || n.id.startsWith('http-') ||
            n.id.startsWith('linkcheck-') || n.id.startsWith('conditional-') ||
            n.id.startsWith('publish-') ? '    ' : '  ';
        console.log(`${indent}${i + 1}. ${n.data.label} [${n.data.iconType}]`);
    });
    console.log();
    console.log('🔗 Connection Chain:');
    edges.forEach(e => console.log(`    ${e.source} → ${e.target}`));
    console.log();
    console.log('🌐 API Endpoints Used:');
    console.log(`    NEWS API: ${NEWS_API}/news?url=...`);
    console.log(`    NEWS API: ${NEWS_API}/content?url=...`);
    console.log(`    PEOPLE API: ${PEOPLE_API}/references/find/sync`);
    console.log();
    console.log(`🔗 Open in browser: http://localhost:5173/flows/builder?id=${flow.id}`);
}

createCompleteFlow().catch(console.error);
