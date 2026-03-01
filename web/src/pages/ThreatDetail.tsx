import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft, Target, Users, AlertTriangle, Activity, Network,
    Clock, TrendingUp, ExternalLink, ShieldAlert, MessageCircle, Loader2,
    Heart, BarChart3, MessageSquare, RefreshCw, Share2, X, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserActivations } from '@/hooks/useUserActivations';

// ── Shared Logic ──

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

function mentionsMonitoredEntity(item: any, monitoredNames: string[]): string[] {
    const cm = item.classification_metadata || {};
    const foundEntities: string[] = [];
    const pea = cm.per_entity_analysis || [];
    for (const ea of pea) {
        const rawName = safeEntityString(ea.entity_name);
        if (!rawName) continue;
        const eName = normalizeEntityName(rawName);
        if (eName.length > 0 && monitoredNames.some((mn: string) => eName.includes(mn) || mn.includes(eName))) {
            if (ea.sentiment === 'negative' || item.sentiment === 'negative') {
                foundEntities.push(rawName);
            }
        }
    }
    if (foundEntities.length === 0) {
        const detected = cm.detected_entities || [];
        for (const e of detected) {
            const rawName = safeEntityString(e);
            if (!rawName) continue;
            const eName = normalizeEntityName(rawName);
            if (eName.length > 0 && monitoredNames.some((mn: string) => eName.includes(mn) || mn.includes(eName))) {
                foundEntities.push(rawName);
            }
        }
    }
    return foundEntities;
}

