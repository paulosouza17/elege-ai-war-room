import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    ShieldAlert, Search, Users, Activity, Network,
    MessageCircle, AlertTriangle, Clock, TrendingUp, ChevronRight, Loader2,
    Eye, UserX, Target, Hash, Flame, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserActivations } from '@/hooks/useUserActivations';

// ── Types ──

interface FeedItem {
    id: string;
    title: string;
    content?: string;
    source: string;
    source_type: string;
    risk_score: number;
    sentiment: string;
    created_at: string;
    classification_metadata?: {
        detected_entities?: string[];
        per_entity_analysis?: {
            entity_name: string;
            entity_id: string | null;
            sentiment: string;
            context: string;
        }[];
        author_name?: string;
        author_username?: string;
        author_profile_image?: string;
        author_followers?: number;
        author_verified?: boolean;
        [key: string]: any;
    };
}

interface ThreatProfile {
    key: string; // source identifier for grouping
    displayName: string;
    username: string | null;
    profileImage: string | null;
    followers: number | null;
    verified: boolean;
    negativeMentionCount: number;
    avgRiskScore: number;
    maxRiskScore: number;
    lastActivity: string;
    sourceTypes: Set<string>;
    targetedEntities: Record<string, number>; // entity name → count
    mentions: FeedItem[];
}

// ── Monitored Entity Names (Bolsonaro family + fallbacks) ──

const BOLSONARO_NAMES = [
    'flavio bolsonaro', 'jair bolsonaro', 'flavio nantes bolsonaro',
    'jair messias bolsonaro', 'bolsonaro', 'michelle bolsonaro'
];

function normalizeEntityName(name: string): string {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function safeEntityString(val: any): string {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') return val.name || val.entity_name || val.entity || '';
    return '';
}

function mentionsMonitoredEntity(item: FeedItem, monitoredNames: string[]): string[] {
    const cm = item.classification_metadata || {};
    const foundEntities: string[] = [];

    // Check per_entity_analysis for negative sentiment targeting monitored entities
    const pea = cm.per_entity_analysis || [];
    for (const ea of pea) {
        const rawName = safeEntityString(ea.entity_name);
        if (!rawName) continue;
        const eName = normalizeEntityName(rawName);
        if (eName.length > 0 && monitoredNames.some(mn => eName.includes(mn) || mn.includes(eName))) {
            if (ea.sentiment === 'negative' || item.sentiment === 'negative') {
                foundEntities.push(rawName);
            }
        }
    }

    // Fallback: check detected_entities
    if (foundEntities.length === 0) {
        const detected = cm.detected_entities || [];
        for (const e of detected) {
            const rawName = safeEntityString(e);
            if (!rawName) continue;
            const eName = normalizeEntityName(rawName);
            if (eName.length > 0 && monitoredNames.some(mn => eName.includes(mn) || mn.includes(eName))) {
                foundEntities.push(rawName);
            }
        }
    }

    return foundEntities;
}

function getProfileKey(item: FeedItem): string {
    const cm = item.classification_metadata || {};
    // Prefer author_username (unique), then author_name, then source
    return cm.author_username || cm.author_name || item.source || 'desconhecido';
}

function formatFollowers(n: number | null): string {
    if (!n) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

function getThreatLevel(profile: ThreatProfile): 'critical' | 'high' | 'moderate' | 'low' {
    if (profile.maxRiskScore >= 80 || profile.negativeMentionCount >= 10) return 'critical';
    if (profile.maxRiskScore >= 60 || profile.negativeMentionCount >= 5) return 'high';
    if (profile.negativeMentionCount >= 2) return 'moderate';
    return 'low';
}

const threatLevelConfig = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'danger' as const, label: 'CRÍTICO' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'warning' as const, label: 'ALTO' },
    moderate: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'warning' as const, label: 'MODERADO' },
    low: { bg: 'bg-slate-500/10', border: 'border-slate-600/30', text: 'text-slate-400', badge: 'default' as const, label: 'BAIXO' },
};

// ── Source Type Icon ──

function SourceTypeIcons({ types }: { types: Set<string> }) {
    const arr = Array.from(types);
    return (
        <div className="flex items-center gap-1">
            {arr.map(t => {
                if (t === 'twitter' || t === 'x' || t === 'social_media') {
                    return <svg key={t} className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
                }
                if (t === 'instagram') {
                    return <svg key={t} className="w-3.5 h-3.5 text-fuchsia-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>;
                }
                if (t === 'tiktok') {
                    return <svg key={t} className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>;
                }
                if (t === 'whatsapp') {
                    return <MessageCircle key={t} className="w-3.5 h-3.5 text-green-400" />;
                }
                return <Network key={t} className="w-3.5 h-3.5 text-slate-400" />;
            })}
        </div>
    );
}

