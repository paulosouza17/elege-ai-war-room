/**
 * ============================================================
 *  VERIFICAÇÃO COMPLETA DOS FLUXOS DE MÍDIA — Elege.AI War Room
 * ============================================================
 *
 *  Verifica se os fluxos de TV, Radio, Redes Sociais, Portais de
 *  Notícias, Instagram, TikTok e WhatsApp estão funcionando.
 *
 *  Execução:
 *    cd backend && npx ts-node src/scripts/verify_all_flows.ts
 *
 *  Checagens realizadas:
 *    1. Conexão com o Supabase
 *    2. Ativações ativas (activations)
 *    3. Fluxos definidos (flows) e seus nós
 *    4. Execuções recentes (flow_executions) — últimas 24h
 *    5. Feed de inteligência por source_type (intelligence_feed) — últimas 24h
 *    6. Canais vinculados (channel_activations) por tipo
 *    7. Credenciais Elege.AI (data_sources)
 *    8. Conectividade da API Elege.AI
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// ─── Tipos de mídia que precisamos verificar ───────────────────────
const MEDIA_SOURCES = [
    { label: '📺 TV', sourceType: 'tv', channelKinds: ['tv', '0', 'youtube', '9'] },
    { label: '📻 Rádio', sourceType: 'radio', channelKinds: ['radio', '1'] },
    { label: '🌐 Redes Sociais', sourceType: 'social_media', channelKinds: ['social', 'twitter', 'facebook', 'x'] },
    { label: '📰 Portais de Notícias', sourceType: 'portal', channelKinds: ['website', '4', 'news', 'web', 'site', 'portal'] },
    { label: '📸 Instagram', sourceType: 'social_media', channelKinds: ['instagram', '11'], filterLabel: 'instagram' },
    { label: '🎵 TikTok', sourceType: 'social_media', channelKinds: ['tiktok'], filterLabel: 'tiktok' },
    { label: '💬 WhatsApp', sourceType: 'whatsapp', channelKinds: ['whatsapp', '7'] },
];

// ─── Helpers ───────────────────────────────────────────────────────
const OK = '✅';
const WARN = '⚠️';
const FAIL = '❌';
const INFO = 'ℹ️';
const DIVIDER = '═'.repeat(60);
const THIN_DIV = '─'.repeat(60);

let totalChecks = 0;
let passedChecks = 0;
let warningChecks = 0;
let failedChecks = 0;

function pass(msg: string) { totalChecks++; passedChecks++; console.log(`  ${OK} ${msg}`); }
function warn(msg: string) { totalChecks++; warningChecks++; console.log(`  ${WARN} ${msg}`); }
function fail(msg: string) { totalChecks++; failedChecks++; console.log(`  ${FAIL} ${msg}`); }
function info(msg: string) { console.log(`  ${INFO} ${msg}`); }

// ─── Verificações ──────────────────────────────────────────────────

async function checkSupabaseConnection(): Promise<boolean> {
    console.log(`\n${DIVIDER}`);
    console.log('1. CONEXÃO COM O SUPABASE');
    console.log(DIVIDER);

    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        pass('Conexão com Supabase OK');
        return true;
    } catch (e: any) {
        fail(`Conexão com Supabase falhou: ${e.message}`);
        return false;
    }
}

async function checkActivations(): Promise<any[]> {
    console.log(`\n${DIVIDER}`);
    console.log('2. ATIVAÇÕES ATIVAS');
    console.log(DIVIDER);

    const { data: activations, error } = await supabase
        .from('activations')
        .select('id, name, status, people_of_interest, keywords, flow_id, created_at')
        .eq('status', 'active');

    if (error) {
        fail(`Erro ao consultar ativações: ${error.message}`);
        return [];
    }

    if (!activations || activations.length === 0) {
        fail('Nenhuma ativação ativa encontrada');
        return [];
    }

    pass(`${activations.length} ativação(ões) ativa(s) encontrada(s)`);

    for (const act of activations) {
        const label = act.name || act.id;
        const people = act.people_of_interest || [];
        const keywords = act.keywords || [];
        const flowLinked = act.flow_id ? 'com fluxo' : 'sem fluxo';

        info(`  "${label}" — ${people.length} pessoa(s), ${keywords.length} keyword(s), ${flowLinked}`);
    }

    return activations;
}

async function checkFlows() {
    console.log(`\n${DIVIDER}`);
    console.log('3. FLUXOS DEFINIDOS');
    console.log(DIVIDER);

    const { data: flows, error } = await supabase
        .from('flows')
        .select('id, name, active, nodes, edges, updated_at')
        .order('updated_at', { ascending: false });

    if (error) {
        fail(`Erro ao consultar fluxos: ${error.message}`);
        return;
    }

    if (!flows || flows.length === 0) {
        fail('Nenhum fluxo encontrado no sistema');
        return;
    }

    pass(`${flows.length} fluxo(s) encontrado(s)`);

    for (const flow of flows) {
        const nodes = flow.nodes || [];
        const nodeTypes = nodes.map((n: any) => n.data?.iconType || n.type).filter(Boolean);
        const isActive = flow.active !== false;
        const status = isActive ? OK : WARN;
        const activeLabel = isActive ? 'ativo' : 'inativo';

        const relevantTypes = new Set<string>();
        for (const nt of nodeTypes) {
            if (['twitter', 'x'].includes(nt)) relevantTypes.add('Twitter/X');
            if (nt === 'whatsapp') relevantTypes.add('WhatsApp');
            if (nt === 'mediaoutlet') relevantTypes.add('Veículos (TV/Radio/Portal)');
            if (nt === 'httprequest') relevantTypes.add('HTTP/API');
            if (nt === 'instagram') relevantTypes.add('Instagram');
            if (nt === 'tiktok') relevantTypes.add('TikTok');
        }

        const typesLabel = relevantTypes.size > 0 ? Array.from(relevantTypes).join(', ') : nodeTypes.join(', ');
        console.log(`  ${status} "${flow.name}" [${activeLabel}] — ${nodes.length} nó(s) — Tipos: ${typesLabel}`);
    }
}

async function checkFlowExecutions() {
    console.log(`\n${DIVIDER}`);
    console.log('4. EXECUÇÕES RECENTES (últimas 24h)');
    console.log(DIVIDER);

    const h24ago = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: executions, error } = await supabase
        .from('flow_executions')
        .select('id, flow_id, status, started_at, completed_at, error_message')
        .gte('started_at', h24ago)
        .order('started_at', { ascending: false })
        .limit(50);

    if (error) {
        fail(`Erro ao consultar execuções: ${error.message}`);
        return;
    }

    if (!executions || executions.length === 0) {
        warn('Nenhuma execução nas últimas 24h');
        return;
    }

    // Agrupar por status
    const statusCounts: Record<string, number> = {};
    for (const exec of executions) {
        statusCounts[exec.status] = (statusCounts[exec.status] || 0) + 1;
    }

    const statusLine = Object.entries(statusCounts)
        .map(([s, c]) => `${s}: ${c}`)
        .join(' | ');

    info(`${executions.length} execução(ões) nas últimas 24h — ${statusLine}`);

    const completed = statusCounts['completed'] || 0;
    const failed = statusCounts['failed'] || 0;
    const running = statusCounts['running'] || 0;
    const pending = statusCounts['pending'] || 0;

    if (completed > 0) pass(`${completed} execução(ões) completada(s) com sucesso`);
    if (failed > 0) warn(`${failed} execução(ões) falharam`);
    if (running > 0) info(`${running} execução(ões) em andamento`);
    if (pending > 0) info(`${pending} execução(ões) pendente(s)`);

    // Mostrar últimos erros
    const recentErrors = executions.filter(e => e.status === 'failed' && e.error_message).slice(0, 3);
    if (recentErrors.length > 0) {
        console.log(`\n  ${THIN_DIV}`);
        console.log('  Últimos erros:');
        for (const e of recentErrors) {
            const time = e.completed_at ? new Date(e.completed_at).toLocaleString('pt-BR') : '?';
            console.log(`    [${time}] ${e.error_message?.substring(0, 120)}`);
        }
    }
}

async function checkFeedBySourceType(activations: any[]) {
    console.log(`\n${DIVIDER}`);
    console.log('5. FEED DE INTELIGÊNCIA POR TIPO (últimas 24h)');
    console.log(DIVIDER);

    const h24ago = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const h48ago = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const h7dago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const media of MEDIA_SOURCES) {
        let query24h = supabase
            .from('intelligence_feed')
            .select('id', { count: 'exact', head: true })
            .eq('source_type', media.sourceType)
            .gte('created_at', h24ago);

        let query48h = supabase
            .from('intelligence_feed')
            .select('id', { count: 'exact', head: true })
            .eq('source_type', media.sourceType)
            .gte('created_at', h48ago);

        let query7d = supabase
            .from('intelligence_feed')
            .select('id', { count: 'exact', head: true })
            .eq('source_type', media.sourceType)
            .gte('created_at', h7dago);

        // Para Instagram e TikTok, filtrar pelo channel_kind no metadata
        if (media.filterLabel) {
            // Usamos a query de source para distinguir
            const allKinds = media.channelKinds;
            // Filter by channel_kind in classification_metadata
            query24h = query24h.or(allKinds.map(k => `classification_metadata->>channel_kind.eq.${k}`).join(','));
            query48h = query48h.or(allKinds.map(k => `classification_metadata->>channel_kind.eq.${k}`).join(','));
            query7d = query7d.or(allKinds.map(k => `classification_metadata->>channel_kind.eq.${k}`).join(','));
        }

        const [res24h, res48h, res7d] = await Promise.all([query24h, query48h, query7d]);

        const count24h = res24h.count || 0;
        const count48h = res48h.count || 0;
        const count7d = res7d.count || 0;

        const statusIcon = count24h > 0 ? OK : (count48h > 0 ? WARN : (count7d > 0 ? WARN : FAIL));

        if (count24h > 0) {
            pass(`${media.label}: ${count24h} item(ns) nas últimas 24h (48h: ${count48h} | 7d: ${count7d})`);
        } else if (count48h > 0) {
            warn(`${media.label}: 0 nas últimas 24h, mas ${count48h} nas últimas 48h (7d: ${count7d})`);
        } else if (count7d > 0) {
            warn(`${media.label}: 0 nas últimas 48h, mas ${count7d} nos últimos 7 dias`);
        } else {
            fail(`${media.label}: NENHUM item encontrado nos últimos 7 dias`);
        }
    }

    // Mostrar último item de cada tipo
    console.log(`\n  ${THIN_DIV}`);
    console.log('  Último item por tipo:');

    const sourceTypes = [...new Set(MEDIA_SOURCES.map(m => m.sourceType))];
    for (const st of sourceTypes) {
        const { data: last } = await supabase
            .from('intelligence_feed')
            .select('id, title, source, source_type, created_at')
            .eq('source_type', st)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (last) {
            const ago = getTimeAgo(new Date(last.created_at));
            console.log(`    [${st}] "${(last.title || '').substring(0, 50)}" — ${last.source} — ${ago}`);
        } else {
            console.log(`    [${st}] Nenhum item encontrado`);
        }
    }
}

async function checkChannelActivations(activations: any[]) {
    console.log(`\n${DIVIDER}`);
    console.log('6. CANAIS VINCULADOS (channel_activations)');
    console.log(DIVIDER);

    if (activations.length === 0) {
        warn('Sem ativações ativas para verificar canais');
        return;
    }

    for (const activation of activations) {
        const label = activation.name || activation.id;

        const { data: channels, error } = await supabase
            .from('channel_activations')
            .select('id, elege_channel_id, channel_kind, channel_title')
            .eq('activation_id', activation.id);

        if (error) {
            fail(`Erro ao consultar canais de "${label}": ${error.message}`);
            continue;
        }

        if (!channels || channels.length === 0) {
            warn(`"${label}": Nenhum canal vinculado`);
            continue;
        }

        // Agrupar por kind
        const byKind: Record<string, string[]> = {};
        for (const ch of channels) {
            const kind = ch.channel_kind || 'unknown';
            if (!byKind[kind]) byKind[kind] = [];
            byKind[kind].push(ch.channel_title || `ID:${ch.elege_channel_id}`);
        }

        pass(`"${label}": ${channels.length} canal(is) vinculado(s)`);

        // Verificar presença de cada tipo de mídia
        const kindKeys = Object.keys(byKind);
        for (const media of MEDIA_SOURCES) {
            const hasKind = media.channelKinds.some(k => kindKeys.includes(k));
            if (hasKind) {
                const matchingKinds = media.channelKinds.filter(k => kindKeys.includes(k));
                const matchingChannels = matchingKinds.flatMap(k => byKind[k] || []);
                info(`  ${media.label}: ${matchingChannels.length} canal(is) — ${matchingChannels.slice(0, 3).join(', ')}${matchingChannels.length > 3 ? '...' : ''}`);
            } else {
                warn(`  ${media.label}: Nenhum canal do tipo ${media.channelKinds.join('/')} vinculado`);
            }
        }
    }
}

async function checkElegeCredentials() {
    console.log(`\n${DIVIDER}`);
    console.log('7. CREDENCIAIS ELEGE.AI');
    console.log(DIVIDER);

    // Check data_sources
    const { data: elegeSource, error } = await supabase
        .from('data_sources')
        .select('id, name, is_active, config')
        .eq('name', 'Elege.AI')
        .maybeSingle();

    if (error) {
        fail(`Erro ao consultar data_sources: ${error.message}`);
        return null;
    }

    if (!elegeSource) {
        fail('Data source "Elege.AI" não encontrado');
        return null;
    }

    if (!elegeSource.is_active) {
        fail('Data source "Elege.AI" está INATIVO');
        return null;
    }

    pass('Data source "Elege.AI" encontrado e ativo');

    const config = elegeSource.config || {};
    const token = config.bearerToken || config.api_token || config.token || '';
    const baseUrl = config.baseUrl || process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001';

    if (token) {
        pass(`Token configurado: ***${token.slice(-4)}`);
    } else {
        fail('Token Elege.AI NÃO configurado no data_sources');
    }

    info(`Base URL: ${baseUrl}`);

    return { token, baseUrl };
}

async function checkElegeApiConnectivity(credentials: { token: string; baseUrl: string } | null) {
    console.log(`\n${DIVIDER}`);
    console.log('8. CONECTIVIDADE API ELEGE.AI');
    console.log(DIVIDER);

    if (!credentials || !credentials.token) {
        fail('Sem credenciais para testar conectividade');
        return;
    }

    const apiBase = credentials.baseUrl.replace(/\/$/, '');
    const testUrl = `${apiBase}/api/people?q=teste&limit=1`;

    try {
        const response = await axios.get(testUrl, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Accept': 'application/json',
            },
            timeout: 15000,
        });

        pass(`API respondeu com status ${response.status}`);
        const data = response.data;
        const people = Array.isArray(data) ? data : (data.people || data.data || []);
        info(`Teste /people retornou ${people.length} resultado(s)`);

    } catch (e: any) {
        if (e.response) {
            if (e.response.status === 401 || e.response.status === 403) {
                fail(`API retornou ${e.response.status} — Token inválido ou expirado`);
            } else {
                warn(`API retornou status ${e.response.status}: ${JSON.stringify(e.response.data)?.substring(0, 150)}`);
            }
        } else if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') {
            fail(`API inacessível: ${e.message}`);
        } else {
            fail(`Erro de conectividade: ${e.message}`);
        }
    }

    // Test /analytics/mentions endpoint
    try {
        const mentionsUrl = `${apiBase}/api/analytics/mentions/latest?limit=1&period=1d`;
        const response = await axios.get(mentionsUrl, {
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Accept': 'application/json',
            },
            timeout: 15000,
        });

        pass(`Endpoint /analytics/mentions respondeu OK (status ${response.status})`);

    } catch (e: any) {
        const status = e.response?.status;
        if (status === 401 || status === 403) {
            fail(`/analytics/mentions retornou ${status} — Token inválido`);
        } else if (status) {
            warn(`/analytics/mentions retornou status ${status}`);
        } else {
            fail(`/analytics/mentions inacessível: ${e.message}`);
        }
    }
}

async function checkSyncWatermarks(activations: any[]) {
    console.log(`\n${DIVIDER}`);
    console.log('9. WATERMARKS DE SINCRONIZAÇÃO');
    console.log(DIVIDER);

    if (activations.length === 0) {
        warn('Sem ativações ativas para verificar watermarks');
        return;
    }

    for (const activation of activations) {
        const label = activation.name || activation.id;

        const { data: watermarks, error } = await supabase
            .from('sync_watermarks')
            .select('source_type, source_key, last_sync_at, last_item_date')
            .eq('activation_id', activation.id);

        if (error) {
            fail(`Erro ao consultar watermarks de "${label}": ${error.message}`);
            continue;
        }

        if (!watermarks || watermarks.length === 0) {
            warn(`"${label}": Nenhum watermark de sync encontrado — sincronização pode não ter ocorrido`);
            continue;
        }

        info(`"${label}": ${watermarks.length} watermark(s) de sync`);

        for (const wm of watermarks) {
            const lastSync = wm.last_sync_at ? getTimeAgo(new Date(wm.last_sync_at)) : 'nunca';
            const lastItem = wm.last_item_date ? getTimeAgo(new Date(wm.last_item_date)) : 'N/A';

            // Warn if sync is older than 2 hours
            const syncAge = wm.last_sync_at ? Date.now() - new Date(wm.last_sync_at).getTime() : Infinity;
            const icon = syncAge < 2 * 60 * 60 * 1000 ? OK : (syncAge < 12 * 60 * 60 * 1000 ? WARN : FAIL);

            console.log(`    ${icon} [${wm.source_type}/${wm.source_key}] último sync: ${lastSync} | último item: ${lastItem}`);

            if (syncAge >= 2 * 60 * 60 * 1000) {
                totalChecks++; warningChecks++;
            } else {
                totalChecks++; passedChecks++;
            }
        }
    }
}

// ─── Utilitários ───────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h atrás`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d atrás`;
}

// ─── MAIN ──────────────────────────────────────────────────────────

async function main() {
    console.log('\n' + '╔' + '═'.repeat(58) + '╗');
    console.log('║   VERIFICAÇÃO COMPLETA DOS FLUXOS DE MÍDIA              ║');
    console.log('║   Elege.AI War Room                                     ║');
    console.log('║   ' + new Date().toLocaleString('pt-BR') + '                              ║');
    console.log('╚' + '═'.repeat(58) + '╝');

    // 1. Check Supabase
    const connected = await checkSupabaseConnection();
    if (!connected) {
        console.log('\n❌ ABORTADO: Sem conexão com o banco de dados.\n');
        process.exit(1);
    }

    // 2. Check activations
    const activations = await checkActivations();

    // 3. Check flows
    await checkFlows();

    // 4. Check flow executions
    await checkFlowExecutions();

    // 5. Check feed per source type
    await checkFeedBySourceType(activations);

    // 6. Check channel activations
    await checkChannelActivations(activations);

    // 7. Check Elege.AI credentials
    const credentials = await checkElegeCredentials();

    // 8. Check API connectivity
    await checkElegeApiConnectivity(credentials);

    // 9. Check watermarks
    await checkSyncWatermarks(activations);

    // ─── RESUMO FINAL ─────────────────────────────────────────────
    console.log('\n' + '╔' + '═'.repeat(58) + '╗');
    console.log('║   RESUMO FINAL                                          ║');
    console.log('╚' + '═'.repeat(58) + '╝');

    console.log(`\n  Total de verificações: ${totalChecks}`);
    console.log(`  ${OK} OK:       ${passedChecks}`);
    console.log(`  ${WARN} Avisos:   ${warningChecks}`);
    console.log(`  ${FAIL} Falhas:   ${failedChecks}`);

    const healthPercent = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    let healthBar = '';
    const barLen = 30;
    const filledLen = Math.round(barLen * healthPercent / 100);
    healthBar = '█'.repeat(filledLen) + '░'.repeat(barLen - filledLen);

    console.log(`\n  Saúde geral: [${healthBar}] ${healthPercent}%`);

    if (failedChecks === 0 && warningChecks === 0) {
        console.log(`\n  🎉 TODOS OS FLUXOS OPERACIONAIS!\n`);
    } else if (failedChecks === 0) {
        console.log(`\n  ⚠️  Fluxos operacionais com ${warningChecks} aviso(s). Verifique os detalhes acima.\n`);
    } else {
        console.log(`\n  ❌ ${failedChecks} PROBLEMA(S) ENCONTRADO(S). Ação necessária!\n`);

        console.log('  Ações sugeridas:');
        console.log('  1. Se "Nenhum canal vinculado": Vincule canais à ativação via Configurações > Canais');
        console.log('  2. Se "Token não configurado": Configure o token em Configurações > Integrações > Elege.AI');
        console.log('  3. Se "Nenhum item no feed": Verifique se a ElegeSyncService está ativa (backend logs)');
        console.log('  4. Se "Execuções falhando": Verifique os erros e reinicie o worker se necessário');
        console.log('  5. Se "API inacessível": Verifique a URL base e a rede\n');
    }

    process.exit(failedChecks > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('\n❌ Erro fatal:', err);
    process.exit(1);
});
