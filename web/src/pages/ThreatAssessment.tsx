import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    ShieldAlert, Search, Users, Activity, Network,
    MessageCircle, AlertTriangle, Clock, TrendingUp, ChevronRight, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ThreatItem {
    id: string;
    title: string;
    content?: string;
    source: string;
    source_type: string;
    risk_score: number;
    sentiment: string;
    created_at: string;
    classification_metadata?: {
        threat_level?: string;
        threat_reason?: string;
        whatsapp_group_name?: string;
        detected_entities?: string[];
        keywords?: string[];
        [key: string]: any;
    };
}

const getThreatLevel = (item: ThreatItem): 'critical' | 'moderate' | 'low' => {
    if (item.classification_metadata?.threat_level) {
        return item.classification_metadata.threat_level as any;
    }
    if (item.risk_score >= 70) return 'critical';
    if (item.risk_score >= 40) return 'moderate';
    return 'low';
};

const threatColors = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'danger' as const },
    moderate: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'warning' as const },
    low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'default' as const },
};

export const ThreatAssessment: React.FC = () => {
    const navigate = useNavigate();
    const [threats, setThreats] = useState<ThreatItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchThreats();
    }, []);

    const fetchThreats = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('intelligence_feed')
            .select('*')
            .gte('risk_score', 40)
            .neq('status', 'archived')
            .order('risk_score', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            setThreats(data as ThreatItem[]);
        }
        setLoading(false);
    };

    const filtered = threats.filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (t.title?.toLowerCase().includes(q)) ||
            (t.content?.toLowerCase().includes(q)) ||
            (t.source?.toLowerCase().includes(q)) ||
            (t.classification_metadata?.detected_entities?.some(e => e.toLowerCase().includes(q))) ||
            (t.classification_metadata?.whatsapp_group_name?.toLowerCase().includes(q));
    });

    const criticalCount = threats.filter(t => getThreatLevel(t) === 'critical').length;
    const moderateCount = threats.filter(t => getThreatLevel(t) === 'moderate').length;
    const whatsappCount = threats.filter(t => t.source_type === 'whatsapp').length;
    const socialCount = threats.filter(t => ['twitter', 'instagram', 'x'].includes(t.source_type?.toLowerCase())).length;

    const globalLevel = criticalCount >= 3 ? 'CRÍTICO' : criticalCount >= 1 ? 'ALTO' : moderateCount >= 3 ? 'MODERADO' : 'BAIXO';
    const globalColor = criticalCount >= 3 ? 'text-red-400' : criticalCount >= 1 ? 'text-amber-400' : 'text-emerald-400';
    const globalBorder = criticalCount >= 3 ? 'border-red-500' : criticalCount >= 1 ? 'border-amber-500' : 'border-emerald-500';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-danger" />
                        Radar de Ameaças
                    </h1>
                    <p className="text-slate-400">Ameaças detectadas automaticamente via WhatsApp, redes sociais e portais.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="danger" className="text-xs px-3 py-1">
                        {criticalCount} Críticas
                    </Badge>
                    <Badge variant="warning" className="text-xs px-3 py-1">
                        {moderateCount} Moderadas
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchThreats}>
                        <Activity className="w-4 h-4 mr-1.5" />
                        Atualizar
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-surface p-4 rounded-lg border border-slate-700/60">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        placeholder="Buscar ameaça, grupo, pessoa ou palavra-chave..."
                        className="pl-10 bg-slate-900 border-slate-700"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main: Threat List */}
                <div className="lg:col-span-2 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                                <p className="text-slate-400">Nenhuma ameaça detectada no momento.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filtered.map(threat => {
                            const level = getThreatLevel(threat);
                            const colors = threatColors[level];
                            const entities = threat.classification_metadata?.detected_entities || [];
                            const groupName = threat.classification_metadata?.whatsapp_group_name || threat.source;

                            return (
                                <div
                                    key={threat.id}
                                    className={`p-4 rounded-xl border ${colors.border} ${colors.bg} hover:brightness-110 transition-all cursor-pointer group`}
                                    onClick={() => navigate(`/feed`)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${level === 'critical' ? 'bg-red-500/20' : level === 'moderate' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                                            {threat.source_type === 'whatsapp' ? (
                                                <MessageCircle className={`w-5 h-5 ${colors.text}`} />
                                            ) : (
                                                <AlertTriangle className={`w-5 h-5 ${colors.text}`} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
                                                    {threat.title || 'Ameaça detectada'}
                                                </h4>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-xs font-bold ${colors.text}`}>
                                                        {threat.risk_score}%
                                                    </span>
                                                    <Badge variant={colors.badge} className="text-[10px]">
                                                        {level === 'critical' ? 'CRÍTICA' : level === 'moderate' ? 'MODERADA' : 'BAIXA'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                                                {threat.content?.substring(0, 150) || threat.classification_metadata?.threat_reason || ''}
                                            </p>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    {threat.source_type === 'whatsapp' ? <MessageCircle className="w-3 h-3" /> : <Network className="w-3 h-3" />}
                                                    {groupName}
                                                </span>
                                                {entities.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {entities.slice(0, 2).join(', ')}{entities.length > 2 ? ` +${entities.length - 2}` : ''}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 ml-auto">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(threat.created_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors shrink-0 mt-1" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Right: Stats */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-sm">Nível de Ameaça Global</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-6">
                            <div className={`w-28 h-28 rounded-full border-4 border-slate-800 flex items-center justify-center relative`}>
                                <div className={`absolute inset-0 rounded-full border-4 ${globalBorder} border-t-transparent animate-spin`} style={{ animationDuration: '3s' }}></div>
                                <div className="text-center">
                                    <span className={`text-2xl font-bold ${globalColor}`}>{globalLevel}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-4 text-center">
                                {criticalCount} ameaças críticas · {moderateCount} moderadas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Origens</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { label: 'WhatsApp (Grupos)', count: whatsappCount, pct: threats.length ? Math.round((whatsappCount / threats.length) * 100) : 0, color: 'bg-green-500' },
                                { label: 'Redes Sociais', count: socialCount, pct: threats.length ? Math.round((socialCount / threats.length) * 100) : 0, color: 'bg-blue-500' },
                                { label: 'Outros', count: threats.length - whatsappCount - socialCount, pct: threats.length ? Math.round(((threats.length - whatsappCount - socialCount) / threats.length) * 100) : 0, color: 'bg-slate-500' },
                            ].map(s => (
                                <div key={s.label} className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>{s.label} ({s.count})</span>
                                        <span className="text-white">{s.pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.pct}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Entidades Mais Citadas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                const entityCount: Record<string, number> = {};
                                threats.forEach(t => {
                                    (t.classification_metadata?.detected_entities || []).forEach(e => {
                                        entityCount[e] = (entityCount[e] || 0) + 1;
                                    });
                                });
                                const sorted = Object.entries(entityCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
                                if (sorted.length === 0) return <p className="text-xs text-slate-500">Nenhuma entidade detectada.</p>;
                                return (
                                    <div className="space-y-2">
                                        {sorted.map(([name, count]) => (
                                            <div key={name} className="flex items-center justify-between text-xs">
                                                <span className="text-slate-300">{name}</span>
                                                <Badge variant="default" className="text-[10px]">{count}x</Badge>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
