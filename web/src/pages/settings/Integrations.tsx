import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database, Search, Share2, Globe, Activity, Key, Save, Webhook, Plus, Trash2, ChevronDown, ChevronUp, Copy, CheckCircle, XCircle, Clock, Eye, EyeOff, Brain } from 'lucide-react';
import { Info } from 'lucide-react';

interface DataSource {
    id: string;
    name: string;
    type: string;
    config: any;
    is_active: boolean;
    last_synced_at?: string;
}

interface IntegrationField {
    key: string;
    label: string;
    type: 'text' | 'password' | 'select';
    placeholder?: string;
    options?: string[]; // For select type
    helperText?: string;
}

interface IntegrationMetadata {
    icon: any;
    description: string;
    fields: IntegrationField[];
}

const INTEGRATION_METADATA: Record<string, IntegrationMetadata> = {
    'Perplexity AI': {
        icon: Search,
        description: "Motor de busca com IA que pesquisa a web em tempo real e retorna respostas estruturadas com fontes citadas. Ideal para briefings, fact-check e contextualização de crises.",
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'pplx-...', helperText: 'Obtenha em perplexity.ai/settings/api' },
            {
                key: 'model',
                label: 'Modelo',
                type: 'select',
                options: ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro', 'sonar-deep-research'],
                helperText: 'sonar: rápido ($1/1k). sonar-pro: profundo ($5/1k). deep-research: investigativo.'
            }
        ]
    },
    'Google Trends': {
        icon: Activity,
        description: "Monitoramento de tendências de busca em tempo real. Essencial para identificar picos de interesse público sobre temas ou candidatos.",
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Opcional para uso básico' },
            { key: 'region', label: 'Região', type: 'text', placeholder: 'BR', helperText: 'Código do país (ex: BR, US)' }
        ]
    },
    'Brandwatch': {
        icon: Share2,
        description: "Plataforma enterprise de Consumer Intelligence. Social listening em escala, sentiment analysis nativo em PT-BR, share of voice, demographics e spike detection. Essencial para operações políticas de grande porte.",
        fields: [
            { key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'Bearer Token', helperText: 'Gerado via POST /oauth/token no Developer Hub.' },
            { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'Ex: 123456789', helperText: 'ID do projeto no Brandwatch.' },
            { key: 'queryId', label: 'Query ID (opcional)', type: 'text', placeholder: 'Ex: 987654321', helperText: 'ID da query de monitoramento padrão.' },
            {
                key: 'searchScope',
                label: 'Escopo de Busca',
                type: 'select',
                options: ['all', 'twitter', 'facebook', 'instagram', 'reddit', 'news', 'blogs', 'forums'],
                helperText: 'Filtro padrão de canais para coleta.'
            },
            {
                key: 'apiRegion',
                label: 'Região da API',
                type: 'select',
                options: ['api.brandwatch.com', 'newapi.brandwatch.com'],
                helperText: 'Região do endpoint (padrão: api.brandwatch.com).'
            }
        ]
    },
    'SEMrush': {
        icon: Search,
        description: "Plataforma de visibilidade digital e inteligência competitiva. Monitora posicionamento orgânico, keywords, backlinks, tráfego estimado e concorrentes. Essencial para medir presença digital de atores políticos.",
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Chave da API SEMrush', helperText: 'Obtenha em semrush.com → My Profile → API Key.' },
            {
                key: 'database',
                label: 'Database (País)',
                type: 'select',
                options: ['br', 'us', 'pt', 'es', 'ar', 'mx', 'co'],
                helperText: 'Base de dados regional. BR = Brasil.'
            },
            { key: 'defaultDomain', label: 'Domínio Padrão', type: 'text', placeholder: 'Ex: candidato.com.br', helperText: 'Domínio monitorado por padrão (pode ser alterado por nó).' },
        ]
    },
    'BuzzSumo': {
        icon: Share2,
        description: "Plataforma de inteligência de conteúdo. Descobre conteúdo viral, identifica influenciadores, analisa engagement por rede social e monitora backlinks. Custo-benefício ideal para análise de viralização.",
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Chave da API BuzzSumo', helperText: 'Obtenha em app.buzzsumo.com → Account → API' },
            {
                key: 'defaultSort',
                label: 'Ordenação Padrão',
                type: 'select',
                options: ['total_shares', 'facebook_shares', 'twitter_shares', 'trending', 'evergreen_score'],
                helperText: 'Como ordenar os resultados por padrão.'
            },
            { key: 'defaultLimit', label: 'Limite Padrão', type: 'text', placeholder: '20', helperText: 'Quantidade padrão de resultados (máx 100).' }
        ]
    },
    'Manus AI': {
        icon: Brain,
        description: "Agente autônomo de IA que navega na web, investiga dados, cruza informações e gera dossiês completos. Ideal para pesquisa investigativa profunda, due diligence e monitoramento de diários oficiais.",
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'manus-...', helperText: 'Obtenha em manus.im → Settings → API Keys' },
            {
                key: 'defaultAgentType',
                label: 'Tipo de Agente Padrão',
                type: 'select',
                options: ['research', 'web_browsing', 'data_analysis', 'document_processing'],
                helperText: 'research: investigação profunda. web_browsing: navegação web. data_analysis: análise de dados.'
            },
            { key: 'webhookUrl', label: 'Webhook de Callback (opcional)', type: 'text', placeholder: 'https://...', helperText: 'URL para receber resultado quando a tarefa finalizar (async).' }
        ]
    },
    'Ahrefs': {
        icon: Globe,
        description: "Conjunto de ferramentas SEO para analisar concorrentes, pesquisar palavras-chave e monitorar backlinks.",
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Token de Acesso' }
        ]
    },
    'SimilarWeb': {
        icon: Globe,
        description: "Inteligência de mercado digital e análise competitiva de tráfego web.",
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Chave da API' }
        ]
    },
    'X (Twitter)': {
        icon: Share2,
        description: "Integração oficial com a API v2 do X (Twitter). Captura tweets, menções, threads, métricas de engajamento e tendências em tempo real. Suporta busca recente (7 dias) e full-archive (plano Academic/Enterprise).",
        fields: [
            { key: 'apiKey', label: 'API Key (Consumer Key)', type: 'password', placeholder: 'Ex: xAi7k...', helperText: 'Chave da aplicação no Developer Portal do X.' },
            { key: 'apiSecret', label: 'API Secret (Consumer Secret)', type: 'password', placeholder: 'Ex: s9Bk2...', helperText: 'Segredo da aplicação — nunca compartilhe.' },
            { key: 'bearerToken', label: 'Bearer Token', type: 'password', placeholder: 'AAAA...', helperText: 'Token para autenticação App-Only (OAuth 2.0). Usado em buscas e timelines públicas.' },
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Ex: 12345-xYz...', helperText: 'Token de acesso do usuário (OAuth 1.0a). Necessário para ações em nome do usuário.' },
            { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', placeholder: 'Ex: kP3m...', helperText: 'Segredo do token de acesso.' },
            {
                key: 'searchTier',
                label: 'Nível de Acesso',
                type: 'select',
                options: ['basic', 'pro', 'enterprise'],
                helperText: 'Basic: 10k tweets/mês, 7 dias. Pro: 1M tweets/mês. Enterprise: full-archive.'
            },
            {
                key: 'defaultEndpoint',
                label: 'Endpoint Padrão',
                type: 'select',
                options: ['search_recent', 'search_all', 'user_timeline', 'user_mentions', 'stream_rules'],
                helperText: 'Endpoint primário para coleta de dados.'
            }
        ]
    },
    'Brasil.IO (TSE)': {
        icon: Database,
        description: "Dados públicos do Brasil, incluindo bases eleitorais do TSE. Usado para enriquecimento de dados cadastrais e estatísticos.",
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Token (se necessário)' }
        ]
    },
    'Elege.AI': {
        icon: Key,
        description: "Token de autenticação para a API do Elege.AI. Necessário para fluxos que consultam TVs, Rádios e outras fontes via API Elege. Configuração exclusiva do administrador.",
        fields: [
            { key: 'bearerToken', label: 'Bearer Token', type: 'password', placeholder: 'Token de acesso da API Elege.AI', helperText: 'Token fornecido pelo suporte Elege.AI. Usado automaticamente em todos os fluxos.' },
            { key: 'baseUrl', label: 'URL Base da API (opcional)', type: 'text', placeholder: 'https://api.elege.ai', helperText: 'URL base da API. Deixe vazio para usar o padrão.' }
        ]
    }
};

