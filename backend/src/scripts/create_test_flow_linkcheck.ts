import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
);

async function createTestFlowWithLinkCheck() {
    // 1. Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'paulosouza17@gmail.com',
        password: 'Proi933819391!',
    });
    if (authError || !authData?.user) { console.error('Auth failed:', authError?.message); return; }
    const userId = authData.user.id;
    console.log(`✅ User: ${userId}`);

    // 2. Get first existing media outlet (portal type preferred)
    const { data: outlets, error: outletError } = await supabase
        .from('media_outlets')
        .select('id, name, type, url')
        .order('name')
        .limit(10);

    if (outletError || !outlets?.length) {
        console.error('❌ No media outlets found:', outletError?.message);
        return;
    }

    // Pick first portal, or first outlet if no portals
    const portalOutlet = outlets.find(o => o.type === 'portal') || outlets[0];
    console.log(`📺 Using outlet: ${portalOutlet.name} (${portalOutlet.type}) — ${portalOutlet.id}`);

    // 3. Define nodes — complete flow with LinkCheck + selected outlet
    const nodes = [
        {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 400, y: 50 },
            data: {
                label: '🔔 Ativação Aprovada',
                iconType: 'activation',
                triggerType: 'activation',
                color: '#22c55e',
            },
        },
        {
            id: 'mediaoutlet-1',
            type: 'action',
            position: { x: 400, y: 200 },
            data: {
                label: '📺 Portal Selecionado',
                iconType: 'mediaoutlet',
                outletFilterMode: 'selected',
                selectedOutletIds: [portalOutlet.id],
                color: '#0ea5e9',
            },
        },
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
        {
            id: 'http-news',
            type: 'action',
            position: { x: 400, y: 500 },
            data: {
                label: '🌐 Buscar Notícias',
                iconType: 'httprequest',
                httpMethod: 'GET',
                httpUrl: 'http://localhost:8001/news?url={loop-portais.portal.url}',
                color: '#f97316',
            },
        },
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
        {
            id: 'http-content',
            type: 'action',
            position: { x: 400, y: 950 },
            data: {
                label: '📰 Extrair Conteúdo',
                iconType: 'httprequest',
                httpMethod: 'GET',
                httpUrl: 'http://localhost:8001/content?url={loop-noticias.noticia.url}',
                color: '#f97316',
            },
        },
        {
            id: 'http-references',
            type: 'action',
            position: { x: 400, y: 1100 },
            data: {
                label: '🔍 Buscar Referências',
                iconType: 'httprequest',
                httpMethod: 'POST',
                httpUrl: 'http://localhost:8001/references/find/sync',
                httpBody: JSON.stringify({ url: '{loop-noticias.noticia.url}' }),
                httpHeaders: JSON.stringify({ 'Content-Type': 'application/json' }),
                color: '#f97316',
            },
        },
        {
            id: 'conditional-1',
            type: 'condition',
            position: { x: 400, y: 1250 },
            data: {
                label: '🔀 Citação Encontrada?',
                iconType: 'conditional',
                conditionSource: 'http-references.people_found',
                conditionOperator: 'not_empty',
                color: '#6366f1',
            },
        },
        {
            id: 'publish-1',
            type: 'publish',
            position: { x: 400, y: 1400 },
            data: {
                label: '✅ Publicar no Feed',
                iconType: 'publish',
                color: '#10b981',
            },
        },
    ];

    // 4. Define edges
    const edges = [
        { id: 'e-trigger-media', source: 'trigger-1', target: 'mediaoutlet-1', type: 'deletable' },
        { id: 'e-media-loop1', source: 'mediaoutlet-1', target: 'loop-portais', type: 'deletable' },
        { id: 'e-loop1-http1', source: 'loop-portais', target: 'http-news', type: 'deletable' },
        { id: 'e-http1-loop2', source: 'http-news', target: 'loop-noticias', type: 'deletable' },
        { id: 'e-loop2-linkcheck', source: 'loop-noticias', target: 'linkcheck-1', type: 'deletable' },
        { id: 'e-linkcheck-http2', source: 'linkcheck-1', target: 'http-content', type: 'deletable' },
        { id: 'e-http2-http3', source: 'http-content', target: 'http-references', type: 'deletable' },
        { id: 'e-http3-cond', source: 'http-references', target: 'conditional-1', type: 'deletable' },
        { id: 'e-cond-publish', source: 'conditional-1', target: 'publish-1', type: 'deletable' },
    ];

    // 5. Insert flow
    const { data: flow, error } = await supabase
        .from('flows')
        .insert({
            name: '[TESTE] Portal + LinkCheck + Seleção Manual',
            description: `Fluxo de teste com verificação de link duplicado e seleção manual do veículo "${portalOutlet.name}".`,
            nodes,
            edges,
            user_id: userId,
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating flow:', error.message);
        return;
    }

    console.log(`\n✅ Flow created successfully!`);
    console.log(`   ID: ${flow.id}`);
    console.log(`   Name: ${flow.name}`);
    console.log(`   Nodes: ${nodes.length} (including LinkCheck)`);
    console.log(`   Edges: ${edges.length}`);
    console.log(`   Selected Outlet: ${portalOutlet.name} (${portalOutlet.id})`);
    console.log(`\n🔗 Open in browser: http://localhost:5173/flows/builder?id=${flow.id}`);
}

createTestFlowWithLinkCheck().catch(console.error);