// ── Main Component ──

export const ThreatAssessment: React.FC = () => {
    const navigate = useNavigate();
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'social' | 'whatsapp'>('social');
    const { activations, activationIds, loading: activationsLoading } = useUserActivations();

    // Build full list of monitored entity names from activations + hardcoded fallbacks
    const monitoredNames = useMemo(() => {
        const names = new Set<string>(BOLSONARO_NAMES);
        for (const a of activations) {
            for (const p of (a.people_of_interest || [])) {
                names.add(normalizeEntityName(p));
            }
        }
        return Array.from(names);
    }, [activations]);

    useEffect(() => {
        if (!activationsLoading) fetchData();
    }, [activationsLoading, activationIds]);

    const fetchData = async () => {
        if (activationsLoading) return;
        if (activationIds.length === 0) {
            setFeedItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        let query = supabase
            .from('intelligence_feed')
            .select('id, title, content, source, source_type, risk_score, sentiment, created_at, classification_metadata')
            .eq('sentiment', 'negative')
            .neq('status', 'archived')
            .order('created_at', { ascending: false })
            .limit(500);

        if (activationIds.length === 1) {
            query = query.eq('activation_id', activationIds[0]);
        } else if (activationIds.length > 1) {
            query = query.in('activation_id', activationIds);
        }

        const { data, error } = await query;

        if (!error && data) {
            setFeedItems(data as FeedItem[]);
        }
        setLoading(false);
    };

    // Aggregate by profile
    const profiles = useMemo(() => {
        const profileMap = new Map<string, ThreatProfile>();

        for (const item of feedItems) {
            const targetedEntities = mentionsMonitoredEntity(item, monitoredNames);
            if (targetedEntities.length === 0) continue;

            const key = getProfileKey(item);
            const cm = item.classification_metadata || {};

            if (!profileMap.has(key)) {
                profileMap.set(key, {
                    key,
                    displayName: cm.author_name || item.source || key,
                    username: cm.author_username || null,
                    profileImage: cm.author_profile_image || null,
                    followers: cm.author_followers || null,
                    verified: cm.author_verified || false,
                    negativeMentionCount: 0,
                    avgRiskScore: 0,
                    maxRiskScore: 0,
                    lastActivity: item.created_at,
                    sourceTypes: new Set<string>(),
                    targetedEntities: {},
                    mentions: [],
                });
            }

            const profile = profileMap.get(key)!;
            profile.negativeMentionCount++;
            profile.maxRiskScore = Math.max(profile.maxRiskScore, item.risk_score || 0);
            profile.sourceTypes.add(item.source_type || 'portal');
            profile.mentions.push(item);

            // Update followers/image if this item has better data
            if (!profile.followers && cm.author_followers) profile.followers = cm.author_followers;
            if (!profile.profileImage && cm.author_profile_image) profile.profileImage = cm.author_profile_image;
            if (!profile.username && cm.author_username) profile.username = cm.author_username;
            if (cm.author_name && profile.displayName === key) profile.displayName = cm.author_name;

            // Track targeted entities
            for (const e of targetedEntities) {
                profile.targetedEntities[e] = (profile.targetedEntities[e] || 0) + 1;
            }

            // Latest activity
            if (new Date(item.created_at) > new Date(profile.lastActivity)) {
                profile.lastActivity = item.created_at;
            }
        }

        // Compute avg risk score
        for (const profile of profileMap.values()) {
            const total = profile.mentions.reduce((s, m) => s + (m.risk_score || 0), 0);
            profile.avgRiskScore = Math.round(total / profile.mentions.length);
        }

        // Sort by mention count desc, then max risk desc
        return Array.from(profileMap.values()).sort(
            (a, b) => b.negativeMentionCount - a.negativeMentionCount || b.maxRiskScore - a.maxRiskScore
        );
    }, [feedItems, monitoredNames]);

    // Filter by search
    const filtered = useMemo(() => {
        if (!searchQuery) return profiles;
        const q = searchQuery.toLowerCase();
        return profiles.filter(p =>
            p.displayName.toLowerCase().includes(q) ||
            (p.username || '').toLowerCase().includes(q) ||
            Object.keys(p.targetedEntities).some(e => e.toLowerCase().includes(q))
        );
    }, [profiles, searchQuery]);

    // Stats
    const totalActors = profiles.length;
    const criticalCount = profiles.filter(p => getThreatLevel(p) === 'critical').length;
    const highCount = profiles.filter(p => getThreatLevel(p) === 'high').length;

    // Most targeted entities
    const entityAttacks = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const p of profiles) {
            for (const [entity, count] of Object.entries(p.targetedEntities)) {
                counts[entity] = (counts[entity] || 0) + count;
            }
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    }, [profiles]);

    const globalLevel = criticalCount >= 3 ? 'CRÍTICO' : criticalCount >= 1 || highCount >= 3 ? 'ALTO' : totalActors >= 3 ? 'MODERADO' : 'BAIXO';
    const globalColor = globalLevel === 'CRÍTICO' ? 'text-red-400' : globalLevel === 'ALTO' ? 'text-orange-400' : globalLevel === 'MODERADO' ? 'text-amber-400' : 'text-emerald-400';
    const globalBorder = globalLevel === 'CRÍTICO' ? 'border-red-500' : globalLevel === 'ALTO' ? 'border-orange-500' : globalLevel === 'MODERADO' ? 'border-amber-500' : 'border-emerald-500';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-danger" />
                        Radar de Ameaças
                    </h1>
                    <p className="text-slate-400">Perfis que mais falam negativamente sobre os monitorados.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="danger" className="text-xs px-3 py-1">
                        {criticalCount} Críticos
                    </Badge>
                    <Badge variant="warning" className="text-xs px-3 py-1">
                        {highCount} Altos
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <Activity className="w-4 h-4 mr-1.5" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Tabs: Redes Sociais / WhatsApp */}
            <div className="flex items-center gap-1 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('social')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all border-b-2 ${activeTab === 'social'
                        ? 'text-red-400 border-red-400 bg-red-500/5'
                        : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                        }`}
                >
                    <UserX className="w-4 h-4" />
                    Redes Sociais &amp; Portais
                </button>
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all border-b-2 ${activeTab === 'whatsapp'
                        ? 'text-green-400 border-green-400 bg-green-500/5'
                        : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                        }`}
                >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                    <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-bold ml-1">
                        EM BREVE
                    </span>
                </button>
            </div>

            {activeTab === 'whatsapp' ? (
                /* ── WhatsApp Tab (Placeholder) ── */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card className="bg-slate-900/50 border-slate-700/50 border-dashed">
                            <CardContent className="py-20 text-center">
                                <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
                                    <MessageCircle className="w-10 h-10 text-green-500 opacity-60" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Monitoramento WhatsApp</h3>
                                <p className="text-slate-400 max-w-md mx-auto mb-6">
                                    Ameaças detectadas em grupos de WhatsApp serão exibidas aqui.
                                    O sistema identificará automaticamente mensagens hostis direcionadas aos monitorados.
                                </p>
                                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                                    {[
                                        { icon: <Users className="w-5 h-5 text-green-400" />, label: 'Grupos Monitorados', value: '—' },
                                        { icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, label: 'Ameaças Detectadas', value: '—' },
                                        { icon: <Target className="w-5 h-5 text-red-400" />, label: 'Atores Identificados', value: '—' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                                            <div className="flex justify-center mb-2">{s.icon}</div>
                                            <div className="text-lg font-bold text-white">{s.value}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
                                    <div className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
                                    Aguardando integração com fluxo WhatsApp
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* WhatsApp sidebar placeholder */}
                    <div className="space-y-6">
                        <Card className="bg-slate-900 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-sm">Estrutura Prevista</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs text-slate-400">
                                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <Hash className="w-4 h-4 text-green-400" />
                                    <span>Grupos mais hostis</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <UserX className="w-4 h-4 text-red-400" />
                                    <span>Membros agressores</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <Flame className="w-4 h-4 text-amber-400" />
                                    <span>Tópicos ofensivos</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <Clock className="w-4 h-4 text-sky-400" />
                                    <span>Timeline de atividade hostil</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                /* ── Social & Portais Tab ── */
                <>
                    {/* Search */}
                    <div className="flex gap-4 items-center bg-surface p-4 rounded-lg border border-slate-700/60">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                placeholder="Buscar perfil, nome, username ou entidade monitorada..."
                                className="pl-10 bg-slate-900 border-slate-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main: Profile List */}
                        <div className="lg:col-span-2 space-y-3">
                            {loading || activationsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            ) : filtered.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                                        <p className="text-slate-400">Nenhuma ameaça identificada no momento.</p>
                                        <p className="text-xs text-slate-500 mt-1">Perfis que falam negativamente sobre os monitorados aparecerão aqui.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                filtered.map(profile => {
                                    const level = getThreatLevel(profile);
                                    const config = threatLevelConfig[level];
                                    const topEntity = Object.entries(profile.targetedEntities)
                                        .sort((a, b) => b[1] - a[1])[0];
                                    const initials = profile.displayName
                                        .split(' ')
                                        .map(w => w[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase();

                                    return (
                                        <div
                                            key={profile.key}
                                            className={`p-4 rounded-xl border ${config.border} ${config.bg} hover:brightness-110 transition-all cursor-pointer group`}
                                            onClick={() => navigate(`/threats/${encodeURIComponent(profile.key)}`)}
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Avatar */}
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 ${level === 'critical' ? 'border-red-500' : level === 'high' ? 'border-orange-500' : level === 'moderate' ? 'border-amber-500' : 'border-slate-600'
                                                    } bg-slate-800 text-slate-300 font-bold text-sm`}>
                                                    {profile.profileImage ? (
                                                        <img src={profile.profileImage} alt={profile.displayName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        initials
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                                                            {profile.displayName}
                                                        </h4>
                                                        {profile.verified && (
                                                            <svg className="w-4 h-4 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" /></svg>
                                                        )}
                                                        <Badge variant={config.badge} className="text-[10px] shrink-0">
                                                            {config.label}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                                        {profile.username && (
                                                            <span className="text-slate-400">@{profile.username}</span>
                                                        )}
                                                        <SourceTypeIcons types={profile.sourceTypes} />
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center gap-5 text-center shrink-0">
                                                    <div>
                                                        <div className="text-lg font-bold text-red-400">{profile.negativeMentionCount}</div>
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider">Menções</div>
                                                    </div>
                                                    {profile.followers && (
                                                        <div>
                                                            <div className="text-lg font-bold text-white">{formatFollowers(profile.followers)}</div>
                                                            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Seguidores</div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className={`text-lg font-bold ${config.text}`}>{profile.avgRiskScore}%</div>
                                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider">Risco Médio</div>
                                                    </div>
                                                </div>

                                                {/* Tags and arrow */}
                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                    {topEntity && (
                                                        <span className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Target className="w-3 h-3" />
                                                            {topEntity[0]} ({topEntity[1]}x)
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(profile.lastActivity), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                </div>

                                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors shrink-0" />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Right: Stats Sidebar */}
                        <div className="space-y-6">
                            {/* Global Threat Level */}
                            <Card className="bg-slate-900 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-sm">Nível de Ameaça Global</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center py-6">
                                    <div className="w-28 h-28 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                                        <div className={`absolute inset-0 rounded-full border-4 ${globalBorder} border-t-transparent animate-spin`} style={{ animationDuration: '3s' }}></div>
                                        <div className="text-center">
                                            <span className={`text-2xl font-bold ${globalColor}`}>{globalLevel}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-4 text-center">
                                        {totalActors} perfis hostis identificados
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Summary Stats */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-1.5">
                                        <Eye className="w-4 h-4 text-primary" />
                                        Resumo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        { label: 'Perfis Críticos', count: criticalCount, color: 'text-red-400', bg: 'bg-red-500/10' },
                                        { label: 'Perfis Alto Risco', count: highCount, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                                        { label: 'Total de Atores', count: totalActors, color: 'text-white', bg: 'bg-slate-700/50' },
                                    ].map(s => (
                                        <div key={s.label} className={`flex items-center justify-between p-2.5 rounded-lg ${s.bg}`}>
                                            <span className="text-xs text-slate-400">{s.label}</span>
                                            <span className={`text-sm font-bold ${s.color}`}>{s.count}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Most Targeted Entities */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-1.5">
                                        <Target className="w-4 h-4 text-red-400" />
                                        Mais Atacados
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {entityAttacks.length === 0 ? (
                                        <p className="text-xs text-slate-500">Nenhuma entidade atacada detectada.</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {entityAttacks.map(([name, count]) => {
                                                const max = entityAttacks[0][1];
                                                const pct = Math.round((count / max) * 100);
                                                return (
                                                    <div key={name}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-slate-300 truncate mr-2">{name}</span>
                                                            <span className="text-red-400 font-bold shrink-0">{count}x</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-red-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