const DEFAULT_METADATA: IntegrationMetadata = {
    icon: Database,
    description: "Integração genérica de dados.",
    fields: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Token de Acesso' }
    ]
};

// ─── Webhook Types ──────────────────────────────────────
interface WebhookEndpoint {
    id: string;
    name: string;
    url: string;
    secret: string | null;
    event_types: string[];
    is_active: boolean;
    headers: Record<string, string>;
    created_at: string;
    updated_at: string;
}

interface WebhookDelivery {
    id: string;
    endpoint_id: string;
    event_type: string;
    payload: any;
    response_status: number | null;
    response_body: string | null;
    status: 'success' | 'failed' | 'pending';
    attempt_count: number;
    created_at: string;
}

const WEBHOOK_EVENT_CATALOG: { category: string; events: { value: string; label: string }[] }[] = [
    {
        category: 'Feed de Inteligência',
        events: [
            { value: 'mention.created', label: 'Nova menção capturada' },
            { value: 'mention.classified', label: 'Menção classificada (sentimento/risco)' },
            { value: 'mention.escalated', label: 'Menção escalada para crise' },
            { value: 'mention.spike', label: 'Spike de volume detectado' },
        ]
    },
    {
        category: 'Crises',
        events: [
            { value: 'crisis.created', label: 'Pacote de crise criado' },
            { value: 'crisis.plan_generated', label: 'Plano de resposta gerado' },
            { value: 'crisis.resolved', label: 'Crise resolvida' },
            { value: 'crisis.evidence_added', label: 'Evidência adicionada' },
        ]
    },
    {
        category: 'Ativações',
        events: [
            { value: 'activation.created', label: 'Nova ativação criada' },
            { value: 'activation.approved', label: 'Ativação aprovada' },
            { value: 'activation.completed', label: 'Ativação finalizada' },
        ]
    },
    {
        category: 'Fluxos',
        events: [
            { value: 'flow.execution_started', label: 'Execução de fluxo iniciada' },
            { value: 'flow.execution_completed', label: 'Execução de fluxo concluída' },
            { value: 'flow.execution_failed', label: 'Execução de fluxo falhou' },
        ]
    },
    {
        category: 'Sistema',
        events: [
            { value: 'system.watchdog_alert', label: 'Alerta do Watchdog' },
            { value: 'system.threshold_exceeded', label: 'Limiar de crise excedido' },
        ]
    }
];

