/**
 * Flow Templates — Ready-made flows for common use cases.
 * 
 * Each template defines a complete flow graph (nodes + edges)
 * that can be instantiated as a new flow.
 * 
 * Available node types:
 * ─ trigger:   activation, schedule, webhook, http, database, twitter, brandwatch, buzzsumo
 * ─ action:    ai, httprequest, mediaoutlet, script, set, triggerflow, publish, message, loop, manus, perplexity, database
 * ─ condition: conditional, linkcheck, filter, delay
 */

export interface FlowTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'monitoring' | 'analysis' | 'automation' | 'crisis' | 'intelligence';
    nodes: any[];
    edges: any[];
}

export const TEMPLATE_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
    monitoring: { label: 'Monitoramento', icon: '📡', color: 'text-blue-400' },
    analysis: { label: 'Análise', icon: '🔬', color: 'text-purple-400' },
    automation: { label: 'Automação', icon: '⚙️', color: 'text-amber-400' },
    crisis: { label: 'Crise', icon: '🚨', color: 'text-red-400' },
    intelligence: { label: 'Inteligência', icon: '🔍', color: 'text-cyan-400' },
};

export const FLOW_TEMPLATES: FlowTemplate[] = [
    // ─────────────────────────────────────────────────────
    // 1. MONITORAMENTO DE PORTAIS (enhanced)
    // ─────────────────────────────────────────────────────
    {
        id: 'portal-monitoring',
        name: 'Monitoramento de Portais',
        description: 'Monitora portais de notícias, extrai conteúdo, identifica referências de pessoas e publica citações no feed automaticamente.',
        icon: '📺',
        category: 'monitoring',
        nodes: [
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
                    label: '📺 Consultar Portais',
                    iconType: 'mediaoutlet',
                    outletFilterMode: 'single',
                    outletTypes: ['portal'],
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
                    label: '🌐 Buscar Notícias do Portal',
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
                    label: '📰 Extrair Conteúdo da Notícia',
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
                    label: '🔍 Buscar Referências de Pessoas',
                    iconType: 'httprequest',
                    httpMethod: 'POST',
                    httpUrl: 'http://localhost:8001/references/find/sync',
                    httpBody: JSON.stringify({ url: '{loop-noticias.noticia.url}' }, null, 2),
                    httpHeaders: JSON.stringify({ 'Content-Type': 'application/json' }, null, 2),
                    color: '#f97316',
                },
            },
            {
                id: 'script-match',
                type: 'action',
                position: { x: 400, y: 1250 },
                data: {
                    label: '⚡ Filtrar Entidades Monitoradas',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `// Compare found people with monitored entities
const found = input['http-references']?.people_found || [];
const entities = input._activation?.monitored_entities || [];
const matches = found.filter(p => entities.some(e => 
  p.name.toLowerCase().includes(e.toLowerCase())
));
return { matches, hasMatches: matches.length > 0, matchCount: matches.length };`,
                    color: '#ef4444',
                },
            },
            {
                id: 'conditional-1',
                type: 'condition',
                position: { x: 400, y: 1400 },
                data: {
                    label: '🔀 Citação Encontrada?',
                    iconType: 'conditional',
                    conditionSource: 'script-match.hasMatches',
                    conditionOperator: 'equals',
                    conditionValue: 'true',
                    color: '#6366f1',
                },
            },
            {
                id: 'publish-1',
                type: 'action',
                position: { x: 400, y: 1550 },
                data: {
                    label: '✅ Publicar no Feed',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e-trigger-media', source: 'trigger-1', target: 'mediaoutlet-1', type: 'deletable' },
            { id: 'e-media-loop1', source: 'mediaoutlet-1', target: 'loop-portais', type: 'deletable' },
            { id: 'e-loop1-http1', source: 'loop-portais', target: 'http-news', type: 'deletable' },
            { id: 'e-http1-loop2', source: 'http-news', target: 'loop-noticias', type: 'deletable' },
            { id: 'e-loop2-linkcheck', source: 'loop-noticias', target: 'linkcheck-1', type: 'deletable' },
            { id: 'e-linkcheck-content', source: 'linkcheck-1', target: 'http-content', type: 'deletable', sourceHandle: 'new' },
            { id: 'e-content-refs', source: 'http-content', target: 'http-references', type: 'deletable' },
            { id: 'e-refs-script', source: 'http-references', target: 'script-match', type: 'deletable' },
            { id: 'e-script-cond', source: 'script-match', target: 'conditional-1', type: 'deletable' },
            { id: 'e-cond-publish', source: 'conditional-1', target: 'publish-1', type: 'deletable', sourceHandle: 'true' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 2. ANÁLISE DE CRISE
    // ─────────────────────────────────────────────────────
    {
        id: 'crisis-analysis',
        name: 'Análise de Crise',
        description: 'Recebe alertas de crise, analisa gravidade com IA, gera plano de resposta e notifica a equipe automaticamente.',
        icon: '🚨',
        category: 'crisis',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '🔔 Evento de Ativação',
                    iconType: 'activation',
                    triggerType: 'activation',
                    color: '#22c55e',
                },
            },
            {
                id: 'ai-severity',
                type: 'action',
                position: { x: 400, y: 200 },
                data: {
                    label: '🧠 Avaliar Gravidade',
                    iconType: 'ai',
                    aiPrompt: `Analise o seguinte evento e classifique sua gravidade de 1 a 10.
Identifique: tipo de crise, entidades envolvidas, potencial de escala, e recomendação imediata.
Retorne em formato estruturado.

Evento: {trigger-1.extractedText}`,
                    color: '#a855f7',
                },
            },
            {
                id: 'conditional-severity',
                type: 'condition',
                position: { x: 400, y: 370 },
                data: {
                    label: '🔀 Gravidade ≥ 7?',
                    iconType: 'conditional',
                    conditionSource: 'ai-severity.analysis',
                    conditionOperator: 'contains',
                    conditionValue: 'alta',
                    color: '#6366f1',
                },
            },
            {
                id: 'ai-plan',
                type: 'action',
                position: { x: 250, y: 530 },
                data: {
                    label: '📋 Gerar Plano de Resposta',
                    iconType: 'ai',
                    aiPrompt: `Com base na análise de gravidade abaixo, crie um plano de resposta detalhado com:
1. Ações imediatas (primeiras 2 horas)
2. Comunicação (mensagens-chave, porta-voz)
3. Monitoramento contínuo (métricas a acompanhar)
4. Cenário de escalada

Análise: {ai-severity.analysis}`,
                    color: '#a855f7',
                },
            },
            {
                id: 'message-team',
                type: 'action',
                position: { x: 550, y: 530 },
                data: {
                    label: '📨 Notificar Equipe',
                    iconType: 'message',
                    color: '#ec4899',
                },
            },
            {
                id: 'publish-crisis',
                type: 'action',
                position: { x: 400, y: 700 },
                data: {
                    label: '✅ Publicar Alerta no Feed',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e-trigger-ai', source: 'trigger-1', target: 'ai-severity', type: 'deletable' },
            { id: 'e-ai-cond', source: 'ai-severity', target: 'conditional-severity', type: 'deletable' },
            { id: 'e-cond-plan', source: 'conditional-severity', target: 'ai-plan', type: 'deletable', sourceHandle: 'true' },
            { id: 'e-cond-msg', source: 'conditional-severity', target: 'message-team', type: 'deletable', sourceHandle: 'true' },
            { id: 'e-plan-publish', source: 'ai-plan', target: 'publish-crisis', type: 'deletable' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 3. MONITORAMENTO TWITTER COMPLETO
    // ─────────────────────────────────────────────────────
    {
        id: 'twitter-full-analysis',
        name: 'Monitoramento Twitter Completo',
        description: 'Busca tweets recentes por palavras-chave, identifica menções em loop, valida relevância por entidades monitoradas, analisa cada tweet com IA e publica os relevantes no feed. Estrutura espelhada no fluxo de portais.',
        icon: '🐦',
        category: 'monitoring',
        nodes: [
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
                id: 'twitter-search',
                type: 'action',
                position: { x: 400, y: 200 },
                data: {
                    label: '🐦 Buscar Menções no Twitter',
                    iconType: 'twitter_search',
                    twitterOperation: 'search_recent',
                    twitterMaxResults: 50,
                    color: '#0ea5e9',
                },
            },
            {
                id: 'loop-tweets',
                type: 'action',
                position: { x: 400, y: 350 },
                data: {
                    label: '🔄 Loop: Para cada Tweet',
                    iconType: 'loop',
                    loopVariable: 'twitter-search.items',
                    loopAlias: 'tweet',
                    color: '#8b5cf6',
                },
            },
            {
                id: 'script-match',
                type: 'action',
                position: { x: 400, y: 500 },
                data: {
                    label: '⚡ Validar Relevância + Entidades',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `// Validate tweet relevance against monitored entities and keywords
const tweet = inputs['loop-tweets']?.tweet || {};
const text = (tweet.text || tweet.content || '').toLowerCase();
const author = (tweet.author_name || tweet.author_username || '').toLowerCase();
const entities = context.activation?.monitored_entities || context.activation?.people_of_interest || [];
const keywords = context.activation?.keywords || [];

// Entity and keyword matching
const allTerms = [...entities, ...keywords];
const matched = allTerms.filter(e => text.includes(e.toLowerCase()) || author.includes(e.toLowerCase()));

// Engagement metrics
const likes = tweet.likes || 0;
const retweets = tweet.retweets || 0;
const replies = tweet.replies || 0;
const engagement = likes + retweets * 2 + replies * 3;
const isHighEngagement = engagement >= 10 || tweet.author_followers >= 5000;

// Relevance: entity match OR high engagement
const isRelevant = matched.length > 0 || isHighEngagement;

result = {
  matched,
  matchCount: matched.length,
  isRelevant,
  engagement,
  isHighEngagement,
  tweetUrl: tweet.url || '',
  authorFollowers: tweet.author_followers || 0,
  summary: isRelevant
    ? '✅ Relevante: ' + matched.join(', ') + ' | Engajamento: ' + engagement
    : '❌ Descartado: sem match e baixo engajamento'
};`,
                    color: '#ef4444',
                },
            },
            {
                id: 'conditional-relevant',
                type: 'condition',
                position: { x: 400, y: 700 },
                data: {
                    label: '🔀 Tweet Relevante?',
                    iconType: 'conditional',
                    conditionSource: 'script-match.isRelevant',
                    conditionOperator: 'equals',
                    conditionValue: 'true',
                    color: '#6366f1',
                },
            },
            {
                id: 'ai-analysis',
                type: 'action',
                position: { x: 400, y: 900 },
                data: {
                    label: '🧠 Análise IA do Tweet',
                    iconType: 'ai',
                    aiPrompt: `Analise este tweet para monitoramento político em um War Room.

Tweet: {loop-tweets.tweet.text}
Autor: {loop-tweets.tweet.author_name} (@{loop-tweets.tweet.author_username})
Seguidores: {script-match.authorFollowers}
Engajamento: {script-match.engagement}
Entidades detectadas: {script-match.matched}

Classifique:
1. Sentimento (positivo/negativo/neutro)
2. Risk Score (0-100): 0-20=rotina, 21-40=baixo, 41-60=moderado, 61-80=significativo, 81-100=crise
3. Tema principal (max 3 palavras)
4. Resumo executivo (1 frase)
5. Se é viral ou tem potencial de viralização
6. Recomendação: monitorar / agir / ignorar

Responda em PT-BR como JSON.`,
                    color: '#a855f7',
                },
            },
            {
                id: 'conditional-critical',
                type: 'condition',
                position: { x: 400, y: 1100 },
                data: {
                    label: '🔀 Risk Score ≥ 60?',
                    iconType: 'conditional',
                    conditionSource: 'ai-analysis.risk_score',
                    conditionOperator: 'gte',
                    conditionValue: '60',
                    color: '#6366f1',
                },
            },
            {
                id: 'publish-feed',
                type: 'action',
                position: { x: 400, y: 1300 },
                data: {
                    label: '✅ Publicar no Feed',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
            {
                id: 'message-alert',
                type: 'action',
                position: { x: 650, y: 1300 },
                data: {
                    label: '🚨 Alerta de Tweet Crítico',
                    iconType: 'message',
                    color: '#ef4444',
                },
            },
        ],
        edges: [
            { id: 'e-trigger-twitter', source: 'trigger-1', target: 'twitter-search', type: 'deletable' },
            { id: 'e-twitter-loop', source: 'twitter-search', target: 'loop-tweets', type: 'deletable' },
            { id: 'e-loop-script', source: 'loop-tweets', target: 'script-match', type: 'deletable' },
            { id: 'e-script-cond', source: 'script-match', target: 'conditional-relevant', type: 'deletable' },
            { id: 'e-cond-ai', source: 'conditional-relevant', target: 'ai-analysis', type: 'deletable', sourceHandle: 'true' },
            { id: 'e-ai-cond2', source: 'ai-analysis', target: 'conditional-critical', type: 'deletable' },
            { id: 'e-cond2-publish', source: 'conditional-critical', target: 'publish-feed', type: 'deletable', sourceHandle: 'false' },
            { id: 'e-cond2-publish-critical', source: 'conditional-critical', target: 'publish-feed', type: 'deletable', sourceHandle: 'true' },
            { id: 'e-cond2-alert', source: 'conditional-critical', target: 'message-alert', type: 'deletable', sourceHandle: 'true' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 4. RELATÓRIO AGENDADO COM CONSOLIDAÇÃO
    // ─────────────────────────────────────────────────────
    {
        id: 'scheduled-report',
        name: 'Relatório Agendado',
        description: 'Executa diariamente, coleta dados de todas as fontes, consolida com Script e gera relatório via IA para publicação.',
        icon: '📊',
        category: 'automation',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '⏰ Cron Diário',
                    iconType: 'schedule',
                    triggerType: 'schedule',
                    scheduleExpression: '0 8 * * *',
                    color: '#94a3b8',
                },
            },
            {
                id: 'httprequest-data',
                type: 'action',
                position: { x: 400, y: 200 },
                data: {
                    label: '🌐 Buscar Dados do Dia',
                    iconType: 'httprequest',
                    httpMethod: 'GET',
                    httpUrl: 'http://localhost:8001/daily-summary',
                    color: '#f97316',
                },
            },
            {
                id: 'script-consolidate',
                type: 'action',
                position: { x: 400, y: 370 },
                data: {
                    label: '⚡ Consolidar Métricas',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `// Aggregate daily metrics
const data = input['httprequest-data']?.data || {};
const mentions = data.mentions || [];
const totalMentions = mentions.length;
const negative = mentions.filter(m => m.sentiment === 'negative').length;
const positive = mentions.filter(m => m.sentiment === 'positive').length;
const avgRisk = mentions.reduce((sum, m) => sum + (m.risk_score || 0), 0) / (totalMentions || 1);

return {
  totalMentions,
  negative,
  positive,
  neutral: totalMentions - negative - positive,
  avgRisk: Math.round(avgRisk),
  topEntities: [...new Set(mentions.flatMap(m => m.keywords || []))].slice(0, 10),
  summary: \`Total: \${totalMentions} menções | Pos: \${positive} | Neg: \${negative} | Risco médio: \${Math.round(avgRisk)}\`
};`,
                    color: '#ef4444',
                },
            },
            {
                id: 'ai-report',
                type: 'action',
                position: { x: 400, y: 540 },
                data: {
                    label: '🧠 Gerar Relatório',
                    iconType: 'ai',
                    aiPrompt: `Gere um relatório executivo diário de monitoramento com base nas métricas abaixo.
Inclua: resumo executivo, destaques positivos, pontos de atenção, recomendações.
Formato: profissional, conciso, adequado para gestores.

Métricas: {script-consolidate.summary}
Top Entidades: {script-consolidate.topEntities}
Sentimento Negativo: {script-consolidate.negative}
Risco Médio: {script-consolidate.avgRisk}`,
                    color: '#a855f7',
                },
            },
            {
                id: 'publish-report',
                type: 'action',
                position: { x: 400, y: 700 },
                data: {
                    label: '✅ Publicar Relatório',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e-trigger-http', source: 'trigger-1', target: 'httprequest-data', type: 'deletable' },
            { id: 'e-http-script', source: 'httprequest-data', target: 'script-consolidate', type: 'deletable' },
            { id: 'e-script-ai', source: 'script-consolidate', target: 'ai-report', type: 'deletable' },
            { id: 'e-ai-pub', source: 'ai-report', target: 'publish-report', type: 'deletable' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 5. ANÁLISE PROFUNDA DE DOCUMENTO (NEW)
    // ─────────────────────────────────────────────────────
    {
        id: 'deep-document-analysis',
        name: 'Análise Profunda de Documento',
        description: 'Upload de documento → análise IA multi-etapa → geração de plano de ação → publicação automática no feed.',
        icon: '🔍',
        category: 'intelligence',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '📎 Upload de Documento',
                    iconType: 'activation',
                    triggerType: 'activation',
                    color: '#22c55e',
                },
            },
            {
                id: 'set-context',
                type: 'action',
                position: { x: 400, y: 200 },
                data: {
                    label: '📦 Preparar Contexto',
                    iconType: 'set',
                    setVariables: JSON.stringify({
                        document: '{trigger-1.extractedText}',
                        filename: '{trigger-1.originalName}',
                        docType: '{trigger-1.fileType}',
                    }, null, 2),
                    color: '#f59e0b',
                },
            },
            {
                id: 'ai-analysis',
                type: 'action',
                position: { x: 400, y: 370 },
                data: {
                    label: '🧠 Análise do Documento',
                    iconType: 'ai',
                    aiPrompt: `Analise este documento em profundidade. Identifique:
1. Resumo executivo (max 3 parágrafos)
2. Entidades mencionadas (pessoas, organizações, locais)
3. Sentimento geral e tom
4. Fatos principais e dados numéricos
5. Riscos ou pontos de atenção
6. Classificação: notícia, documento oficial, relatório, denúncia, outro

Documento:
{set-context.document}`,
                    color: '#a855f7',
                },
            },
            {
                id: 'ai-action-plan',
                type: 'action',
                position: { x: 400, y: 540 },
                data: {
                    label: '📋 Gerar Plano de Ação',
                    iconType: 'ai',
                    aiPrompt: `Com base na análise abaixo, gere um plano de ação para a equipe de comunicação:
1. Ações imediatas recomendadas
2. Pontos a monitorar
3. Mensagens-chave sugeridas
4. Risco de escala (baixo/médio/alto)

Análise: {ai-analysis.analysis}`,
                    color: '#a855f7',
                },
            },
            {
                id: 'publish-analysis',
                type: 'action',
                position: { x: 400, y: 700 },
                data: {
                    label: '✅ Publicar Análise + Plano',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e-trigger-set', source: 'trigger-1', target: 'set-context', type: 'deletable' },
            { id: 'e-set-ai1', source: 'set-context', target: 'ai-analysis', type: 'deletable' },
            { id: 'e-ai1-ai2', source: 'ai-analysis', target: 'ai-action-plan', type: 'deletable' },
            { id: 'e-ai2-pub', source: 'ai-action-plan', target: 'publish-analysis', type: 'deletable' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 6. PIPELINE MULTI-SOURCE (NEW)
    // ─────────────────────────────────────────────────────
    {
        id: 'multi-source-pipeline',
        name: 'Pipeline Multi-Source',
        description: 'Varre múltiplos portais via MediaOutlet + HTTP, filtra por links novos e keywords com Script, analisa com IA e publica.',
        icon: '⚡',
        category: 'monitoring',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '🔔 Ativação',
                    iconType: 'activation',
                    triggerType: 'activation',
                    color: '#22c55e',
                },
            },
            {
                id: 'mediaoutlet-all',
                type: 'action',
                position: { x: 400, y: 200 },
                data: {
                    label: '📺 Todos os Veículos',
                    iconType: 'mediaoutlet',
                    outletFilterMode: 'all',
                    color: '#0ea5e9',
                },
            },
            {
                id: 'loop-outlets',
                type: 'action',
                position: { x: 400, y: 350 },
                data: {
                    label: '🔄 Loop: Cada Veículo',
                    iconType: 'loop',
                    loopVariable: 'mediaoutlet-all.items',
                    loopAlias: 'outlet',
                    color: '#8b5cf6',
                },
            },
            {
                id: 'http-fetch',
                type: 'action',
                position: { x: 400, y: 500 },
                data: {
                    label: '🌐 Buscar Conteúdo',
                    iconType: 'httprequest',
                    httpMethod: 'GET',
                    httpUrl: 'http://localhost:8001/news?url={loop-outlets.outlet.url}',
                    color: '#f97316',
                },
            },
            {
                id: 'loop-items',
                type: 'action',
                position: { x: 400, y: 650 },
                data: {
                    label: '🔄 Loop: Cada Item',
                    iconType: 'loop',
                    loopVariable: 'http-fetch.data',
                    loopAlias: 'item',
                    color: '#8b5cf6',
                },
            },
            {
                id: 'linkcheck-dedup',
                type: 'condition',
                position: { x: 400, y: 800 },
                data: {
                    label: '🔗 Link Já Visto?',
                    iconType: 'linkcheck',
                    urlVariable: 'loop-items.item.url',
                    color: '#14b8a6',
                },
            },
            {
                id: 'script-keyword',
                type: 'action',
                position: { x: 400, y: 950 },
                data: {
                    label: '⚡ Keyword Match',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `// Match keywords from activation entities
const title = (input['loop-items']?.item?.title || '').toLowerCase();
const content = (input['loop-items']?.item?.content || '').toLowerCase();
const entities = input._activation?.monitored_entities || [];
const full = title + ' ' + content;
const matched = entities.filter(e => full.includes(e.toLowerCase()));
return { matched, isRelevant: matched.length > 0 };`,
                    color: '#ef4444',
                },
            },
            {
                id: 'conditional-relevant',
                type: 'condition',
                position: { x: 400, y: 1100 },
                data: {
                    label: '🔀 Keywords Match?',
                    iconType: 'conditional',
                    conditionSource: 'script-keyword.isRelevant',
                    conditionOperator: 'equals',
                    conditionValue: 'true',
                    color: '#6366f1',
                },
            },
            {
                id: 'ai-classify',
                type: 'action',
                position: { x: 400, y: 1250 },
                data: {
                    label: '🧠 Classificar Menção',
                    iconType: 'ai',
                    aiPrompt: `Classifique esta menção:
Título: {loop-items.item.title}
Conteúdo: {loop-items.item.content}

Retorne: sentimento, risk_score (0-100), categoria, resumo de 2 linhas.`,
                    color: '#a855f7',
                },
            },
            {
                id: 'publish-feed',
                type: 'action',
                position: { x: 400, y: 1400 },
                data: {
                    label: '✅ Publicar no Feed',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'mediaoutlet-all', type: 'deletable' },
            { id: 'e2', source: 'mediaoutlet-all', target: 'loop-outlets', type: 'deletable' },
            { id: 'e3', source: 'loop-outlets', target: 'http-fetch', type: 'deletable' },
            { id: 'e4', source: 'http-fetch', target: 'loop-items', type: 'deletable' },
            { id: 'e5', source: 'loop-items', target: 'linkcheck-dedup', type: 'deletable' },
            { id: 'e6', source: 'linkcheck-dedup', target: 'script-keyword', type: 'deletable', sourceHandle: 'new' },
            { id: 'e7', source: 'script-keyword', target: 'conditional-relevant', type: 'deletable' },
            { id: 'e8', source: 'conditional-relevant', target: 'ai-classify', type: 'deletable', sourceHandle: 'true' },
            { id: 'e9', source: 'ai-classify', target: 'publish-feed', type: 'deletable' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 7. FLUXO ENCADEADO (NEW)
    // ─────────────────────────────────────────────────────
    {
        id: 'chained-flow',
        name: 'Fluxo Encadeado (Sub-flows)',
        description: 'Prepara dados com Set, aciona sub-fluxos especializados via TriggerFlow e consolida resultados no feed.',
        icon: '🔗',
        category: 'automation',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '🔔 Evento de Ativação',
                    iconType: 'activation',
                    triggerType: 'activation',
                    color: '#22c55e',
                },
            },
            {
                id: 'set-prepare',
                type: 'action',
                position: { x: 400, y: 200 },
                data: {
                    label: '📦 Preparar Payload',
                    iconType: 'set',
                    setVariables: JSON.stringify({
                        source: '{trigger-1.originalName}',
                        content: '{trigger-1.extractedText}',
                        timestamp: '{trigger-1.timestamp}',
                    }, null, 2),
                    color: '#f59e0b',
                },
            },
            {
                id: 'triggerflow-analysis',
                type: 'action',
                position: { x: 250, y: 370 },
                data: {
                    label: '🔗 Acionar: Análise de Crise',
                    iconType: 'triggerflow',
                    targetFlowId: '',
                    color: '#10b981',
                },
            },
            {
                id: 'triggerflow-report',
                type: 'action',
                position: { x: 550, y: 370 },
                data: {
                    label: '🔗 Acionar: Gerar Relatório',
                    iconType: 'triggerflow',
                    targetFlowId: '',
                    color: '#10b981',
                },
            },
            {
                id: 'delay-wait',
                type: 'condition',
                position: { x: 400, y: 530 },
                data: {
                    label: '⏳ Aguardar 30s',
                    iconType: 'delay',
                    delaySeconds: 30,
                    color: '#94a3b8',
                },
            },
            {
                id: 'publish-result',
                type: 'action',
                position: { x: 400, y: 680 },
                data: {
                    label: '✅ Publicar Resultado Final',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'set-prepare', type: 'deletable' },
            { id: 'e2', source: 'set-prepare', target: 'triggerflow-analysis', type: 'deletable' },
            { id: 'e3', source: 'set-prepare', target: 'triggerflow-report', type: 'deletable' },
            { id: 'e4', source: 'triggerflow-analysis', target: 'delay-wait', type: 'deletable' },
            { id: 'e5', source: 'triggerflow-report', target: 'delay-wait', type: 'deletable' },
            { id: 'e6', source: 'delay-wait', target: 'publish-result', type: 'deletable' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 8. WEBHOOK + ANÁLISE INTELIGENTE (NEW)
    // ─────────────────────────────────────────────────────
    {
        id: 'webhook-intelligence',
        name: 'Webhook + Análise Inteligente',
        description: 'Recebe dados via Webhook externo, normaliza com Set, analisa com IA, filtra por gravidade e publica alertas qualificados.',
        icon: '📋',
        category: 'intelligence',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '🔗 Webhook Externo',
                    iconType: 'webhook',
                    triggerType: 'webhook',
                    color: '#f59e0b',
                },
            },
            {
                id: 'set-normalize',
                type: 'action',
                position: { x: 400, y: 200 },
                data: {
                    label: '📦 Normalizar Payload',
                    iconType: 'set',
                    setVariables: JSON.stringify({
                        title: '{trigger-1.body.title}',
                        content: '{trigger-1.body.content}',
                        source: '{trigger-1.body.source}',
                        url: '{trigger-1.body.url}',
                    }, null, 2),
                    color: '#f59e0b',
                },
            },
            {
                id: 'ai-analyze',
                type: 'action',
                position: { x: 400, y: 370 },
                data: {
                    label: '🧠 Análise Completa',
                    iconType: 'ai',
                    aiPrompt: `Analise este conteúdo recebido via webhook:

Título: {set-normalize.title}
Fonte: {set-normalize.source}
Conteúdo: {set-normalize.content}

Determine:
1. Sentimento (positivo/negativo/neutro)
2. Risk Score (0-100)
3. Entidades mencionadas
4. Classificação temática
5. Resumo de 2 linhas
6. Recomendação: publicar (sim/não)`,
                    color: '#a855f7',
                },
            },
            {
                id: 'conditional-publish',
                type: 'condition',
                position: { x: 400, y: 540 },
                data: {
                    label: '🔀 Deve Publicar?',
                    iconType: 'conditional',
                    conditionSource: 'ai-analyze.analysis',
                    conditionOperator: 'contains',
                    conditionValue: 'sim',
                    color: '#6366f1',
                },
            },
            {
                id: 'publish-alert',
                type: 'action',
                position: { x: 250, y: 700 },
                data: {
                    label: '✅ Publicar Alerta',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
            {
                id: 'message-notify',
                type: 'action',
                position: { x: 550, y: 700 },
                data: {
                    label: '📨 Notificar Equipe',
                    iconType: 'message',
                    color: '#ec4899',
                },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'set-normalize', type: 'deletable' },
            { id: 'e2', source: 'set-normalize', target: 'ai-analyze', type: 'deletable' },
            { id: 'e3', source: 'ai-analyze', target: 'conditional-publish', type: 'deletable' },
            { id: 'e4', source: 'conditional-publish', target: 'publish-alert', type: 'deletable', sourceHandle: 'true' },
            { id: 'e5', source: 'conditional-publish', target: 'message-notify', type: 'deletable', sourceHandle: 'true' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 9. ANÁLISE DE VISIBILIDADE DIGITAL (SEMrush)
    // ─────────────────────────────────────────────────────
    {
        id: 'semrush-visibility-analysis',
        name: 'Análise de Visibilidade Digital (SEMrush)',
        description: 'Analisa domínio e keywords com SEMrush, compara com concorrente, cruza com backlinks e gera relatório estratégico de visibilidade digital.',
        icon: '📊',
        category: 'intelligence',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '🔔 Ativação',
                    iconType: 'activation',
                    triggerType: 'activation',
                    color: '#22c55e',
                },
            },
            {
                id: 'semrush-overview',
                type: 'action',
                position: { x: 250, y: 220 },
                data: {
                    label: '🌐 Visão Geral do Domínio',
                    iconType: 'semrush',
                    semrushOperation: 'domain_overview',
                    semrushDomain: '',
                    semrushDatabase: 'br',
                    color: '#f97316',
                },
            },
            {
                id: 'semrush-keywords',
                type: 'action',
                position: { x: 550, y: 220 },
                data: {
                    label: '🔑 Keywords Orgânicas',
                    iconType: 'semrush',
                    semrushOperation: 'domain_organic',
                    semrushDomain: '',
                    semrushDatabase: 'br',
                    semrushLimit: 30,
                    color: '#f97316',
                },
            },
            {
                id: 'semrush-backlinks',
                type: 'action',
                position: { x: 250, y: 400 },
                data: {
                    label: '🔗 Backlinks',
                    iconType: 'semrush',
                    semrushOperation: 'backlinks_overview',
                    semrushDomain: '',
                    color: '#f97316',
                },
            },
            {
                id: 'semrush-vs',
                type: 'action',
                position: { x: 550, y: 400 },
                data: {
                    label: '🆚 vs Concorrente',
                    iconType: 'semrush',
                    semrushOperation: 'domain_vs_domain',
                    semrushDomain: '',
                    semrushCompetitorDomain: '',
                    semrushDatabase: 'br',
                    color: '#f97316',
                },
            },
            {
                id: 'script-consolidate',
                type: 'action',
                position: { x: 400, y: 580 },
                data: {
                    label: '⚡ Consolidar Dados SEO',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `// Consolidate all SEMrush data into a single analysis object
const overview = input['semrush-overview'] || {};
const keywords = input['semrush-keywords'] || {};
const backlinks = input['semrush-backlinks'] || {};
const comparison = input['semrush-vs'] || {};

return {
  domain: overview.domain || 'N/A',
  rank: overview.rank || 'N/A',
  organic_keywords: overview.organic_keywords || 0,
  organic_traffic: overview.organic_traffic || 0,
  total_backlinks: backlinks.total_backlinks || 0,
  referring_domains: backlinks.referring_domains || 0,
  top_keywords: (keywords.items || []).slice(0, 10).map(k => k.keyword + ' (pos ' + k.position + ', ' + k.search_volume + ' buscas)').join('; '),
  competitor_comparison: comparison.summary || 'N/A',
  winner_traffic: comparison.winner_traffic || 'N/A',
  full_summary: \`Rank #\${overview.rank || '?'} | \${overview.organic_keywords || 0} keywords | \${overview.organic_traffic || 0} tráfego | \${backlinks.total_backlinks || 0} backlinks de \${backlinks.referring_domains || 0} domínios\`
};`,
                    color: '#ef4444',
                },
            },
            {
                id: 'ai-report',
                type: 'action',
                position: { x: 400, y: 760 },
                data: {
                    label: '🧠 Relatório de Visibilidade',
                    iconType: 'ai',
                    aiPrompt: `Você é um analista de inteligência digital político. Com base nos dados de SEO abaixo, gere um relatório estratégico de visibilidade digital.

DADOS COLETADOS:
- Domínio: {script-consolidate.domain}
- Posição Global: {script-consolidate.full_summary}
- Top Keywords: {script-consolidate.top_keywords}
- Comparativo: {script-consolidate.competitor_comparison}
- Vencedor em Tráfego: {script-consolidate.winner_traffic}

ESTRUTURA DO RELATÓRIO:
1. **Resumo Executivo** (3 linhas)
2. **Pontos Fortes** — Keywords e posições dominantes
3. **Vulnerabilidades** — Gaps de keywords, backlinks fracos
4. **Comparativo com Concorrente** — Quem domina o quê
5. **Recomendações Estratégicas** (top 5 ações)
6. **Score de Visibilidade Digital** (0-100)

Formato: profissional, objetivo, orientado a decisão.`,
                    color: '#a855f7',
                },
            },
            {
                id: 'publish-report',
                type: 'action',
                position: { x: 400, y: 940 },
                data: {
                    label: '✅ Publicar Relatório',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'semrush-overview', type: 'deletable' },
            { id: 'e2', source: 'trigger-1', target: 'semrush-keywords', type: 'deletable' },
            { id: 'e3', source: 'semrush-overview', target: 'semrush-backlinks', type: 'deletable' },
            { id: 'e4', source: 'semrush-keywords', target: 'semrush-vs', type: 'deletable' },
            { id: 'e5', source: 'semrush-backlinks', target: 'script-consolidate', type: 'deletable' },
            { id: 'e6', source: 'semrush-vs', target: 'script-consolidate', type: 'deletable' },
            { id: 'e7', source: 'script-consolidate', target: 'ai-report', type: 'deletable' },
            { id: 'e8', source: 'ai-report', target: 'publish-report', type: 'deletable' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 10. DOSSIÊ DIGITAL COMPLETO (Manus + SEMrush + BuzzSumo + Perplexity)
    // ─────────────────────────────────────────────────────
    {
        id: 'complete-digital-dossier',
        name: 'Dossiê Digital Completo',
        description: 'Gera dossiê completo de pessoa/entidade: investigação profunda via Manus, visibilidade digital via SEMrush, viralização via BuzzSumo, contexto via Perplexity. Consolida tudo em relatório IA com gate de crise.',
        icon: '🕵️',
        category: 'intelligence',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 500, y: 30 },
                data: { label: '🔔 Ativação', iconType: 'activation', triggerType: 'activation', color: '#22c55e' },
            },
            // ── BRANCH 1: Deep Investigation (Manus) ──
            {
                id: 'manus-dossier',
                type: 'action',
                position: { x: 100, y: 200 },
                data: {
                    label: '🧠 Dossiê Investigativo',
                    iconType: 'manus_agent',
                    manusAgentType: 'research',
                    manusTaskDescription: 'Gere dossiê completo sobre {trigger-1.people_of_interest.first}:\n1. Cargos políticos atuais e anteriores\n2. Processos judiciais (JusBrasil, TJSP, STF)\n3. Patrimônio declarado no TSE\n4. Doadores de campanha\n5. Empresas vinculadas (Receita Federal)\n6. Nomeações no Diário Oficial\n7. Votações polêmicas no Congresso',
                    manusTimeout: '30',
                    color: '#8b5cf6',
                },
            },
            // ── BRANCH 2: Digital Visibility (SEMrush) ──
            {
                id: 'semrush-visibility',
                type: 'action',
                position: { x: 400, y: 200 },
                data: { label: '🌐 Visibilidade SEO', iconType: 'semrush', semrushOperation: 'domain_overview', semrushDatabase: 'br', color: '#f97316' },
            },
            {
                id: 'semrush-keywords',
                type: 'action',
                position: { x: 400, y: 370 },
                data: { label: '🔑 Keywords Orgânicas', iconType: 'semrush', semrushOperation: 'domain_organic', semrushDatabase: 'br', semrushLimit: 30, color: '#f97316' },
            },
            // ── BRANCH 3: Viral Content (BuzzSumo) ──
            {
                id: 'buzzsumo-viral',
                type: 'action',
                position: { x: 700, y: 200 },
                data: { label: '🔥 Conteúdo Viral', iconType: 'buzzsumo', buzzsumoOperation: 'top_content', buzzsumoDays: 30, buzzsumoLimit: 20, color: '#f43f5e' },
            },
            {
                id: 'buzzsumo-influencers',
                type: 'action',
                position: { x: 700, y: 370 },
                data: { label: '⭐ Influenciadores', iconType: 'buzzsumo', buzzsumoOperation: 'influencers', buzzsumoLimit: 15, color: '#f43f5e' },
            },
            // ── BRANCH 4: Real-time Context (Perplexity) ──
            {
                id: 'perplexity-context',
                type: 'action',
                position: { x: 950, y: 200 },
                data: {
                    label: '🔮 Contexto Atual',
                    iconType: 'perplexity_search',
                    perplexityModel: 'sonar-pro',
                    perplexityQuery: 'Últimas notícias e controvérsias sobre {trigger-1.people_of_interest.first} nos últimos 7 dias. Inclua: posicionamentos políticos, declarações polêmicas, ações judiciais, e reações da mídia.',
                    perplexitySearchDomain: 'news',
                    color: '#14b8a6',
                },
            },
            // ── CONSOLIDATION ──
            {
                id: 'script-merge',
                type: 'action',
                position: { x: 500, y: 550 },
                data: {
                    label: '⚡ Consolidar Inteligência',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `const dossier = input['manus-dossier'] || {};
const seo = input['semrush-visibility'] || {};
const keywords = input['semrush-keywords'] || {};
const viral = input['buzzsumo-viral'] || {};
const influencers = input['buzzsumo-influencers'] || {};
const context = input['perplexity-context'] || {};

const riskScore = (dossier.result || '').toLowerCase().includes('processo') ? 80 :
                  (context.answer || '').toLowerCase().includes('escândalo') ? 70 : 30;

return {
  target: '{trigger-1.people_of_interest.first}',
  dossier_summary: (dossier.result || '').substring(0, 2000),
  seo_rank: seo.rank || 'N/A',
  organic_traffic: seo.organic_traffic || 0,
  top_keywords: (keywords.items || []).slice(0, 5).map(k => k.keyword).join(', '),
  viral_articles: viral.count || 0,
  total_shares: viral.total_shares || 0,
  influencer_count: influencers.count || 0,
  current_context: (context.answer || '').substring(0, 1500),
  sources: (context.sources || []).map(s => s.url).join('; '),
  risk_score: riskScore,
  is_crisis: riskScore >= 60,
  full_report: \`ALVO: \${'{trigger-1.people_of_interest.first}'}
SEO: Rank #\${seo.rank || '?'} | \${seo.organic_keywords || 0} keywords | \${seo.organic_traffic || 0} tráfego
VIRAL: \${viral.count || 0} artigos | \${(viral.total_shares || 0).toLocaleString()} shares
INFLUENCIADORES: \${influencers.count || 0} ativos
RISCO: \${riskScore}/100\`
};`,
                    color: '#ef4444',
                },
            },
            // ── AI REPORT ──
            {
                id: 'ai-dossier-report',
                type: 'action',
                position: { x: 500, y: 730 },
                data: {
                    label: '🧠 Relatório Estratégico',
                    iconType: 'ai',
                    aiPrompt: `Você é um analista sênior de inteligência política. Gere um DOSSIÊ ESTRATÉGICO completo baseado nos dados consolidados:

DADOS INVESTIGATIVOS (Manus):
{script-merge.dossier_summary}

VISIBILIDADE DIGITAL (SEMrush):
Rank: #{script-merge.seo_rank} | Tráfego: {script-merge.organic_traffic} | Keywords: {script-merge.top_keywords}

VIRALIZAÇÃO (BuzzSumo):
{script-merge.viral_articles} artigos virais | {script-merge.total_shares} shares | {script-merge.influencer_count} influenciadores

CONTEXTO ATUAL (Perplexity):
{script-merge.current_context}

Fontes: {script-merge.sources}

ESTRUTURA:
1. PERFIL EXECUTIVO (5 linhas)
2. MAPA DE PODER — Cargos, alianças, base eleitoral
3. VULNERABILIDADES JURÍDICAS — Processos, riscos legais
4. PRESENÇA DIGITAL — Forças e fraquezas online
5. NARRATIVAS ATIVAS — O que está sendo dito agora
6. INFLUENCIADORES-CHAVE — Amplificadores positivos e negativos
7. SCORE DE RISCO POLÍTICO (0-100) com justificativa
8. RECOMENDAÇÕES ESTRATÉGICAS (top 5 ações)

Score de Risco Calculado: {script-merge.risk_score}/100`,
                    color: '#a855f7',
                },
            },
            // ── CONDITIONAL: Crisis Gate ──
            {
                id: 'gate-crisis',
                type: 'action',
                position: { x: 500, y: 910 },
                data: {
                    label: '🚦 Gate de Crise',
                    iconType: 'conditional',
                    conditionField: 'script-merge.is_crisis',
                    conditionOperator: 'equals',
                    conditionValue: 'true',
                    color: '#eab308',
                },
            },
            {
                id: 'publish-report',
                type: 'action',
                position: { x: 300, y: 1080 },
                data: { label: '✅ Publicar Dossiê', iconType: 'publish', color: '#10b981' },
            },
            {
                id: 'message-crisis-alert',
                type: 'action',
                position: { x: 700, y: 1080 },
                data: { label: '🚨 Alerta de Crise', iconType: 'message', color: '#ef4444' },
            },
        ],
        edges: [
            // Trigger → 4 parallel branches
            { id: 'e1', source: 'trigger-1', target: 'manus-dossier', type: 'deletable' },
            { id: 'e2', source: 'trigger-1', target: 'semrush-visibility', type: 'deletable' },
            { id: 'e3', source: 'trigger-1', target: 'buzzsumo-viral', type: 'deletable' },
            { id: 'e4', source: 'trigger-1', target: 'perplexity-context', type: 'deletable' },
            // SEMrush cascade
            { id: 'e5', source: 'semrush-visibility', target: 'semrush-keywords', type: 'deletable' },
            // BuzzSumo cascade
            { id: 'e6', source: 'buzzsumo-viral', target: 'buzzsumo-influencers', type: 'deletable' },
            // All → consolidation
            { id: 'e7', source: 'manus-dossier', target: 'script-merge', type: 'deletable' },
            { id: 'e8', source: 'semrush-keywords', target: 'script-merge', type: 'deletable' },
            { id: 'e9', source: 'buzzsumo-influencers', target: 'script-merge', type: 'deletable' },
            { id: 'e10', source: 'perplexity-context', target: 'script-merge', type: 'deletable' },
            // Consolidation → AI → Gate
            { id: 'e11', source: 'script-merge', target: 'ai-dossier-report', type: 'deletable' },
            { id: 'e12', source: 'ai-dossier-report', target: 'gate-crisis', type: 'deletable' },
            // Gate → publish always, alert if crisis
            { id: 'e13', source: 'gate-crisis', target: 'publish-report', type: 'deletable', sourceHandle: 'false' },
            { id: 'e14', source: 'gate-crisis', target: 'publish-report', type: 'deletable', sourceHandle: 'true' },
            { id: 'e15', source: 'gate-crisis', target: 'message-crisis-alert', type: 'deletable', sourceHandle: 'true' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 11. MONITORAMENTO 360° MULTI-CANAL
    // ─────────────────────────────────────────────────────
    {
        id: 'monitoring-360-multi-channel',
        name: 'Monitoramento 360° Multi-Canal',
        description: 'Coleta simultânea de Twitter, Portais de Notícias, BuzzSumo e Perplexity. Consolida, analisa com IA, e distribui alertas por criticidade (alto→crise, médio→feed, baixo→log).',
        icon: '📡',
        category: 'monitoring',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 500, y: 30 },
                data: { label: '⏰ Agendamento (4h)', iconType: 'schedule', triggerType: 'schedule', color: '#3b82f6' },
            },
            // ── BRANCH A: Twitter ──
            {
                id: 'twitter-search',
                type: 'action',
                position: { x: 50, y: 200 },
                data: { label: '🐦 Twitter/X', iconType: 'twitter_search', twitterOperation: 'search_recent', twitterMaxResults: 50, color: '#0ea5e9' },
            },
            // ── BRANCH B: News Portals ──
            {
                id: 'news-fetch',
                type: 'action',
                position: { x: 300, y: 200 },
                data: { label: '📰 Portais de Notícias', iconType: 'httprequest', color: '#6366f1' },
            },
            {
                id: 'news-linkcheck',
                type: 'action',
                position: { x: 300, y: 370 },
                data: { label: '🔗 Verificar Links', iconType: 'linkcheck', color: '#6366f1' },
            },
            // ── BRANCH C: BuzzSumo Trending ──
            {
                id: 'buzzsumo-trending',
                type: 'action',
                position: { x: 550, y: 200 },
                data: { label: '🔥 Trending (BuzzSumo)', iconType: 'buzzsumo', buzzsumoOperation: 'trending_now', buzzsumoLimit: 20, color: '#f43f5e' },
            },
            // ── BRANCH D: Perplexity Briefing ──
            {
                id: 'perplexity-briefing',
                type: 'action',
                position: { x: 800, y: 200 },
                data: {
                    label: '🔮 Briefing Perplexity',
                    iconType: 'perplexity_search',
                    perplexityModel: 'sonar',
                    perplexityQuery: 'Resumo das últimas 4 horas: principais acontecimentos políticos no Brasil. Foque em: eleições, escândalos, votações no Congresso, declarações de líderes políticos.',
                    perplexitySearchDomain: 'news',
                    color: '#14b8a6',
                },
            },
            // ── CONSOLIDATION ──
            {
                id: 'script-360',
                type: 'action',
                position: { x: 400, y: 520 },
                data: {
                    label: '⚡ Consolidar 360°',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `const tweets = input['twitter-search'] || {};
const news = input['news-linkcheck'] || input['news-fetch'] || {};
const trending = input['buzzsumo-trending'] || {};
const briefing = input['perplexity-briefing'] || {};

const tweetCount = tweets.count || 0;
const newsCount = (news.items || []).length;
const trendingCount = trending.count || 0;
const totalItems = tweetCount + newsCount + trendingCount;

// Calculate criticality
const hasCrisisKeywords = [tweets.summary, trending.summary, briefing.answer]
  .join(' ').toLowerCase()
  .match(/(escândalo|crise|urgente|breaking|impeachment|preso|denúncia|renúncia)/);

const criticality = hasCrisisKeywords ? 'high' : totalItems > 50 ? 'medium' : 'low';

return {
  total_items: totalItems,
  tweet_count: tweetCount,
  news_count: newsCount,
  trending_count: trendingCount,
  briefing: (briefing.answer || '').substring(0, 1000),
  criticality,
  is_critical: criticality === 'high',
  is_medium: criticality === 'medium',
  summary: \`360°: \${tweetCount} tweets | \${newsCount} notícias | \${trendingCount} trending | Criticidade: \${criticality.toUpperCase()}\`
};`,
                    color: '#ef4444',
                },
            },
            // ── AI ANALYSIS ──
            {
                id: 'ai-360-analysis',
                type: 'action',
                position: { x: 400, y: 680 },
                data: {
                    label: '🧠 Análise Integrada',
                    iconType: 'ai',
                    aiPrompt: `Você é um analista de inteligência política em um War Room. Analise o seguinte panorama coletado nas últimas 4 horas:

DADOS:
- Tweets: {script-360.tweet_count} menções detectadas
- Portais: {script-360.news_count} notícias publicadas
- Trending: {script-360.trending_count} conteúdos em viralização
- Criticidade: {script-360.criticality}

BRIEFING PERPLEXITY:
{script-360.briefing}

Gere:
1. PANORAMA (3 frases)
2. TOP 3 TEMAS DOMINANTES
3. ALERTAS (se houver)
4. RECOMENDAÇÕES DE AÇÃO IMEDIATA`,
                    color: '#a855f7',
                },
            },
            // ── CRITICALITY GATE ──
            {
                id: 'gate-criticality',
                type: 'action',
                position: { x: 400, y: 850 },
                data: {
                    label: '🚦 Gate de Criticidade',
                    iconType: 'conditional',
                    conditionField: 'script-360.is_critical',
                    conditionOperator: 'equals',
                    conditionValue: 'true',
                    color: '#eab308',
                },
            },
            // ── HIGH: Crisis alert ──
            {
                id: 'message-urgent',
                type: 'action',
                position: { x: 150, y: 1020 },
                data: { label: '🚨 Alerta URGENTE', iconType: 'message', color: '#ef4444' },
            },
            // ── MEDIUM: Trigger crisis flow ──
            {
                id: 'trigger-crisis-flow',
                type: 'action',
                position: { x: 400, y: 1020 },
                data: { label: '🔄 Acionar Flow de Crise', iconType: 'triggerflow', color: '#f59e0b' },
            },
            // ── Always: Publish to feed ──
            {
                id: 'publish-360',
                type: 'action',
                position: { x: 650, y: 1020 },
                data: { label: '✅ Publicar no Feed', iconType: 'publish', color: '#10b981' },
            },
        ],
        edges: [
            // Trigger → 4 channels
            { id: 'e1', source: 'trigger-1', target: 'twitter-search', type: 'deletable' },
            { id: 'e2', source: 'trigger-1', target: 'news-fetch', type: 'deletable' },
            { id: 'e3', source: 'trigger-1', target: 'buzzsumo-trending', type: 'deletable' },
            { id: 'e4', source: 'trigger-1', target: 'perplexity-briefing', type: 'deletable' },
            // News → linkcheck
            { id: 'e5', source: 'news-fetch', target: 'news-linkcheck', type: 'deletable' },
            // All → consolidation
            { id: 'e6', source: 'twitter-search', target: 'script-360', type: 'deletable' },
            { id: 'e7', source: 'news-linkcheck', target: 'script-360', type: 'deletable' },
            { id: 'e8', source: 'buzzsumo-trending', target: 'script-360', type: 'deletable' },
            { id: 'e9', source: 'perplexity-briefing', target: 'script-360', type: 'deletable' },
            // Analysis chain
            { id: 'e10', source: 'script-360', target: 'ai-360-analysis', type: 'deletable' },
            { id: 'e11', source: 'ai-360-analysis', target: 'gate-criticality', type: 'deletable' },
            // Critical → alert + crisis
            { id: 'e12', source: 'gate-criticality', target: 'message-urgent', type: 'deletable', sourceHandle: 'true' },
            { id: 'e13', source: 'gate-criticality', target: 'trigger-crisis-flow', type: 'deletable', sourceHandle: 'true' },
            // Always → publish
            { id: 'e14', source: 'gate-criticality', target: 'publish-360', type: 'deletable', sourceHandle: 'true' },
            { id: 'e15', source: 'gate-criticality', target: 'publish-360', type: 'deletable', sourceHandle: 'false' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 12. WAR ROOM DE CRISE AUTOMATIZADO
    // ─────────────────────────────────────────────────────
    {
        id: 'automated-crisis-war-room',
        name: 'War Room de Crise Automatizado',
        description: 'Protocolo completo de resposta a crise: fact-check via Perplexity, pesquisa de precedentes via Manus, monitoramento de viralização via BuzzSumo, geração de plano de crise com IA, notificação multi-canal.',
        icon: '🚨',
        category: 'crisis',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 500, y: 30 },
                data: { label: '🔔 Ativação de Crise', iconType: 'activation', triggerType: 'activation', color: '#ef4444' },
            },
            // ── PARALLEL PHASE 1: Intelligence Gathering ──
            {
                id: 'perplexity-factcheck',
                type: 'action',
                position: { x: 100, y: 220 },
                data: {
                    label: '🔮 Fact-Check',
                    iconType: 'perplexity_search',
                    perplexityModel: 'sonar-reasoning',
                    perplexityQuery: 'Verifique a veracidade: {trigger-1.analysis_instructions}. Analise múltiplas fontes e indique se é VERDADEIRO, FALSO, PARCIALMENTE VERDADEIRO ou NÃO VERIFICÁVEL. Cite fontes.',
                    perplexitySearchDomain: 'news',
                    color: '#14b8a6',
                },
            },
            {
                id: 'manus-precedents',
                type: 'action',
                position: { x: 400, y: 220 },
                data: {
                    label: '🧠 Precedentes',
                    iconType: 'manus_agent',
                    manusAgentType: 'research',
                    manusTaskDescription: 'Pesquise casos similares a: {trigger-1.analysis_instructions}.\n\nPara cada caso encontrado, documente:\n1. O que aconteceu\n2. Como o envolvido respondeu\n3. Timeline de repercussão (quanto tempo durou)\n4. Resultado final (superou ou não)\n5. O que funcionou e o que não funcionou na resposta\n\nListe pelo menos 3 precedentes relevantes.',
                    manusTimeout: '15',
                    color: '#8b5cf6',
                },
            },
            {
                id: 'buzzsumo-viralization',
                type: 'action',
                position: { x: 700, y: 220 },
                data: {
                    label: '🔥 Medir Viralização',
                    iconType: 'buzzsumo',
                    buzzsumoOperation: 'content_analysis',
                    buzzsumoDays: 3,
                    color: '#f43f5e',
                },
            },
            {
                id: 'twitter-pulse',
                type: 'action',
                position: { x: 950, y: 220 },
                data: {
                    label: '🐦 Pulso Twitter',
                    iconType: 'twitter_search',
                    twitterOperation: 'search_recent',
                    twitterMaxResults: 100,
                    color: '#0ea5e9',
                },
            },
            // ── CONSOLIDATION ──
            {
                id: 'script-crisis-intel',
                type: 'action',
                position: { x: 500, y: 430 },
                data: {
                    label: '⚡ Intel de Crise',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `const factcheck = input['perplexity-factcheck'] || {};
const precedents = input['manus-precedents'] || {};
const viral = input['buzzsumo-viralization'] || {};
const twitter = input['twitter-pulse'] || {};

const isVerified = (factcheck.answer || '').toLowerCase().includes('verdadeiro');
const viralScore = viral.total_shares || 0;
const tweetVolume = twitter.count || 0;
const severity = tweetVolume > 500 ? 'CRÍTICA' : tweetVolume > 100 ? 'ALTA' : 'MODERADA';

return {
  fact_check_result: factcheck.answer || 'Não verificado',
  fact_check_sources: (factcheck.sources || []).map(s => s.url).join('; '),
  is_verified: isVerified,
  precedents_analysis: (precedents.result || '').substring(0, 3000),
  viral_score: viralScore,
  tweet_volume: tweetVolume,
  severity,
  needs_immediate_response: severity === 'CRÍTICA',
  summary: \`Crise \${severity} | Fact-check: \${isVerified ? '✅ Verificado' : '❌ Falso/Duvidoso'} | \${tweetVolume} tweets | \${viralScore} shares\`
};`,
                    color: '#ef4444',
                },
            },
            // ── AI: Generate Crisis Plan ──
            {
                id: 'ai-crisis-plan',
                type: 'action',
                position: { x: 500, y: 610 },
                data: {
                    label: '🧠 Plano de Crise',
                    iconType: 'ai',
                    aiPrompt: `Você é um especialista em gestão de crises políticas. Gere um PLANO DE RESPOSTA À CRISE:

CRISE: {trigger-1.analysis_instructions}
SEVERIDADE: {script-crisis-intel.severity}

FACT-CHECK:
{script-crisis-intel.fact_check_result}
Fontes: {script-crisis-intel.fact_check_sources}

PRECEDENTES HISTÓRICOS:
{script-crisis-intel.precedents_analysis}

VIRALIZAÇÃO: {script-crisis-intel.viral_score} shares | {script-crisis-intel.tweet_volume} tweets

PLANO:
1. AVALIAÇÃO DE DANO (gravidade 1-10, justificativa)
2. RESPOSTA IMEDIATA (primeiras 2 horas)
3. NARRATIVE FRAMEWORK — Qual mensagem adotar
4. TALKING POINTS — 5 pontos para porta-voz
5. CANAIS DE RESPOSTA — Onde e como responder
6. TIMELINE DE RECUPERAÇÃO — Estimativa de dias
7. RISCOS DE ESCALAÇÃO — O que pode piorar
8. PLANO B — Se a crise escalar

Baseie nos PRECEDENTES encontrados. Seja direto e acionável.`,
                    color: '#a855f7',
                },
            },
            // ── SEVERITY GATE ──
            {
                id: 'gate-severity',
                type: 'action',
                position: { x: 500, y: 790 },
                data: {
                    label: '🚦 Gate de Severidade',
                    iconType: 'conditional',
                    conditionField: 'script-crisis-intel.needs_immediate_response',
                    conditionOperator: 'equals',
                    conditionValue: 'true',
                    color: '#eab308',
                },
            },
            // ── CRITICAL: Multi-channel alert ──
            {
                id: 'message-war-room',
                type: 'action',
                position: { x: 200, y: 960 },
                data: { label: '🚨 Alerta War Room', iconType: 'message', color: '#ef4444' },
            },
            {
                id: 'publish-crisis',
                type: 'action',
                position: { x: 500, y: 960 },
                data: { label: '📋 Publicar Plano', iconType: 'publish', color: '#10b981' },
            },
            // ── NON-CRITICAL: Just publish ──
            {
                id: 'publish-monitor',
                type: 'action',
                position: { x: 800, y: 960 },
                data: { label: '📊 Registrar Monitoramento', iconType: 'publish', color: '#6366f1' },
            },
        ],
        edges: [
            // Trigger → 4 parallel intel branches
            { id: 'e1', source: 'trigger-1', target: 'perplexity-factcheck', type: 'deletable' },
            { id: 'e2', source: 'trigger-1', target: 'manus-precedents', type: 'deletable' },
            { id: 'e3', source: 'trigger-1', target: 'buzzsumo-viralization', type: 'deletable' },
            { id: 'e4', source: 'trigger-1', target: 'twitter-pulse', type: 'deletable' },
            // All → consolidation
            { id: 'e5', source: 'perplexity-factcheck', target: 'script-crisis-intel', type: 'deletable' },
            { id: 'e6', source: 'manus-precedents', target: 'script-crisis-intel', type: 'deletable' },
            { id: 'e7', source: 'buzzsumo-viralization', target: 'script-crisis-intel', type: 'deletable' },
            { id: 'e8', source: 'twitter-pulse', target: 'script-crisis-intel', type: 'deletable' },
            // Analysis chain
            { id: 'e9', source: 'script-crisis-intel', target: 'ai-crisis-plan', type: 'deletable' },
            { id: 'e10', source: 'ai-crisis-plan', target: 'gate-severity', type: 'deletable' },
            // Critical → war room alert + publish plan
            { id: 'e11', source: 'gate-severity', target: 'message-war-room', type: 'deletable', sourceHandle: 'true' },
            { id: 'e12', source: 'gate-severity', target: 'publish-crisis', type: 'deletable', sourceHandle: 'true' },
            // Non-critical → just log
            { id: 'e13', source: 'gate-severity', target: 'publish-monitor', type: 'deletable', sourceHandle: 'false' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // 13. INTELIGÊNCIA COMPETITIVA ELEITORAL
    // ─────────────────────────────────────────────────────
    {
        id: 'electoral-competitive-intelligence',
        name: 'Inteligência Competitiva Eleitoral',
        description: 'Compara dois candidatos em todas as dimensões: visibilidade digital (SEMrush), viralização (BuzzSumo), presença social (Twitter), e gera análise competitiva com gap analysis e recomendações.',
        icon: '⚔️',
        category: 'intelligence',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 450, y: 30 },
                data: { label: '⏰ Semanal', iconType: 'schedule', triggerType: 'schedule', color: '#3b82f6' },
            },
            // ── CANDIDATE A (left column) ──
            {
                id: 'semrush-a',
                type: 'action',
                position: { x: 100, y: 200 },
                data: { label: '🌐 SEO Candidato A', iconType: 'semrush', semrushOperation: 'domain_overview', semrushDatabase: 'br', color: '#f97316' },
            },
            {
                id: 'buzzsumo-a',
                type: 'action',
                position: { x: 100, y: 370 },
                data: { label: '🔥 Viral Candidato A', iconType: 'buzzsumo', buzzsumoOperation: 'content_analysis', buzzsumoDays: 7, color: '#f43f5e' },
            },
            {
                id: 'twitter-a',
                type: 'action',
                position: { x: 100, y: 540 },
                data: { label: '🐦 Twitter Candidato A', iconType: 'twitter_search', twitterOperation: 'search_recent', twitterMaxResults: 100, color: '#0ea5e9' },
            },
            // ── CANDIDATE B (right column) ──
            {
                id: 'semrush-b',
                type: 'action',
                position: { x: 700, y: 200 },
                data: { label: '🌐 SEO Candidato B', iconType: 'semrush', semrushOperation: 'domain_overview', semrushDatabase: 'br', color: '#f97316' },
            },
            {
                id: 'buzzsumo-b',
                type: 'action',
                position: { x: 700, y: 370 },
                data: { label: '🔥 Viral Candidato B', iconType: 'buzzsumo', buzzsumoOperation: 'content_analysis', buzzsumoDays: 7, color: '#f43f5e' },
            },
            {
                id: 'twitter-b',
                type: 'action',
                position: { x: 700, y: 540 },
                data: { label: '🐦 Twitter Candidato B', iconType: 'twitter_search', twitterOperation: 'search_recent', twitterMaxResults: 100, color: '#0ea5e9' },
            },
            // ── COMPETITIVE GAP ANALYSIS ──
            {
                id: 'script-gap',
                type: 'action',
                position: { x: 400, y: 700 },
                data: {
                    label: '⚡ Gap Analysis',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `const seoA = input['semrush-a'] || {};
const seoB = input['semrush-b'] || {};
const viralA = input['buzzsumo-a'] || {};
const viralB = input['buzzsumo-b'] || {};
const twA = input['twitter-a'] || {};
const twB = input['twitter-b'] || {};

const scoreA = ((seoA.organic_traffic || 0) * 0.3) + ((viralA.total_shares || 0) * 0.001 * 0.3) + ((twA.count || 0) * 0.4);
const scoreB = ((seoB.organic_traffic || 0) * 0.3) + ((viralB.total_shares || 0) * 0.001 * 0.3) + ((twB.count || 0) * 0.4);

return {
  candidate_a: { seo_rank: seoA.rank, traffic: seoA.organic_traffic, keywords: seoA.organic_keywords, viral_shares: viralA.total_shares, viral_articles: viralA.total_articles, tweets: twA.count, score: Math.round(scoreA) },
  candidate_b: { seo_rank: seoB.rank, traffic: seoB.organic_traffic, keywords: seoB.organic_keywords, viral_shares: viralB.total_shares, viral_articles: viralB.total_articles, tweets: twB.count, score: Math.round(scoreB) },
  leader: scoreA > scoreB ? 'Candidato A' : 'Candidato B',
  gap_pct: Math.round(Math.abs(scoreA - scoreB) / Math.max(scoreA, scoreB, 1) * 100),
  seo_winner: (seoA.organic_traffic || 0) > (seoB.organic_traffic || 0) ? 'A' : 'B',
  viral_winner: (viralA.total_shares || 0) > (viralB.total_shares || 0) ? 'A' : 'B',
  social_winner: (twA.count || 0) > (twB.count || 0) ? 'A' : 'B',
  summary: \`Score: A=\${Math.round(scoreA)} vs B=\${Math.round(scoreB)} | Líder: \${scoreA > scoreB ? 'A' : 'B'} por \${Math.round(Math.abs(scoreA - scoreB) / Math.max(scoreA, scoreB, 1) * 100)}%\`
};`,
                    color: '#ef4444',
                },
            },
            // ── AI STRATEGIC REPORT ──
            {
                id: 'ai-competitive',
                type: 'action',
                position: { x: 400, y: 870 },
                data: {
                    label: '🧠 Relatório Competitivo',
                    iconType: 'ai',
                    aiPrompt: `Você é um estrategista político sênior. Gere um RELATÓRIO DE INTELIGÊNCIA COMPETITIVA:

CANDIDATO A:
- SEO: Rank #{script-gap.candidate_a.seo_rank} | Tráfego: {script-gap.candidate_a.traffic} | {script-gap.candidate_a.keywords} keywords
- Viralização: {script-gap.candidate_a.viral_shares} shares em {script-gap.candidate_a.viral_articles} artigos
- Twitter: {script-gap.candidate_a.tweets} menções

CANDIDATO B:
- SEO: Rank #{script-gap.candidate_b.seo_rank} | Tráfego: {script-gap.candidate_b.traffic} | {script-gap.candidate_b.keywords} keywords
- Viralização: {script-gap.candidate_b.viral_shares} shares em {script-gap.candidate_b.viral_articles} artigos
- Twitter: {script-gap.candidate_b.tweets} menções

LÍDER: {script-gap.leader} por {script-gap.gap_pct}%
SEO: Vencedor {script-gap.seo_winner} | Viral: Vencedor {script-gap.viral_winner} | Social: Vencedor {script-gap.social_winner}

RELATÓRIO:
1. SNAPSHOT COMPETITIVO (tabela comparativa)
2. QUEM DOMINA O QUÊ — Por dimensão
3. GAPS EXPLORÁVEIS — Where to attack
4. AMEAÇAS — Onde estamos perdendo
5. PLANO DE AÇÃO (top 5 recomendações)
6. PROJEÇÃO — Tendência para próxima semana`,
                    color: '#a855f7',
                },
            },
            {
                id: 'publish-competitive',
                type: 'action',
                position: { x: 250, y: 1040 },
                data: { label: '✅ Publicar Relatório', iconType: 'publish', color: '#10b981' },
            },
            {
                id: 'message-team',
                type: 'action',
                position: { x: 550, y: 1040 },
                data: { label: '📨 Enviar à Equipe', iconType: 'message', color: '#ec4899' },
            },
        ],
        edges: [
            // Trigger → A and B in parallel
            { id: 'e1', source: 'trigger-1', target: 'semrush-a', type: 'deletable' },
            { id: 'e2', source: 'trigger-1', target: 'semrush-b', type: 'deletable' },
            // A cascade
            { id: 'e3', source: 'semrush-a', target: 'buzzsumo-a', type: 'deletable' },
            { id: 'e4', source: 'buzzsumo-a', target: 'twitter-a', type: 'deletable' },
            // B cascade
            { id: 'e5', source: 'semrush-b', target: 'buzzsumo-b', type: 'deletable' },
            { id: 'e6', source: 'buzzsumo-b', target: 'twitter-b', type: 'deletable' },
            // Both → gap analysis
            { id: 'e7', source: 'twitter-a', target: 'script-gap', type: 'deletable' },
            { id: 'e8', source: 'twitter-b', target: 'script-gap', type: 'deletable' },
            // Analysis → report → distribute
            { id: 'e9', source: 'script-gap', target: 'ai-competitive', type: 'deletable' },
            { id: 'e10', source: 'ai-competitive', target: 'publish-competitive', type: 'deletable' },
            { id: 'e11', source: 'ai-competitive', target: 'message-team', type: 'deletable' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // ELEGE.AI - MONITORAMENTO TV / RÁDIO
    // ─────────────────────────────────────────────────────
    {
        id: 'elegeai-tv-radio',
        name: 'Elege.AI — TVs / Rádios (Análise de IA Interna)',
        description: 'Consulta a API do Elege.AI para buscar menções em TVs e Rádios, e processa com a IA Interna do War Room.',
        icon: '📡',
        category: 'monitoring',
        nodes: [
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
                id: 'http-elege',
                type: 'action',
                position: { x: 400, y: 220 },
                data: {
                    label: '📡 Buscar Menções Elege.AI',
                    iconType: 'httprequest',
                    httpMethod: 'GET',
                    url: '{trigger-1.elege_base_url}/api/analytics/mentions/latest?period=today&limit=100',
                    httpHeaders: '{"Authorization": "Bearer {trigger-1.elege_api_token}"}',
                    color: '#0ea5e9',
                    timeout: 60,
                },
            },
            {
                id: 'loop-mentions',
                type: 'action',
                position: { x: 400, y: 400 },
                data: {
                    label: '🔄 Loop: Para cada Menção',
                    iconType: 'loop',
                    loopVariable: 'http-elege.response_mentions',
                    loopAlias: 'mencao',
                    color: '#8b5cf6',
                },
            },
            {
                id: 'script-map',
                type: 'action',
                position: { x: 400, y: 580 },
                data: {
                    label: '⚡ Mapear Elege → Feed',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `// Mapeia menção do Elege.AI para formato intelligence_feed
const mention = inputs['loop-mentions']?.mencao || {};
const post = mention.post || {};
const channel = post.channel || {};
const person = mention.person || {};

// Título: preferir post.title, fallback para subject da menção
const title = post.title || mention.subject || 'Menção em ' + (channel.title || 'mídia');

// Determinar source type baseado no channel kind
// kind: 0=portal, 1=tv, 2=radio, 3=impresso, 4=digital, 5=social
const kindLabel = { 0: 'Portal', 1: 'TV', 2: 'Rádio', 3: 'Impresso', 4: 'Digital', 5: 'Social' };
const sourceLabel = kindLabel[channel.kind] || 'Portal';

// Mapear sentimento (Elege usa int: 0=neutral, 1=positive, 2=negative)
const sentimentMap = { 0: 'neutral', 1: 'positive', 2: 'negative' };

// Entities consolidadas (Pessoas/Organizações citadas + Autor)
let entities = [];
if (person.name) entities.push(person.name);
if (Array.isArray(mention.entities)) {
    entities = [...new Set([...entities, ...mention.entities.map(e => e.name || e)])];
}

// Engagement
const likes = post.like_count || 0;
const comments = post.comment_count || 0;
const reposts = post.repost_count || 0;
const shares = post.share_count || 0;

log('Menção: ' + title.substring(0, 80));
log('Canal: ' + (channel.title || '?') + ' (' + sourceLabel + ')');
log('Pessoa: ' + (person.name || 'não identificada'));

result = {
    title,
    summary: post.summary || post.content?.substring(0, 500) || mention.subject || '',
    content: post.content || '',
    url: post.url || '',
    source: channel.title || sourceLabel,
    source_name: channel.title || null,
    source_type: channel.kind === 1 ? 'tv' : channel.kind === 2 ? 'radio' : channel.kind === 5 ? 'social_media' : 'portal',
    content_type_detected: sourceLabel.toLowerCase(),
    portal_name: channel.title,
    portal_type: sourceLabel.toLowerCase(),
    published_at: post.published_at || mention.created_at || new Date().toISOString(),
    sentiment: sentimentMap[mention.sentiment] || mention.sentiment_label || 'neutral',
    risk_score: mention.risk_score || mention.relevance || 0,
    keywords: mention.extracted_keywords || [],
    entities: entities,
    detected_entities: entities,
    engagement: { likes, comments, reposts, shares },
    elege_mention_id: mention.id,
    elege_post_id: post.id,
    elege_channel_id: channel.id,
};`,
                    color: '#ef4444',
                },
            },
            {
                id: 'publish-feed',
                type: 'action',
                position: { x: 400, y: 780 },
                data: {
                    label: '✅ Publicar no Feed',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e-trigger-http', source: 'trigger-1', target: 'http-elege', type: 'deletable' },
            { id: 'e-http-loop', source: 'http-elege', target: 'loop-mentions', type: 'deletable' },
            { id: 'e-loop-script', source: 'loop-mentions', target: 'script-map', type: 'deletable' },
            { id: 'e-script-publish', source: 'script-map', target: 'publish-feed', type: 'deletable' },
        ],
    },
    // ─────────────────────────────────────────────────────
    // ELEGE.AI - INGESTÃO DIRETA (PRÉ-TRATADO)
    // ─────────────────────────────────────────────────────
    {
        id: 'elegeai-direct-ingestion',
        name: 'Elege.AI — Ingestão Direta (Pré-Tratado)',
        description: 'Fluxo ultrarrápido: consome menções pré-tratadas pelo Elege.AI (risco, sentimento e entidades já analisados) e insere direto no Feed.',
        icon: '⚡',
        category: 'monitoring',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '🔔 Cron (15 Minutos)',
                    iconType: 'cron',
                    triggerType: 'cron_15m',
                    color: '#22c55e',
                },
            },
            {
                id: 'http-elege',
                type: 'action',
                position: { x: 400, y: 220 },
                data: {
                    label: '📡 GET Latest Elege.AI',
                    iconType: 'httprequest',
                    httpMethod: 'GET',
                    url: '{trigger-1.elege_base_url}/api/analytics/mentions/latest?period=today&limit=50',
                    httpHeaders: '{"Authorization": "Bearer {trigger-1.elege_api_token}"}',
                    color: '#0ea5e9',
                    timeout: 60,
                },
            },
            {
                id: 'loop-mentions',
                type: 'action',
                position: { x: 400, y: 400 },
                data: {
                    label: '🔄 Para cada Menção',
                    iconType: 'loop',
                    loopVariable: 'http-elege.response_mentions',
                    loopAlias: 'mencao',
                    color: '#8b5cf6',
                },
            },
            {
                id: 'script-direct-map',
                type: 'action',
                position: { x: 400, y: 580 },
                data: {
                    label: '⚡ Fast Mapping -> Feed',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `// Mapeamento Direto pass-through (sem IA do War Room)
const mention = inputs['loop-mentions']?.mencao || {};
const post = mention.post || {};
const channel = post.channel || {};
const person = mention.person || {};

const title = post.title || mention.subject || 'Menção Monitorada';
const kindLabel = { 0: 'Portal', 1: 'TV', 2: 'Rádio', 3: 'Impresso', 4: 'Digital', 5: 'Social' };
const sourceLabel = kindLabel[channel.kind] || 'Elege.AI';

// Sentimento padrão do Elege
const sentimentMap = { 0: 'neutral', 1: 'positive', 2: 'negative' };

// Entities consolidadas (Elege já pode mandar em mention.entities ou extraímos das pessoas)
let entities = [];
if (person.name) entities.push(person.name);
if (Array.isArray(mention.entities)) {
    entities = [...new Set([...entities, ...mention.entities.map(e => e.name || e)])];
}

result = {
    title,
    summary: post.summary || post.content?.substring(0, 500) || mention.subject || '',
    content: post.content || '',
    url: post.url || '',
    source: channel.title || sourceLabel,
    source_name: channel.title || null,
    source_type: sourceLabel.toLowerCase(),
    content_type_detected: sourceLabel.toLowerCase(),
    portal_name: channel.title,
    published_at: post.published_at || mention.created_at || new Date().toISOString(),
    
    // Ingestão direta dos campos de inteligência do Elege
    sentiment: sentimentMap[mention.sentiment] || mention.sentiment_label || 'neutral',
    risk_score: mention.risk_score || mention.relevance || 0,
    keywords: mention.extracted_keywords || [],
    entities: entities,
    detected_entities: entities,
    
    // Engagement base
    engagement: { 
        likes: post.like_count || 0, 
        comments: post.comment_count || 0, 
        reposts: post.repost_count || 0, 
        shares: post.share_count || 0 
    },
    
    // Rastreabilidade Externa
    elege_mention_id: mention.id,
    elege_post_id: post?.id,
};`,
                    color: '#ef4444',
                },
            },
            {
                id: 'publish-feed',
                type: 'action',
                position: { x: 400, y: 780 },
                data: {
                    label: '🚀 Inserir no War Room',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e-trigger-http', source: 'trigger-1', target: 'http-elege', type: 'deletable' },
            { id: 'e-http-loop', source: 'http-elege', target: 'loop-mentions', type: 'deletable' },
            { id: 'e-loop-script', source: 'loop-mentions', target: 'script-direct-map', type: 'deletable' },
            { id: 'e-script-publish', source: 'script-direct-map', target: 'publish-feed', type: 'deletable' },
        ],
    },

    // ─────────────────────────────────────────────────────
    // MONITORAMENTO WHATSAPP (Grupos via Elege.AI)
    // ─────────────────────────────────────────────────────
    {
        id: 'whatsapp-monitoring',
        name: 'Monitoramento WhatsApp',
        description: 'Busca grupos WhatsApp via Elege.AI, coleta menções recentes de cada canal WhatsApp, filtra por entidades monitoradas, classifica ameaças e publica no feed.',
        icon: '💬',
        category: 'monitoring',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 400, y: 50 },
                data: {
                    label: '🔔 Ativação / Agendamento',
                    iconType: 'activation',
                    triggerType: 'activation',
                    color: '#22c55e',
                },
            },
            {
                id: 'whatsapp-groups',
                type: 'action',
                position: { x: 400, y: 200 },
                data: {
                    label: '💬 Listar Grupos WhatsApp',
                    iconType: 'whatsapp',
                    action: 'list_groups',
                    color: '#25d366',
                },
            },
            {
                id: 'loop-groups',
                type: 'action',
                position: { x: 400, y: 350 },
                data: {
                    label: '🔄 Loop: Para cada Grupo',
                    iconType: 'loop',
                    loopVariable: 'whatsapp-groups.groups',
                    loopAlias: 'group',
                    color: '#8b5cf6',
                },
            },
            {
                id: 'http-mentions',
                type: 'action',
                position: { x: 400, y: 500 },
                data: {
                    label: '📡 Buscar Menções do Grupo',
                    iconType: 'httprequest',
                    httpMethod: 'GET',
                    httpUrl: '{{ELEGE_BASE_URL}}/api/analytics/mentions/latest?period=today&limit=50&channel_id={{loop-groups.group.channel_id}}',
                    httpHeaders: JSON.stringify({ 'Authorization': 'Bearer {{ELEGE_TOKEN}}' }, null, 2),
                    color: '#f97316',
                },
            },
            {
                id: 'script-filter',
                type: 'action',
                position: { x: 400, y: 700 },
                data: {
                    label: '⚡ Filtrar Entidades + Classificar Ameaça',
                    iconType: 'script',
                    scriptTemplate: 'custom',
                    scriptCode: `// Filter mentions by activation entities and classify threats
const mentions = input['http-mentions']?.response_mentions || input['http-mentions']?.items || [];
const group = input['loop-groups']?.group || {};
const entities = context.activation?.monitored_entities || context.activation?.people_of_interest || [];
const keywords = context.activation?.keywords || [];
const allTerms = [...entities, ...keywords];

const results = [];
for (const m of mentions) {
  const text = (m.subject || m.content || '').toLowerCase();
  const person = (m.person?.name || '').toLowerCase();
  const matched = allTerms.filter(t => text.includes(t.toLowerCase()) || person.includes(t.toLowerCase()));
  
  if (matched.length === 0) continue;
  
  const sentiment = m.sentiment || 0;
  const isNegative = sentiment < 0 || sentiment === -1;
  const threatLevel = (isNegative && matched.length >= 2) ? 'critical'
    : (isNegative || matched.length >= 1) ? 'moderate'
    : 'low';
  const riskScore = threatLevel === 'critical' ? 85 : threatLevel === 'moderate' ? 55 : 25;
  
  results.push({
    title: m.subject || 'Mensagem WhatsApp relevante',
    content: m.subject || text.substring(0, 500),
    source: group.name || 'Grupo WhatsApp',
    source_type: 'whatsapp',
    sentiment: isNegative ? 'negative' : 'neutral',
    risk_score: riskScore,
    classification_metadata: {
      whatsapp_group_id: group.id,
      whatsapp_group_name: group.name,
      detected_entities: matched,
      keywords: keywords.filter(k => text.includes(k.toLowerCase())),
      threat_level: threatLevel,
      threat_reason: 'Match: ' + matched.join(', ') + (isNegative ? ' + sentimento negativo' : ''),
      person_name: m.person?.name,
    }
  });
}

result = { items: results, count: results.length, hasItems: results.length > 0 };`,
                    color: '#ef4444',
                },
            },
            {
                id: 'conditional-has',
                type: 'condition',
                position: { x: 400, y: 900 },
                data: {
                    label: '🔀 Tem Ameaças?',
                    iconType: 'conditional',
                    conditionSource: 'script-filter.hasItems',
                    conditionOperator: 'equals',
                    conditionValue: 'true',
                    color: '#6366f1',
                },
            },
            {
                id: 'loop-publish',
                type: 'action',
                position: { x: 400, y: 1050 },
                data: {
                    label: '🔄 Loop: Publicar Cada Ameaça',
                    iconType: 'loop',
                    loopVariable: 'script-filter.items',
                    loopAlias: 'threat',
                    color: '#8b5cf6',
                },
            },
            {
                id: 'publish-feed',
                type: 'action',
                position: { x: 400, y: 1200 },
                data: {
                    label: '🚀 Publicar no Feed + Ameaças',
                    iconType: 'publish',
                    color: '#10b981',
                },
            },
        ],
        edges: [
            { id: 'e-trigger-wpp', source: 'trigger-1', target: 'whatsapp-groups', type: 'deletable' },
            { id: 'e-wpp-loop', source: 'whatsapp-groups', target: 'loop-groups', type: 'deletable' },
            { id: 'e-loop-http', source: 'loop-groups', target: 'http-mentions', type: 'deletable' },
            { id: 'e-http-script', source: 'http-mentions', target: 'script-filter', type: 'deletable' },
            { id: 'e-script-cond', source: 'script-filter', target: 'conditional-has', type: 'deletable' },
            { id: 'e-cond-loop', source: 'conditional-has', target: 'loop-publish', type: 'deletable', sourceHandle: 'true' },
            { id: 'e-loop-publish', source: 'loop-publish', target: 'publish-feed', type: 'deletable' },
        ],
    },
];