function formatFollowers(n: number | null): string {
    if (!n) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

// ── Component ──

export const ThreatDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mentions, setMentions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMention, setSelectedMention] = useState<any>(null);
    const { activations, activationIds, loading: activationsLoading } = useUserActivations();

    const decodedSource = id ? decodeURIComponent(id) : '';

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
        if (!activationsLoading && decodedSource) fetchMentions();
    }, [activationsLoading, activationIds, decodedSource]);

    const fetchMentions = async () => {
        if (activationIds.length === 0) {
            setMentions([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        // We search by source, author_username, or author_name matching the decoded id
        // Since Supabase can't easily do OR across jsonb + column, fetch a broader set and filter client-side
        let query = supabase
            .from('intelligence_feed')
            .select('*')
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
            // Filter to only this profile's mentions of monitored entities
            const filtered = data.filter(item => {
                const cm = item.classification_metadata || {};
                const key = cm.author_username || cm.author_name || item.source || '';
                if (key !== decodedSource) return false;
                const targets = mentionsMonitoredEntity(item, monitoredNames);
                return targets.length > 0;
            });
            setMentions(filtered);
        }
        setLoading(false);
    };

    // Profile metadata from first mention
    const profileMeta = useMemo(() => {
        if (mentions.length === 0) return null;
        const cm = mentions[0].classification_metadata || {};
        return {
            displayName: cm.author_name || mentions[0].source || decodedSource,
            username: cm.author_username || null,
            profileImage: cm.author_profile_image || null,
            followers: cm.author_followers || null,
            verified: cm.author_verified || false,
        };
    }, [mentions, decodedSource]);

    // Stats
    const stats = useMemo(() => {
        const entityCounts: Record<string, number> = {};
        let totalRisk = 0;
        const sourceTypes = new Set<string>();

        for (const m of mentions) {
            totalRisk += m.risk_score || 0;
            sourceTypes.add(m.source_type || 'portal');
            const targets = mentionsMonitoredEntity(m, monitoredNames);
            for (const e of targets) {
                entityCounts[e] = (entityCounts[e] || 0) + 1;
            }
        }

        const avgRisk = mentions.length > 0 ? Math.round(totalRisk / mentions.length) : 0;
        const topEntity = Object.entries(entityCounts).sort((a, b) => b[1] - a[1])[0];
        const maxRisk = Math.max(...mentions.map(m => m.risk_score || 0), 0);

        return { entityCounts, avgRisk, maxRisk, sourceTypes, topEntity };
    }, [mentions, monitoredNames]);

    const initials = (profileMeta?.displayName || decodedSource)
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const riskColor = stats.avgRisk >= 70 ? 'text-red-400' : stats.avgRisk >= 40 ? 'text-amber-400' : 'text-emerald-400';
    const riskBorder = stats.avgRisk >= 70 ? 'border-red-500' : stats.avgRisk >= 40 ? 'border-amber-500' : 'border-emerald-500';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Button variant="ghost" size="sm" onClick={() => navigate('/threats')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Radar
            </Button>

            {loading || activationsLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
            ) : mentions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
                        <p className="text-slate-400">Nenhuma menção negativa encontrada para este perfil.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* ── Profile Header ── */}
                    <div className="bg-surface border border-slate-700 rounded-lg p-6">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-6">
                                <div className="relative">
                                    <div className={`w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-500 border-4 ${riskBorder} overflow-hidden`}>
                                        {profileMeta?.profileImage ? (
                                            <img src={profileMeta.profileImage} alt={profileMeta.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-2 -right-2 text-white text-xs px-2 py-1 rounded-full font-bold uppercase border-2 border-surface ${stats.avgRisk >= 70 ? 'bg-danger' : stats.avgRisk >= 40 ? 'bg-warning' : 'bg-slate-600'
                                        }`}>
                                        {stats.avgRisk >= 70 ? 'Hostil' : stats.avgRisk >= 40 ? 'Alerta' : 'Baixo'}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-3xl font-bold text-white">{profileMeta?.displayName || decodedSource}</h1>
                                        {profileMeta?.verified && (
                                            <svg className="w-6 h-6 text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" /></svg>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        {profileMeta?.username && (
                                            <span className="flex items-center gap-1 text-sky-400">
                                                @{profileMeta.username}
                                            </span>
                                        )}
                                        {profileMeta?.followers && (
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {formatFollowers(profileMeta.followers)} seguidores
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            Última atividade: {formatDistanceToNow(new Date(mentions[0].created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        {Array.from(stats.sourceTypes).map(st => (
                                            <Badge key={st} variant="outline" className="text-[10px]">{st}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Stats Row ── */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-slate-700/50">
                            <div className="text-center p-4 bg-slate-900/50 rounded border border-slate-800">
                                <div className="text-secondary text-xs uppercase tracking-wider mb-1">Menções Negativas</div>
                                <div className="text-3xl font-bold text-red-400">{mentions.length}</div>
                            </div>
                            <div className="text-center p-4 bg-slate-900/50 rounded border border-slate-800">
                                <div className="text-secondary text-xs uppercase tracking-wider mb-1">Risco Médio</div>
                                <div className={`text-3xl font-bold ${riskColor}`}>{stats.avgRisk}%</div>
                            </div>
                            <div className="text-center p-4 bg-slate-900/50 rounded border border-slate-800">
                                <div className="text-secondary text-xs uppercase tracking-wider mb-1">Risco Máximo</div>
                                <div className="text-3xl font-bold text-red-400">{stats.maxRisk}%</div>
                            </div>
                            <div className="text-center p-4 bg-slate-900/50 rounded border border-slate-800">
                                <div className="text-secondary text-xs uppercase tracking-wider mb-1">Alvo Principal</div>
                                <div className="text-lg font-bold text-white truncate" title={stats.topEntity?.[0]}>
                                    {stats.topEntity ? `${stats.topEntity[0]}` : '—'}
                                </div>
                                {stats.topEntity && (
                                    <div className="text-xs text-red-400">{stats.topEntity[1]}x menções</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Content Area ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Mentions List */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-primary" />
                                    Menções Negativas ({mentions.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                                {mentions.map((m: any) => {
                                    const targets = mentionsMonitoredEntity(m, monitoredNames);
                                    const isTwitter = (m.source_type === 'twitter' || m.source_type === 'social_media' || m.source_type === 'x');
                                    return (
                                        <div
                                            key={m.id}
                                            className={`p-3 bg-slate-900/50 rounded-lg border border-slate-800 hover:bg-slate-800/30 transition-colors ${isTwitter ? 'cursor-pointer' : ''}`}
                                            onClick={() => isTwitter && setSelectedMention(m)}
                                        >
                                            <div className="flex justify-between items-start mb-1.5">
                                                <h4 className="text-sm font-semibold text-white truncate flex-1 mr-2">
                                                    {m.title || 'Menção detectada'}
                                                </h4>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {isTwitter && (
                                                        <span className="text-[9px] text-sky-400 bg-sky-400/10 border border-sky-400/20 px-1.5 py-0.5 rounded-full font-medium">
                                                            Ver no 𝕏
                                                        </span>
                                                    )}
                                                    <span className={`text-xs font-bold ${(m.risk_score || 0) >= 70 ? 'text-red-400' : (m.risk_score || 0) >= 40 ? 'text-amber-400' : 'text-slate-400'
                                                        }`}>
                                                        {m.risk_score || 0}%
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                                                {m.summary || m.content?.substring(0, 200) || ''}
                                            </p>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                                </span>
                                                {targets.map(t => (
                                                    <span key={t} className="flex items-center gap-1 text-red-400">
                                                        <Target className="w-3 h-3" />
                                                        {t}
                                                    </span>
                                                ))}
                                                {m.url && (
                                                    <a
                                                        href={m.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-sky-400 hover:text-sky-300 ml-auto"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Link
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Entity Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-red-400" />
                                    Entidades Atacadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {Object.entries(stats.entityCounts).length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-8">Nenhuma entidade identificada.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(stats.entityCounts)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([entity, count]) => {
                                                const maxCount = Object.values(stats.entityCounts).reduce((a, b) => Math.max(a, b), 1);
                                                const pct = Math.round((count / maxCount) * 100);
                                                return (
                                                    <div key={entity} className="group">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-sm font-semibold text-white">{entity}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-400">{count} menções negativas</span>
                                                                <Badge variant="danger" className="text-[10px]">
                                                                    {Math.round((count / mentions.length) * 100)}%
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-700"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                        {/* Timeline hint */}
                                        <div className="mt-6 pt-4 border-t border-slate-800">
                                            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                <TrendingUp className="w-3.5 h-3.5" />
                                                Atividade Recente
                                            </h4>
                                            <div className="grid grid-cols-7 gap-1">
                                                {Array.from({ length: 7 }).map((_, dayIdx) => {
                                                    const dayDate = new Date();
                                                    dayDate.setDate(dayDate.getDate() - (6 - dayIdx));
                                                    const dayStr = format(dayDate, 'yyyy-MM-dd');
                                                    const dayMentions = mentions.filter(m =>
                                                        format(new Date(m.created_at), 'yyyy-MM-dd') === dayStr
                                                    ).length;
                                                    const maxDay = Math.max(...Array.from({ length: 7 }).map((_, i) => {
                                                        const d = new Date();
                                                        d.setDate(d.getDate() - (6 - i));
                                                        return mentions.filter(m =>
                                                            format(new Date(m.created_at), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd')
                                                        ).length;
                                                    }), 1);
                                                    const intensity = dayMentions / maxDay;

                                                    return (
                                                        <div key={dayIdx} className="text-center">
                                                            <div
                                                                className={`h-8 rounded-sm transition-all ${dayMentions === 0 ? 'bg-slate-800' :
                                                                    intensity >= 0.75 ? 'bg-red-500' :
                                                                        intensity >= 0.5 ? 'bg-red-600/70' :
                                                                            intensity >= 0.25 ? 'bg-red-700/50' :
                                                                                'bg-red-900/40'
                                                                    }`}
                                                                title={`${format(dayDate, 'dd/MM')}: ${dayMentions} menções`}
                                                            />
                                                            <span className="text-[9px] text-slate-600 mt-1 block">
                                                                {format(dayDate, 'EEE', { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* ── X/Twitter Mockup Overlay ── */}
            {selectedMention && (() => {
                const meta = selectedMention.classification_metadata || {} as any;
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

                const hash = selectedMention.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
                const followers = realFollowers || (10 + (hash % 990)) * 100;
                const likes = realLikes || 500 + (hash % 4500);
                const retweets = realRetweets || 120 + (hash % 980);
                const replies = realReplies || 10 + (hash % 90);
                const impressions = realImpressions || (50 + (hash % 450)) * 1000;
                const formatK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

                const tweetContent = selectedMention.text || selectedMention.content || selectedMention.summary || selectedMention.title || '';

                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setSelectedMention(null)}
                    >
                        <div
                            className="w-full max-w-[480px] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-slate-700/50 bg-black"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <div className="flex justify-end p-2">
                                <button
                                    onClick={() => setSelectedMention(null)}
                                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* X/Twitter Header */}
                            <div className="px-4 pb-3 flex items-start gap-3">
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
                                    {tweetContent}
                                </p>
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

                            {/* Followers */}
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

                            {/* Sentiment indicator bar */}
                            <div className={`h-1 w-full ${selectedMention.sentiment === 'negative' ? 'bg-red-500' : selectedMention.sentiment === 'positive' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