export const Integrations: React.FC = () => {
    const [sources, setSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editConfig, setEditConfig] = useState<string>('{}');

    // Webhook State
    const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
    const [loadingWebhooks, setLoadingWebhooks] = useState(true);
    const [showAddWebhook, setShowAddWebhook] = useState(false);
    const [newWebhook, setNewWebhook] = useState({ name: '', url: '', secret: '', event_types: [] as string[] });
    const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
    const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [savingWebhook, setSavingWebhook] = useState(false);

    useEffect(() => {
        fetchSources();
        fetchWebhooks();
    }, []);

    const fetchSources = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('data_sources')
            .select('*')
            .order('name');

        if (error) console.error('Error fetching data sources:', error);
        else setSources(data || []);
        setLoading(false);
    };

    // ─── Webhook CRUD ───────────────────────────────────
    const fetchWebhooks = async () => {
        setLoadingWebhooks(true);
        const { data, error } = await supabase
            .from('webhook_endpoints')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching webhooks:', error);
        else setWebhooks(data || []);
        setLoadingWebhooks(false);
    };

    const fetchDeliveries = async (endpointId: string) => {
        const { data, error } = await supabase
            .from('webhook_deliveries')
            .select('*')
            .eq('endpoint_id', endpointId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) console.error('Error fetching deliveries:', error);
        else setDeliveries(data || []);
    };

    const handleCreateWebhook = async () => {
        if (!newWebhook.name || !newWebhook.url) return alert('Nome e URL são obrigatórios.');
        if (newWebhook.event_types.length === 0) return alert('Selecione pelo menos um evento.');

        setSavingWebhook(true);
        const { error } = await supabase.from('webhook_endpoints').insert({
            name: newWebhook.name,
            url: newWebhook.url,
            secret: newWebhook.secret || null,
            event_types: newWebhook.event_types,
            is_active: true,
            headers: {}
        });

        if (error) alert('Erro ao criar webhook: ' + error.message);
        else {
            setNewWebhook({ name: '', url: '', secret: '', event_types: [] });
            setShowAddWebhook(false);
            fetchWebhooks();
        }
        setSavingWebhook(false);
    };

    const toggleWebhookActive = async (wh: WebhookEndpoint) => {
        await supabase.from('webhook_endpoints').update({ is_active: !wh.is_active }).eq('id', wh.id);
        fetchWebhooks();
    };

    const deleteWebhook = async (id: string) => {
        if (!confirm('Deseja realmente excluir este webhook?')) return;
        await supabase.from('webhook_endpoints').delete().eq('id', id);
        fetchWebhooks();
    };

    const toggleEvent = (eventValue: string) => {
        setNewWebhook(prev => ({
            ...prev,
            event_types: prev.event_types.includes(eventValue)
                ? prev.event_types.filter(e => e !== eventValue)
                : [...prev.event_types, eventValue]
        }));
    };

    const handleExpandWebhook = (id: string) => {
        if (expandedWebhook === id) {
            setExpandedWebhook(null);
        } else {
            setExpandedWebhook(id);
            fetchDeliveries(id);
        }
    };

    const toggleActive = async (source: DataSource) => {
        const { error } = await supabase
            .from('data_sources')
            .update({ is_active: !source.is_active })
            .eq('id', source.id);

        if (error) alert('Erro ao atualizar status');
        else fetchSources();
    };

    const handleEdit = (source: DataSource) => {
        setEditingId(source.id);
        setEditConfig(JSON.stringify(source.config, null, 2));
    };

    const handleSave = async (id: string) => {
        try {
            const parsedConfig = JSON.parse(editConfig);
            const { error } = await supabase
                .from('data_sources')
                .update({ config: parsedConfig })
                .eq('id', id);

            if (error) throw error;
            setEditingId(null);
            fetchSources();
        } catch (err: any) {
            alert('Erro ao salvar configuração: ' + err.message);
        }
    };



    const handleConfigChange = (key: string, value: string) => {
        try {
            const currentConfig = JSON.parse(editConfig);
            const newConfig = { ...currentConfig, [key]: value };
            setEditConfig(JSON.stringify(newConfig));
        } catch (e) {
            // If editConfig is invalid JSON (shouldn't happen with controlled inputs), reset
            const newConfig = { [key]: value };
            setEditConfig(JSON.stringify(newConfig));
        }
    };

    return (
        <div className="space-y-6">
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Database className="w-6 h-6 text-primary" />
                    Integrações de Dados
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                    Gerencie as conexões com fontes de dados externas para enriquecimento e monitoramento.
                </p>
            </header>

            {loading ? (
                <div className="text-slate-500 text-center py-8">Carregando integrações...</div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {sources.map(source => {
                        const metadata = INTEGRATION_METADATA[source.name] || DEFAULT_METADATA;
                        const Icon = metadata.icon;
                        const isEditing = editingId === source.id;
                        const fields = metadata.fields;

                        // Parse current config for display
                        let currentConfigObj: any = {};
                        try {
                            currentConfigObj = isEditing ? JSON.parse(editConfig) : source.config;
                        } catch (e) {
                            currentConfigObj = {};
                        }

                        return (
                            <div key={source.id} className={`bg-slate-900 border ${source.is_active ? 'border-primary/30' : 'border-slate-800'} rounded-lg p-6 transition-all hover:border-primary/50 relative overflow-hidden`}>
                                {/* Active Indicator Strip */}
                                {source.is_active && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                                )}

                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${source.is_active ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-slate-500'}`}>
                                            <Icon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-xl flex items-center gap-2">
                                                {source.name}
                                                {source.type && <span className="text-xs font-mono text-slate-500 uppercase px-2 py-0.5 bg-slate-800 rounded">{source.type}</span>}
                                            </h3>
                                            <div className="mt-2 text-slate-400 text-sm max-w-2xl leading-relaxed flex items-start gap-2">
                                                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                                                {metadata.description}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={source.is_active}
                                                onChange={() => toggleActive(source)}
                                            />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Config Area */}
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            {fields.map(field => (
                                                <div key={field.key}>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{field.label}</label>
                                                    <div className="relative">
                                                        {field.type === 'select' ? (
                                                            <select
                                                                value={currentConfigObj[field.key] || ''}
                                                                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                                                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-primary appearance-none"
                                                            >
                                                                <option value="" disabled>Selecione...</option>
                                                                {field.options?.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type={field.type}
                                                                value={currentConfigObj[field.key] || ''}
                                                                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                                                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-primary"
                                                                placeholder={field.placeholder}
                                                            />
                                                        )}

                                                        {field.type === 'password' && (
                                                            <Key className="absolute right-3 top-2.5 w-4 h-4 text-slate-600" />
                                                        )}

                                                        {field.helperText && (
                                                            <p className="text-[10px] text-slate-500 mt-1">{field.helperText}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-3 py-1 text-slate-400 hover:text-white text-sm"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleSave(source.id)}
                                                    className="px-4 py-1.5 bg-primary text-white rounded hover:bg-primary/90 text-sm flex items-center gap-1 font-medium transition-colors"
                                                >
                                                    <Save className="w-3 h-3" /> Salvar Configuração
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                            <div className="flex gap-2">
                                                <span>Última sincronização: {source.last_synced_at ? new Date(source.last_synced_at).toLocaleString() : 'Nunca'}</span>
                                                {/* Show configured keys masked */}
                                                {Object.keys(source.config).length > 0 && (
                                                    <span className="text-emerald-500 font-mono bg-emerald-500/10 px-1 rounded">
                                                        {Object.keys(source.config).join(', ')} configured
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleEdit(source)}
                                                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-slate-800"
                                            >
                                                <Key className="w-3 h-3" />
                                                {Object.keys(source.config).length > 0 ? 'Editar Credenciais' : 'Configurar Credenciais'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══════════════ WEBHOOKS SECTION ═══════════════ */}
            <div className="mt-10 pt-8 border-t border-slate-800">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Webhook className="w-6 h-6 text-amber-400" />
                            Webhooks
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Receba notificações em tempo real quando eventos ocorrem no War Room.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddWebhook(!showAddWebhook)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Webhook
                    </button>
                </div>

                {/* Add Webhook Form */}
                {showAddWebhook && (
                    <div className="bg-slate-900 border border-amber-500/30 rounded-lg p-6 mb-6 space-y-4">
                        <h3 className="font-bold text-white text-lg">Cadastrar Webhook</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={newWebhook.name}
                                    onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                    placeholder="Ex: Notificação Slack"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL do Endpoint</label>
                                <input
                                    type="url"
                                    value={newWebhook.url}
                                    onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                    placeholder="https://hooks.example.com/..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Secret (HMAC - opcional)</label>
                            <input
                                type="password"
                                value={newWebhook.secret}
                                onChange={e => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500 max-w-md"
                                placeholder="Chave secreta para assinatura HMAC"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">O payload será assinado com HMAC-SHA256 usando este secret no header X-Webhook-Signature.</p>
                        </div>

                        {/* Event Type Selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Eventos Assinados</label>
                            <div className="space-y-3">
                                {WEBHOOK_EVENT_CATALOG.map(cat => (
                                    <div key={cat.category}>
                                        <p className="text-xs text-slate-400 font-medium mb-1.5">{cat.category}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {cat.events.map(evt => {
                                                const isSelected = newWebhook.event_types.includes(evt.value);
                                                return (
                                                    <button
                                                        key={evt.value}
                                                        onClick={() => toggleEvent(evt.value)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected
                                                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                            }`}
                                                    >
                                                        {isSelected && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                                        {evt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {newWebhook.event_types.length > 0 && (
                                <p className="text-xs text-amber-400 mt-2">
                                    {newWebhook.event_types.length} evento(s) selecionado(s): {newWebhook.event_types.join(', ')}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                            <button onClick={() => setShowAddWebhook(false)} className="px-3 py-1.5 text-slate-400 hover:text-white text-sm">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateWebhook}
                                disabled={savingWebhook}
                                className="px-4 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-500 text-sm flex items-center gap-1 font-medium transition-colors disabled:opacity-50"
                            >
                                <Save className="w-3 h-3" />
                                {savingWebhook ? 'Salvando...' : 'Criar Webhook'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Webhooks List */}
                {loadingWebhooks ? (
                    <div className="text-slate-500 text-center py-8">Carregando webhooks...</div>
                ) : webhooks.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
                        <Webhook className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Nenhum webhook cadastrado.</p>
                        <p className="text-slate-500 text-sm mt-1">Crie um webhook para receber notificações automáticas de eventos.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {webhooks.map(wh => (
                            <div key={wh.id} className={`bg-slate-900 border rounded-lg transition-all ${wh.is_active ? 'border-amber-500/20' : 'border-slate-800 opacity-60'
                                }`}>
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`p-2.5 rounded-lg ${wh.is_active ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                                                <Webhook className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-white flex items-center gap-2">
                                                    {wh.name}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${wh.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                        {wh.is_active ? 'ATIVO' : 'INATIVO'}
                                                    </span>
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <code className="text-xs text-slate-400 font-mono truncate max-w-sm">{wh.url}</code>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(wh.url); }}
                                                        className="text-slate-500 hover:text-white transition-colors"
                                                        title="Copiar URL"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={wh.is_active}
                                                    onChange={() => toggleWebhookActive(wh)}
                                                />
                                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                                            </label>
                                            <button
                                                onClick={() => deleteWebhook(wh.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Event Tags */}
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {wh.event_types.map(evt => (
                                            <span key={evt} className="text-[10px] px-2 py-0.5 rounded border border-amber-500/20 text-amber-400 bg-amber-500/5 font-mono">
                                                {evt}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Secret indicator */}
                                    {wh.secret && (
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                            <Key className="w-3 h-3" />
                                            <span>HMAC-SHA256 configurado</span>
                                            <button
                                                onClick={() => setShowSecrets(prev => ({ ...prev, [wh.id]: !prev[wh.id] }))}
                                                className="text-slate-400 hover:text-white transition-colors"
                                            >
                                                {showSecrets[wh.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                            {showSecrets[wh.id] && <code className="text-amber-400 font-mono">{wh.secret}</code>}
                                        </div>
                                    )}

                                    {/* Expand for deliveries */}
                                    <button
                                        onClick={() => handleExpandWebhook(wh.id)}
                                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-white mt-3 transition-colors"
                                    >
                                        {expandedWebhook === wh.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        Histórico de entregas
                                    </button>
                                </div>

                                {/* Delivery Log */}
                                {expandedWebhook === wh.id && (
                                    <div className="border-t border-slate-800 p-4 bg-slate-950/50">
                                        {deliveries.length === 0 ? (
                                            <p className="text-xs text-slate-500 text-center py-4">Nenhuma entrega registrada.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-[1fr_120px_80px_60px_140px] gap-2 text-[10px] text-slate-500 uppercase font-bold px-2">
                                                    <span>Evento</span>
                                                    <span>Status HTTP</span>
                                                    <span>Resultado</span>
                                                    <span>Tent.</span>
                                                    <span>Data</span>
                                                </div>
                                                {deliveries.map(d => (
                                                    <div key={d.id} className="grid grid-cols-[1fr_120px_80px_60px_140px] gap-2 text-xs px-2 py-1.5 rounded bg-slate-900/50 items-center">
                                                        <code className="text-slate-300 font-mono truncate">{d.event_type}</code>
                                                        <span className={`font-mono ${d.response_status && d.response_status < 300 ? 'text-emerald-400' :
                                                            d.response_status && d.response_status < 500 ? 'text-amber-400' : 'text-red-400'
                                                            }`}>
                                                            {d.response_status || '—'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            {d.status === 'success' ? (
                                                                <><CheckCircle className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">OK</span></>
                                                            ) : d.status === 'failed' ? (
                                                                <><XCircle className="w-3 h-3 text-red-400" /><span className="text-red-400">Falha</span></>
                                                            ) : (
                                                                <><Clock className="w-3 h-3 text-amber-400" /><span className="text-amber-400">Pend.</span></>
                                                            )}
                                                        </span>
                                                        <span className="text-slate-500">{d.attempt_count}x</span>
                                                        <span className="text-slate-500">{new Date(d.created_at).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
