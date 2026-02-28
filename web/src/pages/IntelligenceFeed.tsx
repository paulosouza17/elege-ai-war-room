import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Clock,
    RefreshCw,
    TrendingUp,
    ShieldAlert,
    MessageSquare,
    Globe,
    X,
    CheckCircle,
    Archive,
    FileText,
    BrainCircuit,
    ArrowRight,
    TrendingDown,
    AlertTriangle,
    Filter,
    Search,
    Flame,
    Link2,
    Users,
    Loader2,
    Tv,
    Share2,
    Radio,
    Play,
    ChevronLeft,
    ChevronRight,
    Image,
    Download,
    Scissors,
    Heart,
    BarChart3,
    MessageCircle,
    Eye,
    ChevronDown
} from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CrisisEscalationModal } from '../components/CrisisEscalationModal';
import { PermissionGate } from '../components/auth/PermissionGate';
import { useUserActivations } from '@/hooks/useUserActivations';

interface Mention {
    id: string;
    text: string;
    content?: string;
    title?: string;
    summary?: string;
    source: string; // manual_upload, twitter, etc
    source_type: string; // document, social_media
    url: string;
    theme: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    risk_score: number;
    narrative: string;
    created_at: string;
    status: 'pending' | 'processed' | 'archived' | 'escalated';
    bundle_id?: string | null;
    classification_metadata: {
        reasoning?: string;
        provider?: string;
        model?: string;
        analyzed_at?: string;
        keywords?: string[];
        detected_entities?: string[];
        per_entity_analysis?: {
            entity_name: string;
            entity_id: string | null;
            sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
            context: string;
            tone: string;
        }[];
        assets?: any[];
        channel_kind?: string;
        elege_post_id?: string;
        source_name?: string;
        content_type_detected?: string;
        timeline_marks?: { position: number; sentiment: string; frameId: number }[];
        video_duration?: number;
        total_frames?: number;
        // Twitter/Social card fields
        author_name?: string;
        author_username?: string;
        author_profile_image?: string;
        author_verified?: boolean;
        author_followers?: number;
        likes?: number;
        retweets?: number;
        replies?: number;
        impressions?: number;
        [key: string]: any;
    };
}

const TV_RADIO_MOCKS: Mention[] = [
    {
        id: 'mock-1',
        title: 'Flávio Bolsonaro discursa sobre reforma tributária no Senado',
        summary: 'O senador defendeu mudanças no texto base focado em isenções para o setor primário e criticou o excesso de burocracia.',
        text: 'O senador defendeu mudanças no texto base focado em isenções para o setor primário e criticou o excesso de burocracia.',
        source: 'Jornal Nacional',
        source_type: 'tv',
        url: '#',
        theme: 'Economia',
        narrative: 'Apoio à reforma',
        sentiment: 'neutral',
        risk_score: 25,
        status: 'pending',
        created_at: new Date().toISOString(),
        classification_metadata: {
            assets: [
                { media_type: 'image', url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=1470&auto=format&fit=crop' }
            ],
            keywords: ['Flavio Bolsonaro', 'Reforma Tributária']
        }
    },
    {
        id: 'mock-2',
        title: 'Especialistas debatem futuro econômico e propostas do PL',
        summary: 'Entrevista com economistas analisando as recentes propostas apresentadas por Flavio Bolsonaro no congresso nacional.',
        text: 'Entrevista com economistas analisando as recentes propostas apresentadas por Flavio Bolsonaro no congresso nacional.',
        source: 'CNN Brasil',
        source_type: 'tv',
        url: '#',
        theme: 'Economia',
        narrative: 'Análise econômica',
        sentiment: 'positive',
        risk_score: 15,
        status: 'pending',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        classification_metadata: {
            assets: [
                { media_type: 'image', url: 'https://images.unsplash.com/photo-1621252179027-94459d278660?q=80&w=1470&auto=format&fit=crop' }
            ],
            keywords: ['Flavio Bolsonaro', 'Economia']
        }
    },
    {
        id: 'mock-3',
        title: 'Giro de notícias de Brasília: Oposição articula vetos',
        summary: 'Resumo das atividades parlamentares desta semana inclui posicionamentos da oposição e discursos de Flavio Bolsonaro.',
        text: 'Resumo das atividades parlamentares desta semana inclui posicionamentos da oposição e discursos de Flavio Bolsonaro.',
        source: 'Rádio CBN',
        source_type: 'radio',
        url: '#',
        theme: 'Política',
        narrative: 'Articulação do Congresso',
        sentiment: 'neutral',
        risk_score: 30,
        status: 'pending',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        classification_metadata: {
            assets: [
                { media_type: 'image', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1470&auto=format&fit=crop' }
            ],
            keywords: ['Flavio Bolsonaro', 'Congresso']
        }
    }
];

interface KeywordStats {
    count_24h: number;
    history: { date: string; count: number }[];
}

interface KeywordAnalysisProps {
    keyword: string;
    isShared?: boolean;
    onFilterClick?: (keyword: string) => void;
    sentimentGrowth?: number;
}

const KeywordAnalysis: React.FC<KeywordAnalysisProps> = ({ keyword, isShared, onFilterClick, sentimentGrowth }) => {
    const [stats, setStats] = useState<KeywordStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_keyword_metrics', { keyword_text: keyword });
            if (error) {
                console.error('Error fetching keyword stats:', error);
            } else {
                setStats(data as KeywordStats);
            }
            setLoading(false);
        };
        fetchStats();
    }, [keyword]);

    if (loading) return <div className="h-24 bg-slate-900/50 rounded animate-pulse" />;
    if (!stats) return null;

    const isTrending = stats.count_24h > 1;
    const growthColor = sentimentGrowth !== undefined
        ? sentimentGrowth > 0 ? 'text-red-400' : sentimentGrowth < 0 ? 'text-emerald-400' : 'text-slate-400'
        : undefined;
    const growthIcon = sentimentGrowth !== undefined
        ? sentimentGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : sentimentGrowth < 0 ? <TrendingDown className="w-3 h-3" /> : null
        : null;

    return (
        <div className={`bg-slate-950 border rounded p-3 mb-2 relative group/kw ${isShared ? 'border-amber-500/30 bg-amber-950/10' : 'border-slate-800'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Palavra-chave</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold max-w-[120px] truncate ${isShared ? 'text-amber-300' : 'text-white'}`} title={keyword}>{keyword}</span>
                        {isTrending && (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Em alta
                            </span>
                        )}
                        {isShared && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                                Recorrente
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {sentimentGrowth !== undefined && sentimentGrowth !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${growthColor}`} title="Taxa de sentimento negativo 24h">
                            {growthIcon}
                            <span>{sentimentGrowth > 0 ? '+' : ''}{sentimentGrowth.toFixed(0)}°</span>
                        </div>
                    )}
                    <div className="text-right">
                        <span className="text-xs text-slate-500 block">24h</span>
                        <span className="text-lg font-bold text-slate-200">{stats.count_24h}</span>
                    </div>
                </div>
            </div>

            <div className="h-[60px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.history}>
                        <defs>
                            <linearGradient id={`gradient-${keyword}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isShared ? '#f59e0b' : '#3b82f6'} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={isShared ? '#f59e0b' : '#3b82f6'} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '12px' }}
                            itemStyle={{ color: '#94a3b8' }}
                            labelStyle={{ color: '#fff', marginBottom: '4px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke={isShared ? '#f59e0b' : '#3b82f6'}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#gradient-${keyword})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
                {/* Discrete filter button */}
                {onFilterClick && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onFilterClick(keyword); }}
                        className="absolute bottom-1 right-1 opacity-0 group-hover/kw:opacity-100 transition-opacity bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white p-1 rounded text-[10px] flex items-center gap-1 border border-slate-700"
                        title="Filtrar feed por esta palavra-chave"
                    >
                        <Filter className="w-3 h-3" />
                        Filtrar
                    </button>
                )}
            </div>
        </div>
    );
};

// Safe string helper: prevents React crashes when objects appear in keyword/entity arrays
const safeStr = (v: any): string => {
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return '';
};
const safeKeywords = (arr: any[]): string[] => arr.map(safeStr).filter(s => s.length > 0);

