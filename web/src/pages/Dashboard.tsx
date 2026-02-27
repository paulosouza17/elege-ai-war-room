import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import {
    Activity, TrendingUp, TrendingDown, Users, AlertOctagon, ArrowUpRight, ArrowDownRight,
    MessageSquare, RefreshCw, Shield, Newspaper, Eye, BarChart3, Zap, MapPin, Layers, Trash2,
    X, Clock, ShieldAlert, Loader2, ChevronDown, ChevronUp, Archive, ExternalLink
} from 'lucide-react';
import { WordCloudChart } from '@/components/dashboard/WordCloud';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserActivations } from '@/hooks/useUserActivations';
import { CrisisEscalationModal } from '@/components/CrisisEscalationModal';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
    total_mentions: number;
    mentions_24h: number;
    mentions_growth_pct: number;
    avg_risk_score: number;
    sentiment_net: number;
    sentiment_positive: number;
    sentiment_negative: number;
    sentiment_neutral: number;
    active_activations: number;
    unique_sources: number;
    unique_entities: number;
    social_mentions_1h: number;
    system_status: 'OPERATIONAL' | 'DEGRADED';
    recent_alerts: any[];
    recent_feed: any[];
    is_crisis: boolean;
    crisis_reasons: string[];
}

interface ActivationTab {
    id: string;
    name: string;
}

