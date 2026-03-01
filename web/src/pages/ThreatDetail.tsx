import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft, Target, Users, AlertTriangle, Activity, Network,
    Clock, TrendingUp, ExternalLink, ShieldAlert, MessageCircle, Loader2
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
                                    return (
                                        <div key={m.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 hover:bg-slate-800/30 transition-colors">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <h4 className="text-sm font-semibold text-white truncate flex-1 mr-2">
                                                    {m.title || 'Menção detectada'}
                                                </h4>
                                                <div className="flex items-center gap-2 shrink-0">
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
        </div>
    );
};