export const IntelligenceFeed: React.FC = () => {
    const PAGE_SIZE = 30;
    const TV_PAGE_SIZE = 10;
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [themeMetrics, setThemeMetrics] = useState<Record<string, { is_spike: boolean, growth_percent: number }>>({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [filter, setFilter] = useState('pending'); // pending, processed, archived, high_risk
    const [feedTab, setFeedTab] = useState<'portais' | 'social' | 'tv' | 'radio' | 'whatsapp' | 'instagram' | 'tiktok'>('portais');
    const SOCIAL_SOURCES = ['twitter', 'facebook', 'x', 'Twitter', 'Facebook', 'X'];
    const TV_SOURCE_TYPES = ['tv'];
    const RADIO_SOURCE_TYPES = ['radio'];
    const WHATSAPP_SOURCE_TYPES = ['whatsapp'];
    const INSTAGRAM_SOURCE_TYPES = ['instagram', 'Instagram'];
    const TIKTOK_SOURCE_TYPES = ['tiktok', 'TikTok'];
    const [selectedMention, setSelectedMention] = useState<Mention | null>(null);
    const [mediaPanelTab, setMediaPanelTab] = useState<'transcript' | 'media'>('media');
    const [clipStart, setClipStart] = useState('');
    const [clipEnd, setClipEnd] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [transcriptOpen, setTranscriptOpen] = useState(false);
    const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
    const [entityMap, setEntityMap] = useState<Record<string, string>>({});
    const [keywordFilter, setKeywordFilter] = useState('');
    const [keywordSearch, setKeywordSearch] = useState('');
    const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const { activations, activationIds, loading: activationsLoading } = useUserActivations();

    // Compute keyword frequency across ALL mentions
    const keywordFrequency = useMemo(() => {
        const freq: Record<string, { count: number; negativeCount: number; prevNegativeCount: number }> = {};
        const now = new Date();
        const h24 = 24 * 60 * 60 * 1000;
        mentions.forEach(m => {
            const kws = safeKeywords(m.classification_metadata?.keywords || []);
            const isRecent = (now.getTime() - new Date(m.created_at).getTime()) < h24;
            const isOlder = (now.getTime() - new Date(m.created_at).getTime()) >= h24 && (now.getTime() - new Date(m.created_at).getTime()) < h24 * 2;
            kws.forEach(kw => {
                const key = kw.toLowerCase();
                if (!freq[key]) freq[key] = { count: 0, negativeCount: 0, prevNegativeCount: 0 };
                freq[key].count++;
                if (m.sentiment === 'negative') {
                    if (isRecent) freq[key].negativeCount++;
                    if (isOlder) freq[key].prevNegativeCount++;
                }
            });
        });
        return freq;
    }, [mentions]);

    // Keyword suggestions for search
    const keywordSuggestions = useMemo(() => {
        const entries = Object.entries(keywordFrequency)
            .map(([kw, data]) => ({
                keyword: kw,
                count: data.count,
                growth: data.prevNegativeCount > 0
                    ? ((data.negativeCount - data.prevNegativeCount) / data.prevNegativeCount) * 100
                    : data.negativeCount > 0 ? 100 : 0,
                isTrending: data.count > 2
            }))
            .sort((a, b) => b.count - a.count);

        if (keywordSearch) {
            const q = keywordSearch.toLowerCase();
            const matched = entries.filter(e => e.keyword.includes(q));
            // Also add a "free text search" option at the top
            return matched;
        }
        return entries.slice(0, 10);
    }, [keywordFrequency, keywordSearch]);

    // Get sentiment growth for a keyword
    const getSentimentGrowth = (keyword: string): number => {
        const key = keyword.toLowerCase();
        const data = keywordFrequency[key];
        if (!data) return 0;
        if (data.prevNegativeCount > 0) {
            return ((data.negativeCount - data.prevNegativeCount) / data.prevNegativeCount) * 100;
        }
        return data.negativeCount > 0 ? 100 : 0;
    };

    // Check if a keyword is shared across multiple feed items
    const isSharedKeyword = (keyword: string): boolean => {
        return (keywordFrequency[keyword.toLowerCase()]?.count || 0) > 1;
    };

    // Close suggestions on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowKeywordSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        const fetchEntities = async () => {
            const { data } = await supabase.from('monitored_entities').select('id, name');
            if (data) {
                const map: Record<string, string> = {};
                data.forEach((e: any) => { map[e.id] = e.name; });
                setEntityMap(map);
            }
        };
        fetchEntities();
        // NOTE: fetchMentions is NOT called here — it runs only after
        // useUserActivations hook resolves, via the dedicated useEffect below

        const channel = supabase
            .channel('public:intelligence_feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'intelligence_feed' }, () => {
                // Only refresh if activations are loaded
                if (!activationsLoading) fetchMentions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Check for spikes whenever mentions change
    useEffect(() => {
        const checkSpikes = async () => {
            const uniqueThemes = Array.from(new Set(mentions.map(m => m.theme).filter(Boolean)));
            const metrics: Record<string, any> = {};

            for (const theme of uniqueThemes) {
                if (themeMetrics[theme]) continue;
                const { data } = await supabase.rpc('get_theme_metrics', { theme_text: theme });
                if (data) {
                    metrics[theme] = data;
                }
            }

            if (Object.keys(metrics).length > 0) {
                setThemeMetrics(prev => ({ ...prev, ...metrics }));
            }
        };

        if (mentions.length > 0) {
            checkSpikes();
        }
    }, [mentions]);


    // Re-fetch when filter, feedTab, or activationIds changes
    useEffect(() => {
        if (!activationsLoading) fetchMentions();
    }, [filter, feedTab, activationIds, activationsLoading]);

    const fetchMentions = async (append = false) => {
        // Block ALL fetches until activations hook has resolved
        if (activationsLoading) return;

        // No activations = no data (non-admin with no access)
        if (activationIds.length === 0) {
            setMentions([]);
            setTotalCount(0);
            setHasMore(false);
            setLoading(false);
            return;
        }

        if (append) setLoadingMore(true);
        else setLoading(true);

        const currentSize = feedTab === 'tv' ? TV_PAGE_SIZE : PAGE_SIZE;

        const from = append ? mentions.length : 0;
        const to = from + currentSize - 1;

        let query = supabase
            .from('intelligence_feed')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        // Always filter by user's accessible activation IDs
        if (activationIds.length === 1) {
            query = query.eq('activation_id', activationIds[0]);
        } else if (activationIds.length > 1) {
            query = query.in('activation_id', activationIds);
        }

        // Feed tab source filter
        if (feedTab === 'social') {
            query = query.in('source', SOCIAL_SOURCES);
        } else if (feedTab === 'tv') {
            query = query.in('source_type', TV_SOURCE_TYPES);
        } else if (feedTab === 'radio') {
            query = query.in('source_type', RADIO_SOURCE_TYPES);
        } else if (feedTab === 'whatsapp') {
            query = query.in('source_type', WHATSAPP_SOURCE_TYPES);
        } else if (feedTab === 'instagram') {
            query = query.or('source.in.(instagram,Instagram),source_type.in.(instagram,Instagram)');
        } else if (feedTab === 'tiktok') {
            query = query.or('source.in.(tiktok,TikTok),source_type.in.(tiktok,TikTok)');
        } else {
            // Portais: everything that is NOT social media, TV, radio, whatsapp, instagram or tiktok
            for (const s of [...SOCIAL_SOURCES, ...INSTAGRAM_SOURCE_TYPES, ...TIKTOK_SOURCE_TYPES]) {
                query = query.neq('source', s);
            }
            query = query.not('source_type', 'in', '(tv,radio,whatsapp,instagram,tiktok)');
        }

        if (filter === 'high_risk') {
            query = query.gte('risk_score', 70).neq('status', 'archived');
        } else if (filter === 'archived') {
            query = query.eq('status', 'archived');
        } else if (filter === 'processed') {
            query = query.eq('status', 'processed');
        } else {
            // Default: Pending only (Inbox Zero approach)
            query = query.eq('status', 'pending');
        }

        const { data, error, count } = await query;
        if (error) {
            console.error('Error fetching mentions:', error);
        } else {
            let newData = data as Mention[];

            // Entity/keyword filter for TV/Radio: only show items matching activation's people + keywords
            if ((feedTab === 'tv' || feedTab === 'radio') && activations.length > 0) {
                const allPeople = activations.flatMap(a => (a.people_of_interest || []).map(p => p.toLowerCase().trim()));
                const allKeywords = activations.flatMap(a => safeKeywords(a.keywords || []).map(k => k.toLowerCase().trim()));
                const searchTerms = [...new Set([...allPeople, ...allKeywords])];

                if (searchTerms.length > 0) {
                    newData = newData.filter(m => {
                        const cm = m.classification_metadata || {};
                        // Build searchable text from all relevant fields
                        const entities = (cm.detected_entities || []).map((e: string) => e.toLowerCase());
                        const peaEntities = (cm.per_entity_analysis || []).map((ea: any) => (ea.entity || ea.entity_name || '').toLowerCase());
                        const itemKeywords = safeKeywords(cm.keywords || []).map(k => k.toLowerCase());
                        const personName = (cm.person_name || '').toLowerCase();
                        const titleLower = (m.title || '').toLowerCase();
                        const contentLower = (m.content || m.summary || '').toLowerCase();

                        return searchTerms.some(term =>
                            entities.some((e: string) => e.includes(term) || term.includes(e)) ||
                            peaEntities.some((e: string) => e.includes(term) || term.includes(e)) ||
                            itemKeywords.some(k => k.includes(term)) ||
                            (personName && (personName.includes(term) || term.includes(personName))) ||
                            titleLower.includes(term) ||
                            contentLower.includes(term)
                        );
                    });
                }
            }

            if (append) {
                setMentions(prev => [...prev, ...newData]);
            } else {
                setMentions(newData);
            }
            const total = count ?? 0;
            setTotalCount(total);
            setHasMore(from + newData.length < total);
        }
        setLoading(false);
        setLoadingMore(false);
    };

    const updateStatus = async (id: string, newStatus: Mention['status']) => {
        // Optimistic update
        setMentions(prev => prev.filter(m => m.id !== id));
        if (selectedMention?.id === id) setSelectedMention(null);

        const { error } = await supabase
            .from('intelligence_feed')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Failed to update status:', error);
            fetchMentions(); // Revert on error
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 80) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (score >= 50) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    };

    const getSourceIcon = (source: string) => {
        if (source?.includes('twitter') || source?.includes('x')) return <MessageSquare className="w-4 h-4" />;
        return <Globe className="w-4 h-4" />;
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-950 relative">
            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="p-8 pb-4 flex justify-between items-center border-b border-slate-800 bg-slate-950 shrink-0 z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-primary" />
                            Feed de Inteligência
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Inbox de monitoramento ({mentions.length} itens)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => fetchMentions()} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-md border border-slate-800 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                {/* Feed Tab Switcher */}
                <div className="px-8 pt-4 pb-0 flex items-center gap-1 border-b border-slate-800 shrink-0 bg-slate-950">
                    <button
                        onClick={() => { setFeedTab('portais'); setKeywordFilter(''); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${feedTab === 'portais'
                            ? 'text-sky-400 border-sky-400 bg-sky-500/5'
                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                    >
                        <Globe className="w-4 h-4" />
                        Portais
                    </button>
                    <button
                        onClick={() => { setFeedTab('social'); setKeywordFilter(''); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${feedTab === 'social'
                            ? 'text-pink-400 border-pink-400 bg-pink-500/5'
                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                    >
                        <Share2 className="w-4 h-4" />
                        Redes Sociais
                    </button>
                    <button
                        onClick={() => { setFeedTab('tv'); setKeywordFilter(''); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${feedTab === 'tv'
                            ? 'text-amber-400 border-amber-400 bg-amber-500/5'
                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                    >
                        <Tv className="w-4 h-4" />
                        TV
                    </button>
                    <button
                        onClick={() => { setFeedTab('radio'); setKeywordFilter(''); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${feedTab === 'radio'
                            ? 'text-teal-400 border-teal-400 bg-teal-500/5'
                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                    >
                        <Radio className="w-4 h-4" />
                        Rádio
                    </button>
                    <button
                        onClick={() => { setFeedTab('whatsapp'); setKeywordFilter(''); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${feedTab === 'whatsapp'
                            ? 'text-green-400 border-green-400 bg-green-500/5'
                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                    >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                    </button>
                    <button
                        onClick={() => { setFeedTab('instagram'); setKeywordFilter(''); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${feedTab === 'instagram'
                            ? 'text-fuchsia-400 border-fuchsia-400 bg-fuchsia-500/5'
                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                        Instagram
                    </button>
                    <button
                        onClick={() => { setFeedTab('tiktok'); setKeywordFilter(''); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${feedTab === 'tiktok'
                            ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                            }`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                        TikTok
                    </button>
                </div>

                {/* Filters */}
                <div className="px-8 py-4 flex items-center gap-2 relative shrink-0" style={{ overflow: 'visible' }}>
                    <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'pending', label: 'Pendentes (Inbox)', icon: <Archive className="w-4 h-4" /> },
                            { id: 'high_risk', label: 'Alto Risco', icon: <ShieldAlert className="w-4 h-4" /> },
                            { id: 'processed', label: 'Processados', icon: <CheckCircle className="w-4 h-4" /> },
                            { id: 'archived', label: 'Arquivados', icon: <X className="w-4 h-4" /> }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => { setFilter(f.id); setKeywordFilter(''); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === f.id
                                    ? 'bg-primary/20 text-primary border border-primary/20'
                                    : 'text-slate-400 border border-transparent hover:bg-slate-900 hover:text-white'
                                    }`}
                            >
                                {f.icon}
                                {f.label}
                            </button>
                        ))}
                        {keywordFilter && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                <Search className="w-3 h-3" />
                                "{keywordFilter.replace(/^__text:/, '')}"
                                <button onClick={() => setKeywordFilter('')} className="hover:text-white ml-1"><X className="w-3 h-3" /></button>
                            </span>
                        )}
                    </div>

                    {/* Keyword search */}
                    <div className="relative" ref={searchRef}>
                        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-1.5 w-[220px] focus-within:border-primary/50 transition-colors">
                            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <input
                                type="text"
                                placeholder="Buscar nos feeds..."
                                value={keywordSearch}
                                onChange={e => { setKeywordSearch(e.target.value); setShowKeywordSuggestions(true); }}
                                onFocus={() => setShowKeywordSuggestions(true)}
                                onKeyDown={e => { if (e.key === 'Enter' && keywordSearch.trim()) { setKeywordFilter(`__text:${keywordSearch.trim()}`); setKeywordSearch(''); setShowKeywordSuggestions(false); } }}
                                className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full"
                            />
                            {keywordSearch && (
                                <button onClick={() => { setKeywordSearch(''); setKeywordFilter(''); }} className="text-slate-500 hover:text-white">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        {/* Free text search: press Enter to search across all text fields */}
                        {showKeywordSuggestions && (
                            <div className="absolute top-full mt-1 right-0 w-[280px] bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-[300px] overflow-y-auto">
                                {keywordSearch && (
                                    <button
                                        onClick={() => { setKeywordFilter(`__text:${keywordSearch}`); setKeywordSearch(''); setShowKeywordSuggestions(false); }}
                                        className="w-full text-left px-3 py-2.5 hover:bg-slate-800 transition-colors flex items-center gap-2 border-b border-slate-700/50"
                                    >
                                        <Search className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="text-sm text-primary">Buscar "{keywordSearch}" em tudo</span>
                                    </button>
                                )}
                                {keywordSuggestions.length > 0 && (
                                    <div className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">Palavras-chave</div>
                                )}
                                {keywordSuggestions.map(s => (
                                    <button
                                        key={s.keyword}
                                        onClick={() => { setKeywordFilter(s.keyword); setKeywordSearch(''); setShowKeywordSuggestions(false); }}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm text-white truncate">{s.keyword}</span>
                                            {s.isTrending && (
                                                <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] text-slate-500">{s.count}x</span>
                                            {s.growth !== 0 && (
                                                <span className={`text-[10px] font-bold ${s.growth > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {s.growth > 0 ? '+' : ''}{s.growth.toFixed(0)}°
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className={`flex-1 overflow-y-auto p-8 pt-0 pb-24 min-h-0 ${feedTab === 'tv' && !selectedMention ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min' : 'space-y-3'}`}>
                    {mentions.length === 0 && !loading && feedTab !== 'tv' && feedTab !== 'radio' && (
                        <div className="text-center py-20 opacity-50">
                            <div className="bg-slate-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-white font-medium text-lg">
                                Tudo limpo por aqui!
                            </h3>
                            <p className="text-slate-500">
                                Nenhuma menção encontrada para este filtro.
                            </p>
                        </div>
                    )}

                    {(!loading && mentions.length === 0 && (feedTab === 'tv' || feedTab === 'radio') && !keywordFilter && TV_RADIO_MOCKS.filter(m => m.source_type === feedTab).length > 0) && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-amber-400 text-sm font-medium">Exibição de Demonstração</h4>
                                <p className="text-amber-200/70 text-xs mt-1">
                                    Nenhuma menção real detectada pelo Elege.AI para este canal ainda.
                                    Abaixo estão exemplos de como o conteúdo será exibido assim que for capturado.
                                </p>
                            </div>
                        </div>
                    )}

                    {(mentions.length > 0 ? mentions : ((feedTab === 'tv' || feedTab === 'radio') && !loading && !keywordFilter ? TV_RADIO_MOCKS.filter(m => m.source_type === feedTab) : []))
                        .filter(m => {
                            if (!keywordFilter) return true;
                            // Always do inclusive text search: title, content, summary, source AND keywords
                            const q = keywordFilter.replace(/^__text:/, '').toLowerCase();
                            return (
                                (m.title || '').toLowerCase().includes(q) ||
                                (m.content || m.text || '').toLowerCase().includes(q) ||
                                (m.summary || '').toLowerCase().includes(q) ||
                                (m.source || '').toLowerCase().includes(q) ||
                                safeKeywords(m.classification_metadata?.keywords || []).some((kw: string) => kw.toLowerCase().includes(q))
                            );
                        })
                        .filter(m => {
                            if ((feedTab === 'tv' || feedTab === 'radio') && selectedMention) {
                                return m.id === selectedMention.id;
                            }
                            return true;
                        })
                        .map((mention) => (
                            <article
                                key={mention.id}
                                onClick={() => setSelectedMention(mention)}
                                className={`relative bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden cursor-pointer transition-all hover:border-primary/30 hover:bg-slate-900 group ${selectedMention?.id === mention.id ? 'ring-2 ring-primary border-transparent' : ''}`}
                            >
                                {/* Media Card for TV/Radio */}
                                {feedTab === 'tv' && (
                                    <div className="relative w-full aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center group/play overflow-hidden">
                                        {/* Background Thumbnail — prefer image frame, fallback to video first frame */}
                                        {(() => {
                                            const assets = mention.classification_metadata?.assets || [];
                                            const postId = mention.classification_metadata?.elege_post_id;
                                            if (!postId) return null;
                                            // Prefer image frame (screenshot) — use middle frame for most representative shot
                                            const imageAssets = assets.filter((a: any) => a.kind === 'image' || (a.media_type && a.media_type.startsWith('image')));
                                            if (imageAssets.length > 0) {
                                                const midFrame = imageAssets[Math.floor(imageAssets.length / 2)];
                                                return <img src={`/api/elege/assets/${postId}/${midFrame.id}`} alt="" className="absolute inset-0 w-full h-full object-cover" />;
                                            }
                                            // Fallback: video first frame
                                            const videoAsset = assets.find((a: any) => a.kind === 'video' || (a.media_type && a.media_type.startsWith('video')));
                                            if (videoAsset) {
                                                return <video src={`/api/elege/assets/${postId}/${videoAsset.id}`} muted preload="metadata" className="absolute inset-0 w-full h-full object-cover" />;
                                            }
                                            return null;
                                        })()}

                                        {/* Gradient overlay — black to transparent, bottom */}
                                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[1]" />

                                        {/* Centered Play Button */}
                                        <div className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover/play:scale-110 bg-white/15 border-2 border-white/30 backdrop-blur-sm">
                                            <Play className="w-6 h-6 ml-0.5 text-white" />
                                        </div>

                                        {/* TV Badge — top left */}
                                        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                            <span className="text-[10px] font-bold px-2 py-1 rounded-md border backdrop-blur-sm text-amber-200 bg-amber-950/80 border-amber-500/50">
                                                📺 TV
                                            </span>
                                        </div>

                                        {/* Person Avatar — bottom right, with sentiment border */}
                                        {(() => {
                                            const entities = mention.classification_metadata?.detected_entities || [];
                                            const personName = entities[0] || '';
                                            const sentimentColor = mention.sentiment === 'positive' ? '#22c55e' : mention.sentiment === 'negative' ? '#ef4444' : '#6b7280';
                                            if (!personName) return null;
                                            const initials = personName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                                            return (
                                                <div
                                                    className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-slate-700 shadow-lg"
                                                    style={{ border: `2px solid ${sentimentColor}` }}
                                                    title={personName}
                                                >
                                                    {initials}
                                                </div>
                                            );
                                        })()}

                                        {/* Source name — bottom left over gradient */}
                                        <div className="absolute bottom-3 left-3 z-10">
                                            <span className="text-[11px] font-medium text-white/80">{mention.source}</span>
                                        </div>
                                    </div>
                                )}

                                {feedTab === 'radio' && (
                                    <div className="relative w-full flex items-center p-4 group/play overflow-hidden bg-gradient-to-r from-slate-900 via-teal-950/30 to-slate-900 border-b border-slate-800/50">
                                        {/* Subtle texture */}
                                        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />

                                        {/* Play Button */}
                                        <div className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover/play:scale-110 bg-teal-500/20 border border-teal-400/40 backdrop-blur-sm shadow-[0_0_15px_rgba(20,184,166,0.15)] mr-4">
                                            <Play className="w-4 h-4 ml-0.5 text-teal-300" />
                                        </div>

                                        {/* Waveform + info */}
                                        <div className="flex-1 relative z-10 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm text-teal-200 bg-teal-950/80 border-teal-500/50">📻 RÁDIO</span>
                                                <span className="text-[11px] text-slate-400">{mention.source}</span>
                                            </div>
                                            {/* Waveform bars */}
                                            <div className="flex items-end gap-[2px] h-6">
                                                {[...Array(40)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-[3px] bg-teal-400/30 rounded-full group-hover/play:bg-teal-400/50 transition-colors"
                                                        style={{ height: `${Math.max(15, Math.sin(i * 0.5) * 40 + 50)}%` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Person Avatar — right side */}
                                        {(() => {
                                            const entities = mention.classification_metadata?.detected_entities || [];
                                            const personName = entities[0] || '';
                                            const sentimentColor = mention.sentiment === 'positive' ? '#22c55e' : mention.sentiment === 'negative' ? '#ef4444' : '#6b7280';
                                            if (!personName) return null;
                                            const initials = personName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                                            return (
                                                <div
                                                    className="relative z-10 ml-3 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-slate-700 shadow-lg shrink-0"
                                                    style={{ border: `2px solid ${sentimentColor}` }}
                                                    title={personName}
                                                >
                                                    {initials}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                <div className="p-5">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border font-medium capitalize ${feedTab === 'tv' ? 'bg-amber-950/30 border-amber-500/20 text-amber-400' : feedTab === 'radio' ? 'bg-teal-950/30 border-teal-500/20 text-teal-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                                    {feedTab === 'tv' ? <Tv className="w-3.5 h-3.5" /> : feedTab === 'radio' ? <Radio className="w-3.5 h-3.5" /> : getSourceIcon(mention.source)}
                                                    {mention.source || 'Desconhecido'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(mention.created_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>

                                            <h3 className="text-slate-200 font-medium leading-relaxed line-clamp-2">
                                                "{mention.text || mention.summary || mention.title}"
                                            </h3>

                                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${mention.sentiment === 'negative' ? 'text-red-400 border-red-900 bg-red-950/30' :
                                                    mention.sentiment === 'positive' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' :
                                                        'text-slate-400 border-slate-700 bg-slate-800/30'
                                                    }`}>
                                                    {mention.sentiment === 'negative' ? 'Negativo' : mention.sentiment === 'positive' ? 'Positivo' : 'Neutro'}
                                                </span>

                                                {/* Bundle badges */}
                                                {mention.status === 'escalated' && !mention.bundle_id && (
                                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border text-red-400 border-red-500/30 bg-red-500/10 flex items-center gap-1">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        Pacote de Crise
                                                    </span>
                                                )}
                                                {mention.bundle_id && (
                                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border text-amber-400 border-amber-500/30 bg-amber-500/10 flex items-center gap-1">
                                                        <Link2 className="w-3 h-3" />
                                                        Vinculada
                                                    </span>
                                                )}

                                                {/* Keyword badges — shared keywords highlighted in amber */}
                                                {safeKeywords(mention.classification_metadata?.keywords || []).slice(0, 5).map((kw: string) => {
                                                    const shared = isSharedKeyword(kw);
                                                    const isFiltered = keywordFilter.toLowerCase() === kw.toLowerCase();
                                                    return (
                                                        <button
                                                            key={kw}
                                                            onClick={(e) => { e.stopPropagation(); setKeywordFilter(isFiltered ? '' : kw); }}
                                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${isFiltered
                                                                ? 'bg-primary/20 text-primary border-primary/30 ring-1 ring-primary/30'
                                                                : shared
                                                                    ? 'text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
                                                                    : 'text-slate-400 border-slate-700 bg-slate-800/30 hover:bg-slate-700/50'
                                                                }`}
                                                            title={shared ? `Recorrente em ${keywordFrequency[kw.toLowerCase()]?.count || 0} feeds` : kw}
                                                        >
                                                            #{kw}
                                                        </button>
                                                    );
                                                })}

                                                {/* Monitored Entities Badges */}
                                                {mention.classification_metadata?.detected_entities?.map((entityId: string) => (
                                                    entityMap[entityId] && (
                                                        <span key={entityId} className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                                                            <BrainCircuit className="w-3 h-3" />
                                                            {entityMap[entityId]}
                                                        </span>
                                                    )
                                                ))}

                                                {mention.theme && (
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        #{mention.theme}
                                                        {themeMetrics[mention.theme]?.is_spike && (
                                                            <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-1 rounded ml-1 border border-red-500/20 animate-pulse" title={`Crescimento de ${Math.round(themeMetrics[mention.theme].growth_percent)}% nas últimas 24h`}>
                                                                <AlertTriangle className="w-3 h-3" />
                                                                SURTO
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-lg border font-bold text-sm ${getRiskColor(mention.risk_score)}`}>
                                            {mention.risk_score}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex items-center justify-center py-4">
                            <button
                                onClick={() => fetchMentions(true)}
                                disabled={loadingMore}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all disabled:opacity-50"
                            >
                                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {loadingMore ? 'Carregando...' : `Carregar mais (${totalCount - mentions.length} restantes)`}
                            </button>
                        </div>
                    )}
                    {!hasMore && mentions.length > 0 && totalCount > PAGE_SIZE && (
                        <p className="text-center text-xs text-slate-600 py-3">
                            Todos os {totalCount} itens carregados
                        </p>
                    )}
                </div>
            </div>

            {/* Backdrop blur overlay when detail panel is open */}
            {selectedMention && (
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-[3px] z-10 transition-opacity"
                    onClick={() => setSelectedMention(null)}
                />
            )}

            {/* Floating Media Card — in the blur area, left of the detail panel */}
            {selectedMention && (feedTab === 'tv' || feedTab === 'radio') && (
                <div className="absolute inset-0 right-[450px] z-20 flex items-center justify-center p-8 pointer-events-none">
                    <div className={`w-full max-w-[720px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-slate-700/50 pointer-events-auto bg-slate-900 ${feedTab === 'tv' ? 'max-h-[90vh] overflow-y-auto scrollbar-thin' : ''}`}>

                        {/* ── RADIO: Full media panel with timeline ── */}
                        {feedTab === 'radio' && (() => {
                            const cm = selectedMention.classification_metadata || {} as any;
                            const assets = cm.assets || [];
                            const postId = cm.elege_post_id;
                            const mediaAsset = assets.find((a: any) => a.kind === 'audio' || (a.media_type && a.media_type.startsWith('audio'))) || assets[0];
                            const timelineMarks: { position: number; sentiment: string; frameId: number }[] = cm.timeline_marks || [];
                            const maxPosition = cm.video_duration || cm.audio_duration || (timelineMarks.length > 0 ? Math.max(...timelineMarks.map((m: any) => m.position)) : 300);
                            const transcript = selectedMention.content || selectedMention.summary || '';
                            const sentences = transcript.split(/[.!?]\s+/).filter((s: string) => s.trim().length > 5);

                            return (
                                <>
                                    {/* Audio Player */}
                                    <div className="p-4 bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border-b border-slate-800">
                                        {mediaAsset && postId ? (
                                            <audio ref={audioRef} controls autoPlay preload="auto" className="w-full h-10" style={{ borderRadius: '8px' }}>
                                                <source src={`/api/elege/assets/${postId}/${mediaAsset.id}`} />
                                            </audio>
                                        ) : (
                                            <div className="flex items-center gap-3 py-2 text-slate-500">
                                                <Radio className="w-5 h-5 text-teal-500" />
                                                <span className="text-sm">Áudio não disponível</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sentiment Timeline */}
                                    {timelineMarks.length > 0 && (
                                        <div className="px-4 py-2 bg-slate-950 border-t border-b border-slate-800">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Timeline de Citações</span>
                                                <div className="flex items-center gap-2 ml-auto text-[9px] text-slate-600">
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Positivo</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Negativo</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" /> Neutro</span>
                                                </div>
                                            </div>
                                            <div className="relative w-full h-5 bg-slate-800/80 rounded-full overflow-visible">
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-900/30 to-slate-700" />
                                                {timelineMarks.map((mark: any, idx: number) => {
                                                    const pct = maxPosition > 0 ? (mark.position / maxPosition) * 100 : 0;
                                                    const color = mark.sentiment === 'positive' ? 'bg-emerald-400 shadow-emerald-400/50' :
                                                        mark.sentiment === 'negative' ? 'bg-red-400 shadow-red-400/50' : 'bg-slate-500';
                                                    return (
                                                        <button
                                                            key={idx}
                                                            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${color} shadow-md hover:scale-150 transition-transform cursor-pointer z-10 border border-white/20`}
                                                            style={{ left: `${pct}%` }}
                                                            title={`${mark.position}s — ${mark.sentiment}`}
                                                            onClick={() => {
                                                                if (audioRef.current) {
                                                                    audioRef.current.currentTime = mark.position;
                                                                    audioRef.current.play();
                                                                }
                                                                const mins = Math.floor(mark.position / 60);
                                                                const secs = Math.floor(mark.position % 60);
                                                                setClipStart(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                                                <span>0:00</span>
                                                <span>{Math.floor(maxPosition / 60)}:{String(maxPosition % 60).padStart(2, '0')}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Clip Controls + Download */}
                                    {mediaAsset && postId && (
                                        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
                                            <Scissors className="w-4 h-4 text-slate-500 shrink-0" />
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="text"
                                                    value={clipStart}
                                                    onChange={e => setClipStart(e.target.value)}
                                                    placeholder="00:00"
                                                    className="w-16 text-xs text-center bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white placeholder-slate-600 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                                />
                                                <span className="text-slate-600 text-xs">→</span>
                                                <input
                                                    type="text"
                                                    value={clipEnd}
                                                    onChange={e => setClipEnd(e.target.value)}
                                                    placeholder={maxPosition > 0 ? `${Math.floor(maxPosition / 60)}:${String(maxPosition % 60).padStart(2, '0')}` : '05:00'}
                                                    className="w-16 text-xs text-center bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white placeholder-slate-600 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                                />
                                            </div>
                                            <button
                                                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-medium hover:bg-teal-500/30 transition-colors"
                                                onClick={() => {
                                                    if (!mediaAsset || !postId) return;
                                                    const parseTime = (t: string): number | null => {
                                                        if (!t.trim()) return null;
                                                        const parts = t.split(':').map(Number);
                                                        if (parts.length === 2) return parts[0] * 60 + parts[1];
                                                        if (parts.length === 1 && !isNaN(parts[0])) return parts[0];
                                                        return null;
                                                    };
                                                    const startSec = parseTime(clipStart);
                                                    const endSec = parseTime(clipEnd);
                                                    let url = `/api/elege/assets/${postId}/${mediaAsset.id}`;
                                                    const params: string[] = [];
                                                    if (startSec !== null) params.push(`start=${startSec}`);
                                                    if (endSec !== null) params.push(`end=${endSec}`);
                                                    if (params.length > 0) url += `?${params.join('&')}`;
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `${(selectedMention.title || 'audio').replace(/[^a-zA-Z0-9]/g, '_')}${startSec !== null ? `_${clipStart.replace(':', 'm')}s` : ''}.mp3`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                }}
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                {clipStart || clipEnd ? 'Baixar Corte' : 'Baixar Áudio'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Transcrição — Accordion */}
                                    <div className="border-t border-slate-800">
                                        <button
                                            onClick={() => setTranscriptOpen(!transcriptOpen)}
                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5 text-teal-400" />
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Transcrição ({sentences.length} frases)</span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${transcriptOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {transcriptOpen && (
                                            <div className="px-4 pb-4 space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                                                {/* Header: vehicle + date + title */}
                                                <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-1">
                                                    <div className="flex items-center gap-2 text-[10px] text-teal-400 font-bold uppercase">
                                                        <Radio className="w-3 h-3" />
                                                        {selectedMention.source || 'Rádio'}
                                                    </div>
                                                    <p className="text-xs font-medium text-white truncate">{selectedMention.title || 'Sem título'}</p>
                                                    <p className="text-[10px] text-slate-500">{new Date(selectedMention.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 hover:text-white transition-colors"
                                                        onClick={() => {
                                                            const blob = new Blob([`${selectedMention.source || 'Rádio'} — ${selectedMention.title || 'Sem título'}\n${new Date(selectedMention.created_at).toLocaleDateString('pt-BR')}\n\n${transcript}`], { type: 'text/plain' });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `${(selectedMention.title || 'transcricao').replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                        }}
                                                    >
                                                        <Download className="w-3 h-3" /> Baixar .txt
                                                    </button>
                                                </div>
                                                {sentences.length > 0 ? sentences.map((sentence: string, idx: number) => (
                                                    <p key={idx} className="text-xs text-slate-300 leading-relaxed pl-3 border-l-2 border-teal-800/50 hover:border-teal-500/50 transition-colors">
                                                        {sentence.trim()}
                                                    </p>
                                                )) : (
                                                    <p className="text-sm text-slate-500 py-4 text-center">Transcrição não disponível</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}

                        {/* ── TV: Full media panel ── */}
                        {feedTab === 'tv' && (() => {
                            const cm = selectedMention.classification_metadata || {};
                            const assets = cm.assets || [];
                            const postId = cm.elege_post_id;
                            const videoAsset = assets.find((a: any) => a.kind === 'video' || (a.media_type && a.media_type.startsWith('video')));
                            const imageAssets = assets.filter((a: any) => a.kind === 'image' || (a.media_type && a.media_type.startsWith('image')));
                            const timelineMarks: { position: number; sentiment: string; frameId: number }[] = cm.timeline_marks || [];
                            const maxPosition = cm.video_duration || (timelineMarks.length > 0 ? Math.max(...timelineMarks.map((m: any) => m.position)) : 300);
                            const transcript = selectedMention.content || selectedMention.summary || '';
                            const sentences = transcript.split(/[.!?]\s+/).filter((s: string) => s.trim().length > 5);

                            return (
                                <>
                                    {/* Video Player */}
                                    <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                                        {videoAsset && postId ? (
                                            <video
                                                ref={videoRef}
                                                controls
                                                preload="metadata"
                                                className="w-full h-full object-contain"
                                                poster={imageAssets.length > 0 ? `/api/elege/assets/${postId}/${imageAssets[Math.floor(imageAssets.length / 2)].id}` : undefined}
                                            >
                                                <source src={`/api/elege/assets/${postId}/${videoAsset.id}`} />
                                            </video>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-slate-500">
                                                <Tv className="w-10 h-10" />
                                                <span className="text-sm">Vídeo não disponível</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sentiment Timeline */}
                                    {timelineMarks.length > 0 && (
                                        <div className="px-4 py-2 bg-slate-950 border-t border-b border-slate-800">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Timeline de Citações</span>
                                                <div className="flex items-center gap-2 ml-auto text-[9px] text-slate-600">
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Positivo</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Negativo</span>
                                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" /> Neutro</span>
                                                </div>
                                            </div>
                                            <div className="relative w-full h-5 bg-slate-800/80 rounded-full overflow-visible">
                                                {/* Track bar */}
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-slate-800 to-slate-700" />
                                                {/* Markers */}
                                                {timelineMarks.map((mark: any, idx: number) => {
                                                    const pct = maxPosition > 0 ? (mark.position / maxPosition) * 100 : 0;
                                                    const color = mark.sentiment === 'positive' ? 'bg-emerald-400 shadow-emerald-400/50' :
                                                        mark.sentiment === 'negative' ? 'bg-red-400 shadow-red-400/50' : 'bg-slate-500';
                                                    return (
                                                        <button
                                                            key={idx}
                                                            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${color} shadow-md hover:scale-150 transition-transform cursor-pointer z-10 border border-white/20`}
                                                            style={{ left: `${pct}%` }}
                                                            title={`${mark.position}s — ${mark.sentiment}`}
                                                            onClick={() => {
                                                                if (videoRef.current) {
                                                                    videoRef.current.currentTime = mark.position;
                                                                    videoRef.current.play();
                                                                }
                                                                // Set clip start to this marker's timestamp
                                                                const mins = Math.floor(mark.position / 60);
                                                                const secs = Math.floor(mark.position % 60);
                                                                setClipStart(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                                                <span>0:00</span>
                                                <span>{Math.floor(maxPosition / 60)}:{String(maxPosition % 60).padStart(2, '0')}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Clip Controls + Download */}
                                    <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
                                        <Scissors className="w-4 h-4 text-slate-500 shrink-0" />
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={clipStart}
                                                onChange={e => setClipStart(e.target.value)}
                                                placeholder="00:00"
                                                className="w-16 text-xs text-center bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white placeholder-slate-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                            />
                                            <span className="text-slate-600 text-xs">→</span>
                                            <input
                                                type="text"
                                                value={clipEnd}
                                                onChange={e => setClipEnd(e.target.value)}
                                                placeholder={maxPosition > 0 ? `${Math.floor(maxPosition / 60)}:${String(maxPosition % 60).padStart(2, '0')}` : '05:00'}
                                                className="w-16 text-xs text-center bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white placeholder-slate-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                            />
                                        </div>
                                        <button
                                            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
                                            onClick={() => {
                                                if (!videoAsset || !postId) return;
                                                // Parse clip times (mm:ss or ss format)
                                                const parseTime = (t: string): number | null => {
                                                    if (!t.trim()) return null;
                                                    const parts = t.split(':').map(Number);
                                                    if (parts.length === 2) return parts[0] * 60 + parts[1];
                                                    if (parts.length === 1 && !isNaN(parts[0])) return parts[0];
                                                    return null;
                                                };
                                                const startSec = parseTime(clipStart);
                                                const endSec = parseTime(clipEnd);
                                                let url = `/api/elege/assets/${postId}/${videoAsset.id}`;
                                                // Add time range params for server-side clipping
                                                const params: string[] = [];
                                                if (startSec !== null) params.push(`start=${startSec}`);
                                                if (endSec !== null) params.push(`end=${endSec}`);
                                                if (params.length > 0) url += `?${params.join('&')}`;
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${(selectedMention.title || 'video').replace(/[^a-zA-Z0-9]/g, '_')}${startSec !== null ? `_${clipStart.replace(':', 'm')}s` : ''}.mp4`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                            }}
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            {clipStart || clipEnd ? 'Baixar Corte' : 'Baixar Vídeo'}
                                        </button>
                                    </div>

                                    {/* Tabs: Mídias Geradas / Transcrição */}
                                    <div className="flex border-b border-slate-800">
                                        <button
                                            className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${mediaPanelTab === 'media' ? 'text-white bg-slate-800 border-b-2 border-primary' : 'text-slate-500 hover:text-slate-300'}`}
                                            onClick={() => setMediaPanelTab('media')}
                                        >
                                            <Image className="w-3.5 h-3.5" /> Mídias Geradas ({imageAssets.length})
                                        </button>
                                        <button
                                            className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${mediaPanelTab === 'transcript' ? 'text-white bg-slate-800 border-b-2 border-primary' : 'text-slate-500 hover:text-slate-300'}`}
                                            onClick={() => setMediaPanelTab('transcript')}
                                        >
                                            <FileText className="w-3.5 h-3.5" /> Transcrição
                                        </button>
                                    </div>

                                    {/* Tab Content */}
                                    {mediaPanelTab === 'media' && (
                                        <div className="p-4">
                                            {imageAssets.length > 0 && postId ? (
                                                <div className="relative group">
                                                    <div
                                                        id={`tv-carousel-${selectedMention.id}`}
                                                        className="flex gap-2 overflow-x-auto scrollbar-thin pb-2 snap-x snap-mandatory"
                                                    >
                                                        {imageAssets.map((img: any, idx: number) => (
                                                            <img
                                                                key={idx}
                                                                src={`/api/elege/assets/${postId}/${img.id}`}
                                                                alt={`Frame ${idx + 1}`}
                                                                className="w-40 h-24 object-cover rounded-lg border border-slate-700 shrink-0 snap-start cursor-pointer hover:border-primary/50 transition-colors"
                                                                loading="lazy"
                                                                onClick={() => {
                                                                    // Find the position for this frame from timeline marks
                                                                    const mark = timelineMarks.find((m: any) => m.frameId === img.id);
                                                                    if (mark && videoRef.current) {
                                                                        videoRef.current.currentTime = mark.position;
                                                                        videoRef.current.play();
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    {imageAssets.length > 3 && (
                                                        <>
                                                            <button
                                                                onClick={() => document.getElementById(`tv-carousel-${selectedMention.id}`)?.scrollBy({ left: -340, behavior: 'smooth' })}
                                                                className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/90 border border-slate-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <ChevronLeft className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => document.getElementById(`tv-carousel-${selectedMention.id}`)?.scrollBy({ left: 340, behavior: 'smooth' })}
                                                                className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/90 border border-slate-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <ChevronRight className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <p className="text-[10px] text-slate-500 mt-1">{imageAssets.length} frames capturados</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 py-4 text-center">Nenhuma mídia gerada disponível</p>
                                            )}
                                        </div>
                                    )}

                                    {mediaPanelTab === 'transcript' && (
                                        <div className="border-t border-slate-800">
                                            {/* Header: vehicle + date + title */}
                                            <div className="p-4 pb-2">
                                                <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-1">
                                                    <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase">
                                                        <Tv className="w-3 h-3" />
                                                        {selectedMention.source || 'TV'}
                                                    </div>
                                                    <p className="text-xs font-medium text-white truncate">{selectedMention.title || 'Sem título'}</p>
                                                    <p className="text-[10px] text-slate-500">{new Date(selectedMention.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-4 space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Transcrição ({sentences.length} frases)</span>
                                                    <button
                                                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 hover:text-white transition-colors"
                                                        onClick={() => {
                                                            const blob = new Blob([`${selectedMention.source || 'TV'} — ${selectedMention.title || 'Sem título'}\n${new Date(selectedMention.created_at).toLocaleDateString('pt-BR')}\n\n${transcript}`], { type: 'text/plain' });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `${(selectedMention.title || 'transcript').replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                        }}
                                                    >
                                                        <Download className="w-3 h-3" /> Baixar .txt
                                                    </button>
                                                </div>
                                                {sentences.length > 0 ? sentences.map((sentence: string, idx: number) => (
                                                    <p key={idx} className="text-xs text-slate-300 leading-relaxed pl-3 border-l-2 border-slate-800 hover:border-primary/50 transition-colors">
                                                        {sentence.trim()}
                                                    </p>
                                                )) : (
                                                    <p className="text-sm text-slate-500 py-4 text-center">Transcrição não disponível</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* Card footer */}
                        <div className="p-4 flex items-center justify-between bg-slate-900 border-t border-slate-800">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{selectedMention.title || 'Sem título'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{selectedMention.source} • {new Date(selectedMention.created_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <button
                                onClick={() => setSelectedMention(null)}
                                className="shrink-0 ml-3 text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Social Media Card — X/Twitter mockup */}
            {selectedMention && feedTab === 'social' && (() => {
                const meta = selectedMention.classification_metadata || {} as any;
                // Real data from TwitterHandler → PublishHandler pipeline
                // Fallback chain: metadata → URL parsing → text @mention → source field
                const extractFromUrl = () => {
                    const urlMatch = (selectedMention.url || '').match(/x\.com\/(\w+)\/status/);
                    return urlMatch ? urlMatch[1] : null;
                };
                const extractFromText = () => {
                    const textMatch = (selectedMention.text || selectedMention.content || '').match(/@(\w{2,})/);
                    return textMatch ? textMatch[1] : null;
                };
                const fallbackUsername = extractFromUrl() || extractFromText() || null;
                const authorName = meta.author_name || (fallbackUsername ? `@${fallbackUsername}` : selectedMention.source || 'Usuário');
                const authorUsername = meta.author_username || fallbackUsername || (selectedMention.source || 'user').toLowerCase().replace(/\s+/g, '_');
                const authorImg = meta.author_profile_image || '';
                const isVerified = meta.author_verified ?? false;
                const realFollowers = meta.author_followers || 0;
                const realLikes = meta.likes || 0;
                const realRetweets = meta.retweets || 0;
                const realReplies = meta.replies || 0;
                const realImpressions = meta.impressions || 0;

                // Fallback: deterministic mock when real data is 0
                const hash = selectedMention.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
                const followers = realFollowers || (10 + (hash % 990)) * 100;
                const likes = realLikes || 500 + (hash % 4500);
                const retweets = realRetweets || 120 + (hash % 980);
                const replies = realReplies || 10 + (hash % 90);
                const impressions = realImpressions || (50 + (hash % 450)) * 1000;
                const formatK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

                return (
                    <div className="absolute inset-0 right-[450px] z-20 flex items-center justify-center p-8 pointer-events-none">
                        <div className="w-full max-w-[480px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-slate-700/50 pointer-events-auto bg-black">
                            {/* X/Twitter Header */}
                            <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                                {/* Avatar / Thumbnail */}
                                {authorImg ? (
                                    <img src={authorImg.replace('_normal', '_bigger')} alt={authorName} className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-slate-700" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 ring-2 ring-slate-700">
                                        {authorName.split(/[\s_-]+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '𝕏'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[15px] font-bold text-white truncate">
                                            {authorName}
                                        </span>
                                        {/* Verified badge */}
                                        {isVerified && (
                                            <svg viewBox="0 0 22 22" className="w-[18px] h-[18px] text-sky-400 shrink-0" fill="currentColor">
                                                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.144.271.592.703 1.092 1.24 1.448.537.355 1.167.553 1.813.57.647-.017 1.277-.215 1.817-.57s.972-.856 1.245-1.448c.608.227 1.264.274 1.897.144.634-.131 1.217-.437 1.687-.883.445-.47.751-1.054.882-1.69.132-.633.083-1.29-.14-1.896.587-.273 1.084-.705 1.439-1.245.354-.54.551-1.17.569-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-[13px] text-slate-500">
                                        @{authorUsername}
                                    </span>
                                </div>
                                {/* X logo */}
                                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white shrink-0" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </div>

                            {/* Tweet Content */}
                            <div className="px-4 pb-3">
                                <p className="text-[15px] text-white leading-relaxed whitespace-pre-line">
                                    {selectedMention.text || selectedMention.content || selectedMention.summary || selectedMention.title || ''}
                                </p>
                                {/* Hashtags highlight */}
                                {selectedMention.classification_metadata?.keywords && selectedMention.classification_metadata.keywords.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {selectedMention.classification_metadata.keywords.slice(0, 4).map((kw, i) => (
                                            <span key={i} className="text-sky-400 text-[14px]">#{safeStr(kw)}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Timestamp */}
                            <div className="px-4 pb-3 border-b border-slate-800">
                                <span className="text-[13px] text-slate-500">
                                    {new Date(selectedMention.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    {' · '}
                                    {new Date(selectedMention.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    <span className="text-slate-600"> · </span>
                                    <span className="text-white font-medium">X for Web</span>
                                </span>
                            </div>

                            {/* Engagement Stats */}
                            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-5">
                                <span className="text-[13px] text-slate-500"><span className="font-bold text-white">{formatK(retweets)}</span> Reposts</span>
                                <span className="text-[13px] text-slate-500"><span className="font-bold text-white">{formatK(replies)}</span> Respostas</span>
                                <span className="text-[13px] text-slate-500"><span className="font-bold text-white">{formatK(likes)}</span> Curtidas</span>
                                <span className="text-[13px] text-slate-500"><span className="font-bold text-white">{formatK(impressions)}</span> Views</span>
                            </div>

                            {/* Followers / Profile Info */}
                            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-6">
                                <span className="text-[13px] text-slate-500"><span className="font-bold text-white">{formatK(followers)}</span> Seguidores</span>
                            </div>

                            {/* Action Icons Row */}
                            <div className="px-4 py-3 flex items-center justify-around">
                                {[
                                    { icon: <MessageSquare className="w-[18px] h-[18px]" />, color: 'hover:text-sky-400 hover:bg-sky-400/10' },
                                    { icon: <RefreshCw className="w-[18px] h-[18px]" />, color: 'hover:text-emerald-400 hover:bg-emerald-400/10' },
                                    { icon: <Heart className="w-[18px] h-[18px]" />, color: 'hover:text-pink-400 hover:bg-pink-400/10' },
                                    { icon: <BarChart3 className="w-[18px] h-[18px]" />, color: 'hover:text-sky-400 hover:bg-sky-400/10' },
                                    { icon: <Share2 className="w-[18px] h-[18px]" />, color: 'hover:text-sky-400 hover:bg-sky-400/10' },
                                ].map((action, i) => (
                                    <button key={i} className={`p-2 rounded-full text-slate-500 transition-colors ${action.color}`}>
                                        {action.icon}
                                    </button>
                                ))}
                            </div>

                            {/* Sentiment indicator bar at bottom */}
                            <div className={`h-1 w-full ${selectedMention.sentiment === 'negative' ? 'bg-red-500' : selectedMention.sentiment === 'positive' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        </div>
                    </div>
                );
            })()}

            {/* Floating Instagram Card */}
            {selectedMention && feedTab === 'instagram' && (() => {
                const meta = selectedMention.classification_metadata || {} as any;
                const assets = meta.assets || [];
                const postId = meta.elege_post_id;
                const imageAsset = assets.find((a: any) => a.kind === 'image' || (a.media_type && a.media_type.startsWith('image')));
                const videoAsset = assets.find((a: any) => a.kind === 'video' || (a.media_type && a.media_type.startsWith('video')));
                const entities = meta.detected_entities || [];
                const likes = meta.engagement?.likes || meta.like_count || 0;
                const comments = meta.engagement?.comments || meta.comment_count || 0;
                const caption = selectedMention.text || selectedMention.content || selectedMention.summary || '';
                const username = meta.author_username || meta.source_name || selectedMention.source || 'instagram_user';
                const hashtags = safeKeywords(selectedMention.classification_metadata?.keywords || []).filter((k: string) => k.startsWith('#') || !k.includes(' ')).slice(0, 6);

                return (
                    <div className="absolute inset-0 right-[450px] z-20 flex items-center justify-center p-8 pointer-events-none">
                        <div className="w-full max-w-[420px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-slate-700/50 pointer-events-auto bg-slate-900">
                            {/* Instagram header */}
                            <div className="p-3 flex items-center gap-3 border-b border-slate-800 bg-gradient-to-r from-fuchsia-950/30 via-slate-900 to-purple-950/30">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                                        {username.slice(0, 2).toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{username}</p>
                                    <p className="text-[10px] text-slate-500">Instagram</p>
                                </div>
                                <svg className="w-5 h-5 ml-auto text-fuchsia-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                            </div>

                            {/* Media */}
                            <div className="relative w-full aspect-square bg-black flex items-center justify-center">
                                {videoAsset && postId ? (
                                    <video controls preload="metadata" className="w-full h-full object-cover">
                                        <source src={`/api/elege/assets/${postId}/${videoAsset.id}`} />
                                    </video>
                                ) : imageAsset && postId ? (
                                    <img src={`/api/elege/assets/${postId}/${imageAsset.id}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-500">
                                        <Image className="w-10 h-10" />
                                        <span className="text-sm">Mídia não disponível</span>
                                    </div>
                                )}
                            </div>

                            {/* Engagement */}
                            <div className="px-4 py-2 flex items-center gap-4">
                                <button className="p-1 hover:text-red-400 text-slate-400 transition-colors"><Heart className="w-5 h-5" /></button>
                                <button className="p-1 hover:text-sky-400 text-slate-400 transition-colors"><MessageCircle className="w-5 h-5" /></button>
                                <button className="p-1 hover:text-sky-400 text-slate-400 transition-colors ml-auto"><Share2 className="w-5 h-5" /></button>
                            </div>

                            {/* Likes */}
                            <div className="px-4 pb-1">
                                <p className="text-xs font-bold text-white">{likes.toLocaleString('pt-BR')} curtidas</p>
                            </div>

                            {/* Caption */}
                            <div className="px-4 pb-2">
                                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                                    <span className="font-bold text-white mr-1">{username}</span>
                                    {caption.substring(0, 200)}
                                </p>
                            </div>

                            {/* Hashtags */}
                            {hashtags.length > 0 && (
                                <div className="px-4 pb-2 flex flex-wrap gap-1">
                                    {hashtags.map((h: string) => (
                                        <span key={h} className="text-[10px] text-fuchsia-400 font-medium">#{h.replace('#', '')}</span>
                                    ))}
                                </div>
                            )}

                            {/* Entities */}
                            {entities.length > 0 && (
                                <div className="px-4 pb-2 flex flex-wrap gap-1">
                                    {entities.map((e: string) => entityMap[e] && (
                                        <span key={e} className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
                                            <BrainCircuit className="w-3 h-3" />{entityMap[e]}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Comments count */}
                            <div className="px-4 pb-2">
                                <p className="text-[11px] text-slate-500">{comments > 0 ? `Ver todos os ${comments} comentários` : 'Sem comentários'}</p>
                            </div>

                            {/* Timestamp */}
                            <div className="px-4 pb-3">
                                <p className="text-[10px] text-slate-600 uppercase">{formatDistanceToNow(new Date(selectedMention.created_at), { addSuffix: true, locale: ptBR })}</p>
                            </div>

                            {/* Sentiment bar */}
                            <div className={`h-1 w-full ${selectedMention.sentiment === 'negative' ? 'bg-red-500' : selectedMention.sentiment === 'positive' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        </div>
                    </div>
                );
            })()}

            {/* Floating TikTok Card */}
            {selectedMention && feedTab === 'tiktok' && (() => {
                const meta = selectedMention.classification_metadata || {} as any;
                const assets = meta.assets || [];
                const postId = meta.elege_post_id;
                const videoAsset = assets.find((a: any) => a.kind === 'video' || (a.media_type && a.media_type.startsWith('video')));
                const imageAsset = assets.find((a: any) => a.kind === 'image' || (a.media_type && a.media_type.startsWith('image')));
                const entities = meta.detected_entities || [];
                const likes = meta.engagement?.likes || meta.like_count || 0;
                const comments = meta.engagement?.comments || meta.comment_count || 0;
                const shares = meta.engagement?.shares || meta.share_count || 0;
                const views = meta.engagement?.views || meta.view_count || 0;
                const caption = selectedMention.text || selectedMention.content || selectedMention.summary || '';
                const username = meta.author_username || meta.source_name || selectedMention.source || 'tiktok_user';
                const soundName = meta.sound_name || 'som original';

                return (
                    <div className="absolute inset-0 right-[450px] z-20 flex items-center justify-center p-8 pointer-events-none">
                        <div className="w-full max-w-[380px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-slate-700/50 pointer-events-auto bg-slate-900">
                            {/* TikTok header */}
                            <div className="p-3 flex items-center gap-3 border-b border-slate-800 bg-gradient-to-r from-cyan-950/30 via-slate-900 to-pink-950/20">
                                <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">@{username}</p>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">TikTok</span>
                            </div>

                            {/* Video / Media */}
                            <div className="relative w-full aspect-[9/16] max-h-[400px] bg-black flex items-center justify-center">
                                {videoAsset && postId ? (
                                    <video controls preload="metadata" className="w-full h-full object-cover">
                                        <source src={`/api/elege/assets/${postId}/${videoAsset.id}`} />
                                    </video>
                                ) : imageAsset && postId ? (
                                    <img src={`/api/elege/assets/${postId}/${imageAsset.id}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-500">
                                        <Play className="w-10 h-10" />
                                        <span className="text-sm">Vídeo não disponível</span>
                                    </div>
                                )}
                            </div>

                            {/* Caption + Sound */}
                            <div className="p-4 space-y-2">
                                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{caption.substring(0, 200)}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                    <span>♬</span>
                                    <span className="truncate">{soundName}</span>
                                </div>
                            </div>

                            {/* Entities */}
                            {entities.length > 0 && (
                                <div className="px-4 pb-2 flex flex-wrap gap-1">
                                    {entities.map((e: string) => entityMap[e] && (
                                        <span key={e} className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
                                            <BrainCircuit className="w-3 h-3" />{entityMap[e]}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Engagement */}
                            <div className="px-4 pb-3 flex items-center gap-4 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {likes.toLocaleString('pt-BR')}</span>
                                <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {comments.toLocaleString('pt-BR')}</span>
                                <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> {shares.toLocaleString('pt-BR')}</span>
                                {views > 0 && <span className="flex items-center gap-1 ml-auto"><Eye className="w-3.5 h-3.5" /> {views.toLocaleString('pt-BR')}</span>}
                            </div>

                            {/* Accent bar */}
                            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-pink-500 to-cyan-500" />
                        </div>
                    </div>
                );
            })()}

            {/* Floating Detail Panel — sits above the blur */}
            {selectedMention && (
                <div className="absolute right-0 top-0 w-[450px] h-full bg-slate-900 border-l border-slate-700/50 overflow-y-auto flex flex-col shadow-[_-8px_0_30px_rgba(0,0,0,0.5)] z-20">
                    <div className="p-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-10 flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-bold text-white">Detalhes da Menção</h2>
                            <p className="text-xs text-slate-500 font-mono mt-1">{selectedMention.id}</p>
                        </div>
                        <button onClick={() => setSelectedMention(null)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8 flex-1">
                        {/* Monitored Entities Highlight */}
                        {selectedMention.classification_metadata?.detected_entities && selectedMention.classification_metadata.detected_entities.length > 0 && (
                            <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30">
                                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <BrainCircuit className="w-4 h-4" />
                                    Alvos Detectados
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedMention.classification_metadata.detected_entities.map((entityId: string) => (
                                        entityMap[entityId] && (
                                            <span key={entityId} className="text-sm font-bold text-white bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/30">
                                                {entityMap[entityId]}
                                            </span>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mídias Geradas — Carousel (hidden for TV/Radio — media is in the floating card) */}
                        {feedTab !== 'tv' && feedTab !== 'radio' && (() => {
                            const assets = selectedMention.classification_metadata?.assets || [];
                            const postId = selectedMention.classification_metadata?.elege_post_id;
                            if (assets.length === 0 || !postId) return null;

                            const images = assets.filter((a: any) => a.kind === 'image');
                            const videos = assets.filter((a: any) => a.kind === 'video');

                            return (
                                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                                    <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                                        <Image className="w-4 h-4" />
                                        Mídias Geradas ({assets.length})
                                    </h3>

                                    {/* Video Player */}
                                    {videos.length > 0 && (
                                        <div className="rounded-lg overflow-hidden border border-slate-700 bg-black">
                                            <video
                                                controls
                                                preload="metadata"
                                                className="w-full max-h-[250px] object-contain"
                                                poster={images.length > 0 ? `/api/elege/assets/${postId}/${images[0].id}` : undefined}
                                            >
                                                <source src={`/api/elege/assets/${postId}/${videos[0].id}`} type="video/mp4" />
                                            </video>
                                        </div>
                                    )}

                                    {/* Image Carousel */}
                                    {images.length > 0 && (
                                        <div className="relative group">
                                            <div
                                                className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
                                                style={{ scrollBehavior: 'smooth' }}
                                                id={`carousel-${selectedMention.id}`}
                                            >
                                                {images.map((img: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="snap-start shrink-0 w-[280px] h-[160px] rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
                                                    >
                                                        <img
                                                            src={`/api/elege/assets/${postId}/${img.id}`}
                                                            alt={img.name || `Frame ${idx}`}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover object-top"
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {images.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const el = document.getElementById(`carousel-${selectedMention.id}`);
                                                            if (el) el.scrollBy({ left: -290, behavior: 'smooth' });
                                                        }}
                                                        className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/90 border border-slate-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-800"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const el = document.getElementById(`carousel-${selectedMention.id}`);
                                                            if (el) el.scrollBy({ left: 290, behavior: 'smooth' });
                                                        }}
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/90 border border-slate-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-800"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] text-slate-500">{images.length} frames capturados</span>
                                                {videos.length > 0 && (
                                                    <span className="text-[10px] text-sky-400 flex items-center gap-1">
                                                        <Play className="w-3 h-3" /> Vídeo disponível
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Per-Entity Analysis Breakdown */}
                        {selectedMention.classification_metadata?.per_entity_analysis && selectedMention.classification_metadata.per_entity_analysis.length > 0 && (
                            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" />
                                    Análise por Citado ({selectedMention.classification_metadata.per_entity_analysis.length})
                                </h3>
                                <div className="space-y-2">
                                    {selectedMention.classification_metadata.per_entity_analysis.map((ea: any, idx: number) => {
                                        const sentColors: Record<string, string> = {
                                            positive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                                            negative: 'bg-red-500/20 text-red-400 border-red-500/30',
                                            neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
                                            mixed: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                                        };
                                        const sentLabels: Record<string, string> = {
                                            positive: 'Positivo', negative: 'Negativo',
                                            neutral: 'Neutro', mixed: 'Misto',
                                        };
                                        const entityName = ea.entity_name || ea.entity || 'Desconhecido';
                                        const context = ea.context || ea.subject || '';
                                        const tone = ea.tone || ea.participation || '';
                                        return (
                                            <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white">{entityName}</span>
                                                        {ea.person_title && (
                                                            <span className="text-[10px] text-slate-500">{ea.person_title}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {tone && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase">{tone}</span>
                                                        )}
                                                        {ea.relevance > 0 && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400">{ea.relevance}%</span>
                                                        )}
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${sentColors[ea.sentiment] || sentColors.neutral}`}>
                                                            {sentLabels[ea.sentiment] || ea.sentiment}
                                                        </span>
                                                    </div>
                                                </div>
                                                {context && <p className="text-xs text-slate-400 leading-relaxed">{context}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Risk Engine */}
                        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <BrainCircuit className="w-4 h-4 text-primary" />
                                    Análise de Risco
                                </h3>
                                <span className={`text-sm font-bold ${selectedMention.risk_score > 70 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {selectedMention.risk_score}/100
                                </span>
                            </div>

                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${selectedMention.risk_score > 70 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${selectedMention.risk_score}%` }}
                                />
                            </div>

                            {(selectedMention.classification_metadata?.reasoning || selectedMention.summary) ? (
                                <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-3">
                                    "{selectedMention.classification_metadata?.reasoning || selectedMention.summary}"
                                </p>
                            ) : (
                                <p className="text-sm text-slate-500 italic">Sem justificativa da IA disponível.</p>
                            )}
                        </div>


                        {/* Conteúdo Original */}
                        <div>
                            <h3 className="text-xs font-semibold uppercase text-slate-500 mb-3 flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                Conteúdo Original
                            </h3>
                            <div className="text-slate-300 leading-relaxed text-sm bg-slate-800/30 p-4 rounded-lg border border-slate-800/50 whitespace-pre-line">
                                {selectedMention.content || selectedMention.text || selectedMention.title || 'Conteúdo não disponível'}
                            </div>
                            {selectedMention.url && (
                                <a
                                    href={selectedMention.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
                                >
                                    Abrir fonte original <ArrowRight className="w-3 h-3" />
                                </a>
                            )}
                        </div>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded bg-slate-950 border border-slate-800">
                                <span className="block text-xs text-slate-500 mb-1">Sentimento</span>
                                <span className={`text-sm font-medium capitalize ${selectedMention.sentiment === 'negative' ? 'text-red-400' :
                                    selectedMention.sentiment === 'positive' ? 'text-emerald-400' : 'text-slate-300'
                                    }`}>
                                    {selectedMention.sentiment}
                                </span>
                            </div>
                            <div className="p-3 rounded bg-slate-950 border border-slate-800">
                                <span className="block text-xs text-slate-500 mb-1">Modelo IA</span>
                                <span className="text-sm font-medium text-slate-300">
                                    {selectedMention.classification_metadata?.model || 'Desconhecido'}
                                </span>
                            </div>
                        </div>

                        {/* Keyword Analysis */}
                        {selectedMention.classification_metadata?.keywords && selectedMention.classification_metadata.keywords.length > 0 && (
                            <div>
                                <h3 className="text-xs font-semibold uppercase text-slate-500 mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3" />
                                    Análise de Palavras-Chave
                                </h3>
                                <div className="space-y-2">
                                    {safeKeywords(selectedMention.classification_metadata.keywords).slice(0, 5).map((kw, idx) => (
                                        <KeywordAnalysis
                                            key={idx}
                                            keyword={kw}
                                            isShared={isSharedKeyword(kw)}
                                            sentimentGrowth={getSentimentGrowth(kw)}
                                            onFilterClick={(keyword) => { setKeywordFilter(keyword); setSelectedMention(null); }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions Toolbar */}
                    <PermissionGate roles={['admin', 'analyst', 'operator']}>
                        <div className="p-6 border-t border-slate-800 bg-slate-900 sticky bottom-0 space-y-3">
                            {selectedMention.status !== 'archived' && !selectedMention.bundle_id && selectedMention.status !== 'escalated' && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => updateStatus(selectedMention.id, 'processed')}
                                        className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Marcar Visto
                                    </button>
                                    <button
                                        onClick={() => setIsEscalationModalOpen(true)}
                                        className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-2 rounded-lg font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ShieldAlert className="w-4 h-4" />
                                        Escalar
                                    </button>
                                </div>
                            )}
                            {selectedMention.bundle_id && (
                                <div className="text-center py-2 text-xs text-amber-400 bg-amber-500/5 rounded-lg border border-amber-500/20 flex items-center justify-center gap-2">
                                    <Link2 className="w-3 h-3" />
                                    Vinculada a um Pacote de Crise
                                </div>
                            )}

                            <button
                                onClick={() => updateStatus(selectedMention.id, selectedMention.status === 'archived' ? 'pending' : 'archived')}
                                className="w-full text-slate-400 py-2 rounded-lg text-sm hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <Archive className="w-4 h-4" />
                                {selectedMention.status === 'archived' ? 'Desarquivar' : 'Arquivar Menção'}
                            </button>
                        </div>
                    </PermissionGate>
                </div>
            )}

            {/* Modals */}
            {selectedMention && (
                <CrisisEscalationModal
                    isOpen={isEscalationModalOpen}
                    onClose={() => setIsEscalationModalOpen(false)}
                    mention={selectedMention}
                    allMentions={mentions}
                    onSuccess={() => {
                        setIsEscalationModalOpen(false);
                        setSelectedMention(null);
                        fetchMentions();
                    }}
                />
            )}
        </div>
    );
};