export const Dashboard: React.FC = () => {
    const ALERTS_PAGE_SIZE = 8;
    const FEED_PAGE_SIZE = 10;
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const { activations: activationTabs, activationIds: allActivationIds, loading: activationsLoading } = useUserActivations();
    const [selectedActivationId, setSelectedActivationId] = useState<string | null>(null);
    const [clearingFeed, setClearingFeed] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [wordFeedItems, setWordFeedItems] = useState<any[]>([]);
    const [wordFeedLoading, setWordFeedLoading] = useState(false);
    // Pagination states for alerts and feed
    const [alertsTotal, setAlertsTotal] = useState(0);
    const [alertsHasMore, setAlertsHasMore] = useState(false);
    const [alertsLoadingMore, setAlertsLoadingMore] = useState(false);
    const [feedTotal, setFeedTotal] = useState(0);
    const [feedHasMore, setFeedHasMore] = useState(false);
    const [feedLoadingMore, setFeedLoadingMore] = useState(false);
    const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
    const [escalationAlert, setEscalationAlert] = useState<any | null>(null);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleWordClick = useCallback(async (word: string) => {
        setSelectedWord(word);
        setWordFeedLoading(true);
        try {
            const filterIds = selectedActivationId ? [selectedActivationId] : allActivationIds;

            // Try exact keyword array match first (case-sensitive contains)
            let query = supabase
                .from('intelligence_feed')
                .select('id, text, title, summary, source, sentiment, risk_score, created_at, status, classification_metadata, keywords')
                .order('created_at', { ascending: false })
                .limit(50);

            if (filterIds.length === 1) {
                query = query.eq('activation_id', filterIds[0]);
            } else if (filterIds.length > 1) {
                query = query.in('activation_id', filterIds);
            }

            // keywords are stored with original case, word cloud normalizes to lowercase
            // Use ilike on the keywords column (cast as text) for case-insensitive search
            query = query.or(`keywords.cs.{${word}},keywords.cs.{${word.charAt(0).toUpperCase() + word.slice(1)}},title.ilike.%${word}%,summary.ilike.%${word}%`);

            const { data } = await query;
            setWordFeedItems(data || []);
        } catch (err) {
            console.error('[WordFeed] Error:', err);
            setWordFeedItems([]);
        } finally {
            setWordFeedLoading(false);
        }
    }, [selectedActivationId, allActivationIds]);

    const handleClearFeed = async () => {
        if (!selectedActivationId) return;
        if (deleteConfirmText !== 'DELETE') return;
        setShowDeleteModal(false);
        setDeleteConfirmText('');
        setClearingFeed(true);
        try {
            console.log('[ClearData] Starting for activation:', selectedActivationId);

            // 1. Delete crisis_events for this activation
            const { error: ceErr } = await supabase
                .from('crisis_events')
                .delete()
                .eq('activation_id', selectedActivationId);
            console.log('[ClearData] crisis_events delete:', ceErr ? ceErr.message : 'OK');

            // 2. Get feed IDs to find linked crisis_packets
            const { data: feedRows } = await supabase
                .from('intelligence_feed')
                .select('id')
                .eq('activation_id', selectedActivationId);
            const feedIds = (feedRows || []).map(r => r.id);
            console.log('[ClearData] feed items found:', feedIds.length);

            // 3. Always try to delete crisis_packets
            //    Fetch all and delete those with empty evidence OR overlapping with this feed
            const { data: allCrises, error: crFetchErr } = await supabase
                .from('crisis_packets')
                .select('id, evidence_ids');
            console.log('[ClearData] crisis_packets found:', allCrises?.length || 0, crFetchErr ? `ERROR: ${crFetchErr.message}` : '');

            if (allCrises && allCrises.length > 0) {
                let crisisIdsToDelete: string[];

                if (feedIds.length > 0) {
                    // Delete packets with empty evidence OR overlapping with feed
                    crisisIdsToDelete = allCrises
                        .filter(c => {
                            const eids = c.evidence_ids || [];
                            return eids.length === 0 || eids.some((eid: string) => feedIds.includes(eid));
                        })
                        .map(c => c.id);
                } else {
                    // Feed already empty — delete ALL crisis_packets (no way to filter by activation)
                    crisisIdsToDelete = allCrises.map(c => c.id);
                }

                console.log('[ClearData] crisis_packets to delete:', crisisIdsToDelete.length);

                if (crisisIdsToDelete.length > 0) {
                    // crisis_evidence cascades automatically
                    const { error: cpErr } = await supabase
                        .from('crisis_packets')
                        .delete()
                        .in('id', crisisIdsToDelete);
                    console.log('[ClearData] crisis_packets delete:', cpErr ? cpErr.message : 'OK');
                    if (cpErr) {
                        alert(`Erro ao excluir pacotes de crise: ${cpErr.message}`);
                    }
                }
            }

            // 4. Delete feed entries
            if (feedIds.length > 0) {
                const { error: feedErr } = await supabase
                    .from('intelligence_feed')
                    .delete()
                    .eq('activation_id', selectedActivationId);
                console.log('[ClearData] feed delete:', feedErr ? feedErr.message : 'OK');
                if (feedErr) {
                    alert(`Erro ao limpar feed: ${feedErr.message}`);
                }
            }

            fetchStats(selectedActivationId, allActivationIds);
        } catch (err: any) {
            console.error('[ClearData] Exception:', err);
            alert(`Erro inesperado: ${err.message}`);
        } finally {
            setClearingFeed(false);
        }
    };

    const fetchStats = useCallback(async (activationId: string | null, filterActivationIds: string[]) => {
        setLoading(true);
        try {
            // If user has NO activations at all, show zeroed dashboard
            if (filterActivationIds.length === 0) {
                setStats({
                    total_mentions: 0, mentions_24h: 0, mentions_growth_pct: 0,
                    avg_risk_score: 0, sentiment_net: 0, sentiment_positive: 0,
                    sentiment_negative: 0, sentiment_neutral: 0, active_activations: 0,
                    unique_sources: 0, unique_entities: 0, social_mentions_1h: 0,
                    system_status: 'OPERATIONAL',
                    recent_alerts: [], recent_feed: [], is_crisis: false, crisis_reasons: [],
                });
                return;
            }

            // Determine filter: specific activation OR all user's activations
            const filterIds = activationId ? [activationId] : filterActivationIds;

            // Helper: apply activation filter to any query
            const applyFilter = (query: any) => {
                return filterIds.length === 1
                    ? query.eq('activation_id', filterIds[0])
                    : query.in('activation_id', filterIds);
            };

            // 1. RPC for base stats (used only for active_activations count)
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats_v2');
            if (rpcError) console.error('RPC error:', rpcError);

            // 2. Mentions last 24h
            const now = new Date();
            const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

            const { count: mentions24h } = await applyFilter(
                supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).gte('created_at', h24ago)
            );

            const { count: mentionsPrev24h } = await applyFilter(
                supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).gte('created_at', h48ago).lt('created_at', h24ago)
            );

            const current = mentions24h || 0;
            const prev = mentionsPrev24h || 0;
            const growthPct = prev > 0 ? Math.round(((current - prev) / prev) * 100) : (current > 0 ? 100 : 0);

            // 3. Average risk score
            const { data: riskData } = await applyFilter(
                supabase.from('intelligence_feed').select('risk_score').not('risk_score', 'is', null).gte('created_at', h24ago)
            );

            const riskScores = (riskData || []).map((r: any) => r.risk_score).filter((s: any) => typeof s === 'number');
            const avgRisk = riskScores.length > 0 ? Math.round(riskScores.reduce((a: number, b: number) => a + b, 0) / riskScores.length) : 0;

            // 4. Unique sources
            const { data: sourcesData } = await applyFilter(
                supabase.from('intelligence_feed').select('source').not('source', 'is', null).gte('created_at', h24ago)
            );
            const uniqueSources = new Set((sourcesData || []).map((r: any) => r.source).filter(Boolean)).size;

            // 5. Unique entities from keywords
            const { data: kwData } = await applyFilter(
                supabase.from('intelligence_feed').select('keywords').not('keywords', 'is', null).gte('created_at', h24ago)
            );
            const allKws = new Set<string>();
            (kwData || []).forEach((r: any) => {
                if (Array.isArray(r.keywords)) r.keywords.forEach((k: string) => allKws.add(k.trim().toLowerCase()));
            });

            // 6. Sentiment counts
            const buildSentimentQuery = (sentiment: string) => {
                return applyFilter(
                    supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).eq('sentiment', sentiment)
                );
            };
            const [{ count: p }, { count: ng }, { count: nu }] = await Promise.all([
                buildSentimentQuery('positive'),
                buildSentimentQuery('negative'),
                buildSentimentQuery('neutral'),
            ]);
            const sentPos = p || 0;
            const sentNeg = ng || 0;
            const sentNeu = nu || 0;

            // 7. Total mentions
            const { count: totalCount } = await applyFilter(
                supabase.from('intelligence_feed').select('id', { count: 'exact', head: true })
            );
            const totalMentions = totalCount || 0;

            // 8b. Social media mentions (last 1 hour)
            const h1ago = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            const socialSources = ['twitter', 'instagram', 'facebook', 'tiktok', 'x', 'Twitter', 'Instagram', 'Facebook', 'TikTok', 'X'];
            const { count: socialCount } = await applyFilter(
                supabase.from('intelligence_feed')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', h1ago)
                    .in('source', socialSources)
            );

            // 8. Alerts (with count)
            const { data: recentAlerts, count: alertsCount } = await applyFilter(
                supabase.from('intelligence_feed').select('*', { count: 'exact' })
                    .or('risk_score.gte.70,and(sentiment.eq.negative,risk_score.gte.50)')
                    .order('created_at', { ascending: false }).range(0, ALERTS_PAGE_SIZE - 1)
            );

            // 9. Recent feed (with count)
            const { data: recentFeed, count: feedCount } = await applyFilter(
                supabase.from('intelligence_feed').select('*', { count: 'exact' })
                    .order('created_at', { ascending: false }).range(0, FEED_PAGE_SIZE - 1)
            );

            // 10. Crisis detection
            const crisisReasons: string[] = [];
            if (avgRisk >= 70) crisisReasons.push(`Risk Score médio alto (${avgRisk})`);
            if (growthPct > 50 && current > 5) crisisReasons.push(`Pico de menções (+${growthPct}%)`);
            if (sentNeg > sentPos * 2 && sentNeg > 3) crisisReasons.push('Sentimento predominantemente negativo');
            if ((recentAlerts || []).length >= 5) crisisReasons.push(`${(recentAlerts || []).length} alertas ativos`);

            const alertsTotalVal = alertsCount ?? 0;
            setAlertsTotal(alertsTotalVal);
            setAlertsHasMore((recentAlerts || []).length < alertsTotalVal);
            const feedTotalVal = feedCount ?? 0;
            setFeedTotal(feedTotalVal);
            setFeedHasMore((recentFeed || []).length < feedTotalVal);

            setStats({
                total_mentions: totalMentions,
                mentions_24h: current,
                mentions_growth_pct: growthPct,
                avg_risk_score: avgRisk,
                sentiment_net: sentPos - sentNeg,
                sentiment_positive: sentPos,
                sentiment_negative: sentNeg,
                sentiment_neutral: sentNeu,
                active_activations: rpcData?.overview?.active_activations ?? 0,
                unique_sources: uniqueSources,
                unique_entities: allKws.size,
                social_mentions_1h: socialCount || 0,
                system_status: 'OPERATIONAL',
                recent_alerts: recentAlerts || [],
                recent_feed: recentFeed || [],
                is_crisis: crisisReasons.length > 0,
                crisis_reasons: crisisReasons,
            });
        } catch (err) {
            console.error('Critical error in dashboard fetch:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMoreAlerts = useCallback(async () => {
        if (!stats || alertsLoadingMore) return;
        setAlertsLoadingMore(true);
        const filterIds = selectedActivationId ? [selectedActivationId] : allActivationIds;
        const applyFilter = (query: any) => {
            return filterIds.length === 1
                ? query.eq('activation_id', filterIds[0])
                : query.in('activation_id', filterIds);
        };
        const from = stats.recent_alerts.length;
        const to = from + ALERTS_PAGE_SIZE - 1;
        const { data } = await applyFilter(
            supabase.from('intelligence_feed').select('*')
                .or('risk_score.gte.70,and(sentiment.eq.negative,risk_score.gte.50)')
                .order('created_at', { ascending: false }).range(from, to)
        );
        const newAlerts = data || [];
        const updatedAlerts = [...stats.recent_alerts, ...newAlerts];
        setStats(prev => prev ? { ...prev, recent_alerts: updatedAlerts } : prev);
        setAlertsHasMore(updatedAlerts.length < alertsTotal);
        setAlertsLoadingMore(false);
    }, [stats, selectedActivationId, allActivationIds, alertsTotal, alertsLoadingMore]);

    const loadMoreFeed = useCallback(async () => {
        if (!stats || feedLoadingMore) return;
        setFeedLoadingMore(true);
        const filterIds = selectedActivationId ? [selectedActivationId] : allActivationIds;
        const applyFilter = (query: any) => {
            return filterIds.length === 1
                ? query.eq('activation_id', filterIds[0])
                : query.in('activation_id', filterIds);
        };
        const from = stats.recent_feed.length;
        const to = from + FEED_PAGE_SIZE - 1;
        const { data } = await applyFilter(
            supabase.from('intelligence_feed').select('*')
                .order('created_at', { ascending: false }).range(from, to)
        );
        const newFeed = data || [];
        const updatedFeed = [...stats.recent_feed, ...newFeed];
        setStats(prev => prev ? { ...prev, recent_feed: updatedFeed } : prev);
        setFeedHasMore(updatedFeed.length < feedTotal);
        setFeedLoadingMore(false);
    }, [stats, selectedActivationId, allActivationIds, feedTotal, feedLoadingMore]);

    useEffect(() => {
        if (activationsLoading) return; // Wait for hook to resolve
        fetchStats(selectedActivationId, allActivationIds);
        const interval = setInterval(() => fetchStats(selectedActivationId, allActivationIds), 60000);
        return () => clearInterval(interval);
    }, [selectedActivationId, allActivationIds, activationsLoading, fetchStats]);

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="text-center space-y-4">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                    <p className="text-slate-400">Sincronizando feed de inteligência...</p>
                </div>
            </div>
        );
    }

    const s = stats || {
        total_mentions: 0, mentions_24h: 0, mentions_growth_pct: 0,
        avg_risk_score: 0, sentiment_net: 0, sentiment_positive: 0,
        sentiment_negative: 0, sentiment_neutral: 0, active_activations: 0,
        unique_sources: 0, unique_entities: 0, social_mentions_1h: 0,
        system_status: 'OPERATIONAL' as const,
        recent_alerts: [], recent_feed: [], is_crisis: false, crisis_reasons: [],
    };

    const riskColor = s.avg_risk_score >= 70 ? 'text-red-400' : s.avg_risk_score >= 40 ? 'text-amber-400' : 'text-green-400';
    const riskBg = s.avg_risk_score >= 70 ? 'bg-red-500/10' : s.avg_risk_score >= 40 ? 'bg-amber-500/10' : 'bg-green-500/10';
    const riskBorder = s.avg_risk_score >= 70 ? 'border-l-red-500' : s.avg_risk_score >= 40 ? 'border-l-amber-500' : 'border-l-green-500';

    const selectedActivationName = activationTabs.find(a => a.id === selectedActivationId)?.name;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        {selectedActivationId ? selectedActivationName : 'Centro de Comando'}
                    </h1>
                    <p className="text-slate-400">
                        {selectedActivationId
                            ? 'Dashboard filtrado por esta ativação.'
                            : 'Monitoramento de ameaças e vigilância do sistema.'
                        }
                    </p>
                </div>
                <div className="flex gap-3">
                    {selectedActivationId && (
                        <PermissionGate roles={['admin']}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteModal(true)}
                                disabled={clearingFeed}
                                className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                            >
                                <Trash2 className={`w-4 h-4 mr-2 ${clearingFeed ? 'animate-spin' : ''}`} />
                                {clearingFeed ? 'Limpando...' : 'Limpar Dados'}
                            </Button>
                        </PermissionGate>
                    )}
                    <Button variant="outline" size="sm" onClick={() => fetchStats(selectedActivationId, allActivationIds)}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <PermissionGate roles={['admin', 'operator', 'analyst']}>
                        {s.is_crisis ? (
                            <Button variant="danger" size="sm" className="animate-pulse-slow">
                                <AlertOctagon className="w-4 h-4 mr-2" />
                                ⚠️ MODO CRISE — {s.crisis_reasons.length} indicador{s.crisis_reasons.length > 1 ? 'es' : ''}
                            </Button>
                        ) : s.recent_alerts.length > 0 ? (
                            <Button variant="danger" size="sm">
                                <AlertOctagon className="w-4 h-4 mr-2" />
                                {s.recent_alerts.length} Alerta{s.recent_alerts.length > 1 ? 's' : ''} Ativo{s.recent_alerts.length > 1 ? 's' : ''}
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" className="text-slate-500 border-slate-700 bg-slate-800/50">
                                <Shield className="w-4 h-4 mr-2 text-teal-500" />
                                Monitoramento: Normal
                            </Button>
                        )}
                    </PermissionGate>
                </div>
            </div>

            {/* Activation Tabs */}
            {activationTabs.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
                    <button
                        onClick={() => setSelectedActivationId(null)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${selectedActivationId === null
                            ? 'bg-primary/15 text-primary border-primary/30 shadow-lg shadow-primary/5'
                            : 'bg-slate-900/50 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        Visão Geral
                    </button>
                    {activationTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedActivationId(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${selectedActivationId === tab.id
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-lg shadow-amber-500/5'
                                : 'bg-slate-900/50 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            {tab.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Crisis Banner */}
            {s.is_crisis && (
                <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
                    <AlertOctagon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-red-300 font-bold text-sm">Indicadores de Crise Detectados</h3>
                        <ul className="text-red-400/80 text-xs mt-1 space-y-0.5">
                            {s.crisis_reasons.map((r, i) => (
                                <li key={i}>• {r}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Row 1 — Primary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Menções */}
                <Card className="border-l-4 border-l-primary bg-slate-900/50">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Menções</p>
                                <h3 className="text-3xl font-mono font-bold text-white mt-1">{s.total_mentions}</h3>
                            </div>
                            <Tooltip content="Contagem total de matérias, notícias e menções coletadas de todas as fontes monitoradas." position="left">
                                <div className="p-2 bg-primary/10 rounded-full cursor-help">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                </div>
                            </Tooltip>
                        </div>
                        <div className="mt-4 flex items-center text-xs">
                            {s.mentions_growth_pct > 0 ? (
                                <span className={`flex items-center font-medium ${s.mentions_growth_pct > 50 ? 'text-red-400' : 'text-primary'}`}>
                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                    +{s.mentions_growth_pct}% (24h)
                                </span>
                            ) : s.mentions_growth_pct < 0 ? (
                                <span className="flex items-center font-medium text-slate-500">
                                    <ArrowDownRight className="w-3 h-3 mr-1" />
                                    {s.mentions_growth_pct}% (24h)
                                </span>
                            ) : (
                                <span className="text-slate-500 font-medium">Estável</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Risk Score Médio */}
                <Card className={`border-l-4 bg-slate-900/50 ${riskBorder}`}>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Risk Score Médio</p>
                                <h3 className={`text-3xl font-mono font-bold mt-1 ${riskColor}`}>
                                    {s.avg_risk_score}
                                </h3>
                            </div>
                            <Tooltip content="Média do score de risco (0-100) das últimas 24h. 🟢 0-39: Baixo | 🟡 40-69: Atenção | 🔴 70+: Crítico." position="left">
                                <div className={`p-2 rounded-full cursor-help ${riskBg}`}>
                                    <Zap className={`w-5 h-5 ${riskColor}`} />
                                </div>
                            </Tooltip>
                        </div>
                        <div className="mt-4 text-xs text-slate-500">
                            {s.avg_risk_score >= 70 ? '🔴 Nível Crítico' : s.avg_risk_score >= 40 ? '🟡 Atenção' : '🟢 Baixo'} • Últimas 24h
                        </div>
                    </CardContent>
                </Card>

                {/* Sentimento Net */}
                <Card className={`border-l-4 bg-slate-900/50 ${s.sentiment_net < 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Sentimento (Net)</p>
                                <h3 className={`text-3xl font-mono font-bold mt-1 ${s.sentiment_net < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {s.sentiment_net > 0 ? '+' : ''}{s.sentiment_net}
                                </h3>
                            </div>
                            <Tooltip content="Saldo entre menções positivas e negativas (positivos − negativos). Negativo indica predominância de conteúdo desfavorável." position="left">
                                <div className={`p-2 rounded-full cursor-help ${s.sentiment_net < 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                                    {s.sentiment_net < 0 ? (
                                        <TrendingDown className="w-5 h-5 text-red-400" />
                                    ) : (
                                        <TrendingUp className="w-5 h-5 text-green-400" />
                                    )}
                                </div>
                            </Tooltip>
                        </div>
                        <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                            <span className="text-green-500">▲ {s.sentiment_positive}</span>
                            <span className="text-slate-500">● {s.sentiment_neutral}</span>
                            <span className="text-red-500">▼ {s.sentiment_negative}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Ativações */}
                <Card className="border-l-4 border-l-amber-500 bg-slate-900/50">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Ativações</p>
                                <h3 className="text-3xl font-mono font-bold text-white mt-1">{s.active_activations}</h3>
                            </div>
                            <Tooltip content="Número de ativações (monitoramentos) com status ativo no momento." position="left">
                                <div className="p-2 bg-amber-500/10 rounded-full cursor-help">
                                    <Activity className="w-5 h-5 text-amber-500" />
                                </div>
                            </Tooltip>
                        </div>
                        <div className="mt-4 text-xs text-slate-500">
                            Monitoramentos em andamento
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2 — Secondary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Social Media Mentions 1h */}
                <Card className="bg-slate-900/30 border-slate-800 border-l-4 border-l-sky-500">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Redes Sociais</p>
                            <span className="text-[10px] text-slate-600">1h</span>
                        </div>
                        <p className="text-2xl font-mono font-bold text-white">{s.social_mentions_1h}</p>
                        <p className="text-[10px] text-slate-500 mt-1">menções na última hora</p>
                        <div className="flex items-center gap-2 mt-3">
                            {/* Twitter/X */}
                            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            {/* Instagram */}
                            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                            {/* Facebook */}
                            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            {/* TikTok */}
                            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/30 border-slate-800">
                    <CardContent className="py-4 flex items-center gap-4">
                        <Tooltip content="Quantidade de veículos/portais de mídia distintos que geraram menções nas últimas 24h.">
                            <div className="p-2.5 bg-blue-500/10 rounded-lg cursor-help">
                                <Newspaper className="w-5 h-5 text-blue-400" />
                            </div>
                        </Tooltip>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Fontes Únicas</p>
                            <p className="text-xl font-mono font-bold text-white">{s.unique_sources}</p>
                        </div>
                        <span className="ml-auto text-[10px] text-slate-600">24h</span>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/30 border-slate-800">
                    <CardContent className="py-4 flex items-center gap-4">
                        <Tooltip content="Keywords e entidades únicas identificadas pela IA nas menções das últimas 24h.">
                            <div className="p-2.5 bg-purple-500/10 rounded-lg cursor-help">
                                <Eye className="w-5 h-5 text-purple-400" />
                            </div>
                        </Tooltip>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Entidades Detectadas</p>
                            <p className="text-xl font-mono font-bold text-white">{s.unique_entities}</p>
                        </div>
                        <span className="ml-auto text-[10px] text-slate-600">24h</span>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/30 border-slate-800">
                    <CardContent className="py-4 flex items-center gap-4">
                        <Tooltip content="Total de menções coletadas nas últimas 24h. Badge mostra variação % comparado às 24h anteriores.">
                            <div className="p-2.5 bg-teal-500/10 rounded-lg cursor-help">
                                <BarChart3 className="w-5 h-5 text-teal-400" />
                            </div>
                        </Tooltip>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Volume 24h</p>
                            <p className="text-xl font-mono font-bold text-white">{s.mentions_24h}</p>
                        </div>
                        {s.mentions_growth_pct !== 0 && (
                            <Badge variant={s.mentions_growth_pct > 50 ? 'danger' : 'default'} className="ml-auto">
                                {s.mentions_growth_pct > 0 ? '+' : ''}{s.mentions_growth_pct}%
                            </Badge>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 3 — Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Alerts + Feed */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Alerts */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <AlertOctagon className="w-5 h-5 text-red-400" />
                                Alertas Ativos
                                {s.recent_alerts.length > 0 && (
                                    <Badge variant="danger" className="ml-2">{s.recent_alerts.length}</Badge>
                                )}
                            </CardTitle>
                            <span className="text-[10px] text-slate-600">
                                Critério: risk ≥ 70 ou negativo ≥ 50
                            </span>
                        </CardHeader>
                        <CardContent className="p-0">
                            {s.recent_alerts.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <span className="block mb-1 text-2xl">🛡️</span>
                                    Nenhum alerta crítico ativo no momento.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-700/50">
                                    {s.recent_alerts.map((alert: any) => {
                                        const isExpanded = expandedAlertId === alert.id;
                                        const entities = alert.classification_metadata?.detected_entities || [];
                                        const fullContent = alert.content || alert.text || alert.summary || '';
                                        return (
                                            <div key={alert.id} className="border-b border-slate-700/50 last:border-0">
                                                {/* Alert Header Row — always visible */}
                                                <div
                                                    className={`p-4 hover:bg-slate-800/50 transition-colors flex items-start gap-4 cursor-pointer ${isExpanded ? 'bg-slate-800/30' : ''}`}
                                                    onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                                                >
                                                    <div className="mt-1">
                                                        <div className={`w-2 h-2 rounded-full ${(alert.risk_score || 0) >= 70 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {alert.risk_score != null && (
                                                                    <Badge variant={(alert.risk_score || 0) >= 70 ? 'danger' : 'warning'}>
                                                                        RISCO {alert.risk_score}
                                                                    </Badge>
                                                                )}
                                                                {alert.sentiment === 'negative' && (
                                                                    <Badge variant="danger" className="bg-red-950 text-red-300 border-red-800">
                                                                        Negativo
                                                                    </Badge>
                                                                )}
                                                                <Badge variant="default">{alert.source || 'Fonte desconhecida'}</Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-xs text-slate-500 font-mono">
                                                                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                                                                </span>
                                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                                            </div>
                                                        </div>
                                                        <h4 className="text-sm font-semibold text-white mb-1">
                                                            {alert.title || 'Sem título'}
                                                        </h4>
                                                        <p className="text-xs text-slate-400 line-clamp-2">
                                                            {alert.summary || 'Análise pendente'}
                                                        </p>
                                                        {alert.keywords?.length > 0 && (
                                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                                {alert.keywords.slice(0, 4).map((kw: string, i: number) => (
                                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">{kw}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Detail Panel */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-0 pl-10 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 space-y-3">
                                                            {/* Full Content */}
                                                            <div className="text-sm text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-2 whitespace-pre-wrap">
                                                                {fullContent || 'Sem conteúdo detalhado.'}
                                                            </div>

                                                            {/* Detected Entities */}
                                                            {entities.length > 0 && (
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Entidades:</span>
                                                                    {entities.map((e: string, i: number) => (
                                                                        <span key={i} className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-medium">{e}</span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* URL Link */}
                                                            {alert.url && (
                                                                <a
                                                                    href={alert.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors w-fit"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <ExternalLink className="w-3 h-3" />
                                                                    {alert.url.length > 60 ? alert.url.substring(0, 60) + '...' : alert.url}
                                                                </a>
                                                            )}

                                                            {/* Action Buttons */}
                                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate('/feed');
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    Ver no Feed
                                                                </button>
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setArchivingId(alert.id);
                                                                        await supabase.from('intelligence_feed').update({ status: 'archived' }).eq('id', alert.id);
                                                                        setStats(prev => {
                                                                            if (!prev) return prev;
                                                                            return { ...prev, recent_alerts: prev.recent_alerts.filter((a: any) => a.id !== alert.id) };
                                                                        });
                                                                        setExpandedAlertId(null);
                                                                        setArchivingId(null);
                                                                    }}
                                                                    disabled={archivingId === alert.id}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-all disabled:opacity-50"
                                                                >
                                                                    {archivingId === alert.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                                                                    Arquivar
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEscalationAlert(alert);
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all"
                                                                >
                                                                    <ShieldAlert className="w-3.5 h-3.5" />
                                                                    Escalar Crise
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {alertsHasMore && (
                                <div className="flex items-center justify-center py-3 border-t border-slate-700/50">
                                    <button
                                        onClick={loadMoreAlerts}
                                        disabled={alertsLoadingMore}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all disabled:opacity-50"
                                    >
                                        {alertsLoadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        {alertsLoadingMore ? 'Carregando...' : `Ver mais alertas (${alertsTotal - s.recent_alerts.length})`}
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Mentions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                Menções Recentes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-700/50">
                                {s.recent_feed.map((item: any) => (
                                    <div key={item.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 capitalize">
                                                    {(item.source || 'UK').substring(0, 2)}
                                                </div>
                                                <span className="text-sm font-medium text-white max-w-[200px] truncate">
                                                    {item.source || 'Fonte não identificada'}
                                                </span>
                                                <span className="text-xs text-slate-500">• {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}</span>
                                            </div>
                                            {item.risk_score != null && (
                                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${item.risk_score >= 70 ? 'bg-red-500/20 text-red-400' :
                                                    item.risk_score >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-slate-700/50 text-slate-500'
                                                    }`}>
                                                    {item.risk_score}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-300 line-clamp-2">
                                            {item.summary || item.title || 'Sem conteúdo'}
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <Badge variant={item.sentiment === 'negative' ? 'danger' : item.sentiment === 'positive' ? 'success' : 'default'}>
                                                {item.sentiment === 'negative' ? 'Negativo' : item.sentiment === 'positive' ? 'Positivo' : 'Neutro'}
                                            </Badge>
                                            {item.source_type && item.source_type !== 'document' && (
                                                <Badge variant="outline">
                                                    {item.source_type === 'print_social_media' ? '📱 Print' : item.source_type === 'news_article' ? '📰 Notícia' : item.source_type}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {s.recent_feed.length === 0 && (
                                    <div className="p-8 text-center text-slate-500">Nenhuma menção recente.</div>
                                )}
                            </div>
                            {feedHasMore && (
                                <div className="flex items-center justify-center py-3 border-t border-slate-700/50">
                                    <button
                                        onClick={loadMoreFeed}
                                        disabled={feedLoadingMore}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all disabled:opacity-50"
                                    >
                                        {feedLoadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        {feedLoadingMore ? 'Carregando...' : `Ver mais menções (${feedTotal - s.recent_feed.length})`}
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Word Cloud */}
                    <div className="h-[350px]">
                        <WordCloudChart
                            key={selectedActivationId || 'all'}
                            activationId={selectedActivationId || undefined}
                            activationIds={allActivationIds}
                            onWordClick={handleWordClick}
                        />
                    </div>

                    {/* System Health */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Activity className="w-4 h-4 text-teal-400" />
                                Saúde do Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { label: 'Backend API', status: s.system_status === 'OPERATIONAL', value: '99.9%' },
                                { label: 'Flow Worker', status: true, value: 'Ativo' },
                                { label: 'Scheduler', status: true, value: '60s' },
                                { label: 'Watchdog Crises', status: true, value: '60s' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.status ? 'bg-teal-500' : 'bg-red-500'} animate-pulse`}></span>
                                        <span className="text-slate-400">{item.label}</span>
                                    </div>
                                    <span className="font-mono text-slate-300">{item.value}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Future: Map placeholder */}
                    <Card className="bg-slate-900/30 border-slate-800 border-dashed">
                        <CardContent className="py-6 text-center">
                            <MapPin className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-xs text-slate-600">Mapa por Estado</p>
                            <p className="text-[10px] text-slate-700 mt-1">Em breve</p>
                        </CardContent>
                    </Card>

                    {/* Team Card */}
                    <Card className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 border-indigo-500/30">
                        <CardContent className="pt-6 text-center">
                            <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-full mb-4">
                                <Users className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Equipe de Plantão</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Gerencie a equipe de resposta e escalas.
                            </p>
                            <PermissionGate roles={['admin', 'analyst']}>
                                <Button variant="secondary" size="sm" className="w-full">Gerenciar Turnos</Button>
                            </PermissionGate>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* DELETE Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-red-500/30 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-800 bg-red-950/10">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-red-500" />
                                Confirmar Exclusão
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-200">
                                <p>Isso excluirá permanentemente <strong>todo o feed de inteligência</strong> e <strong>pacotes de crise</strong> vinculados à ativação:</p>
                                <p className="mt-2 font-bold text-white">{selectedActivationName}</p>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    Digite <code className="bg-slate-800 px-1.5 py-0.5 rounded text-red-400 font-mono text-xs">DELETE</code> para confirmar:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={e => setDeleteConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-red-500 transition-colors"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleClearFeed}
                                    disabled={deleteConfirmText !== 'DELETE'}
                                    className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Excluir Tudo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Word Feed Slide Panel */}
            {selectedWord && (
                <div className="fixed inset-0 z-40" onClick={() => setSelectedWord(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                    <div
                        className="absolute top-0 right-0 h-full w-full max-w-lg bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col"
                        style={{ animation: 'slideInRight 0.3s ease-out' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                    Feed: <span className="text-primary">#{selectedWord}</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {wordFeedLoading ? 'Carregando...' : `${wordFeedItems.length} menção(ões) encontrada(s)`}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedWord(null)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Feed Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {wordFeedLoading && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                                </div>
                            )}

                            {!wordFeedLoading && wordFeedItems.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>Nenhuma menção encontrada para este termo.</p>
                                </div>
                            )}

                            {!wordFeedLoading && wordFeedItems.map(item => (
                                <article
                                    key={item.id}
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-medium text-slate-400 capitalize">
                                                    {item.source || 'Desconhecido'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>

                                            <p className="text-slate-200 text-sm leading-relaxed line-clamp-3">
                                                {item.text || item.summary || item.title}
                                            </p>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${item.sentiment === 'negative' ? 'text-red-400 border-red-900 bg-red-950/30' :
                                                    item.sentiment === 'positive' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' :
                                                        'text-slate-400 border-slate-700 bg-slate-800/30'
                                                    }`}>
                                                    {item.sentiment === 'negative' ? 'Negativo' : item.sentiment === 'positive' ? 'Positivo' : 'Neutro'}
                                                </span>

                                                {item.status === 'escalated' && (
                                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border text-red-400 border-red-500/30 bg-red-500/10 flex items-center gap-1">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        Escalado
                                                    </span>
                                                )}

                                                {(item.classification_metadata?.keywords || item.keywords || []).slice(0, 3).map((kw: string) => (
                                                    <span
                                                        key={kw}
                                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${kw.toLowerCase() === selectedWord.toLowerCase()
                                                            ? 'bg-primary/20 text-primary border-primary/30'
                                                            : 'text-slate-400 border-slate-700 bg-slate-800/30'
                                                            }`}
                                                    >
                                                        #{kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={`flex flex-col items-center justify-center w-9 h-9 rounded-lg border font-bold text-xs shrink-0 ${item.risk_score >= 7 ? 'text-red-400 border-red-900 bg-red-950/30' :
                                            item.risk_score >= 4 ? 'text-amber-400 border-amber-900 bg-amber-950/30' :
                                                'text-emerald-400 border-emerald-900 bg-emerald-950/30'
                                            }`}>
                                            {item.risk_score}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Escalation Modal */}
            {escalationAlert && (
                <CrisisEscalationModal
                    isOpen={true}
                    onClose={() => setEscalationAlert(null)}
                    mention={escalationAlert}
                    allMentions={s.recent_alerts}
                    onSuccess={() => {
                        setStats(prev => {
                            if (!prev) return prev;
                            return { ...prev, recent_alerts: prev.recent_alerts.filter((a: any) => a.id !== escalationAlert.id) };
                        });
                        setEscalationAlert(null);
                        setExpandedAlertId(null);
                    }}
                />
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
