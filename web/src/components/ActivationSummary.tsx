import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    MessageSquare, TrendingUp, AlertTriangle, ShieldAlert,
    Hash, Users, Brain, Loader2, RefreshCw, Sparkles,
    AlertOctagon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivationSummaryProps {
    activationId: string;
    activationName?: string;
}

interface SummaryData {
    overview: {
        total_citations: number;
        total_files: number;
        first_citation_at: string | null;
        last_citation_at: string | null;
        monitoring_days: number;
    };
    sentiment: {
        positive: number;
        negative: number;
        neutral: number;
        ratio_neg_pos: number;
    };
    risk: {
        avg_risk_score: number;
        max_risk_score: number;
        high_risk_count: number;
        escalated_crises: number;
    };
    top_keywords: { keyword: string; count: number }[];
    emergent_keywords: { keyword: string; count: number }[];
    target_mentions: {
        name: string;
        count: number;
        sentiment_positive: number;
        sentiment_negative: number;
        sentiment_neutral: number;
    }[];
    target_cooccurrence: { pair: string[]; count: number }[];
    top_risk_items: {
        id: string;
        title: string;
        risk_score: number;
        sentiment: string;
        summary: string;
        created_at: string;
    }[];
}

type RiskLevel = 'normal' | 'attention' | 'crisis';


export const ActivationSummary: React.FC<ActivationSummaryProps> = ({ activationId }) => {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiUpdatedAt, setAiUpdatedAt] = useState<string | null>(null);

    const fetchSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_activation_summary', {
                p_activation_id: activationId,
            });

            if (rpcError) throw rpcError;
            if (data?.error) throw new Error(data.error);

            setSummary(data);
        } catch (err: any) {
            console.error('[ActivationSummary] Error:', err);
            setError(err.message || 'Erro ao carregar resumo');
        } finally {
            setLoading(false);
        }
    };

    const loadSavedAnalysis = async () => {
        try {
            const res = await fetch(`/api/v1/activations/${activationId}/ai-analysis`);
            const json = await res.json();
            if (json.success && json.analysis) {
                setAiAnalysis(json.analysis);
                setAiUpdatedAt(json.updated_at || null);
            }
        } catch (err) {
            console.error('[AI Analysis Load] Error:', err);
        }
    };

    const fetchAiAnalysis = async () => {
        setAiLoading(true);
        try {
            const res = await fetch(`/api/v1/activations/${activationId}/ai-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const json = await res.json();
            if (json.success) {
                setAiAnalysis(json.analysis);
                setAiUpdatedAt(new Date().toISOString());
            } else {
                throw new Error(json.message || 'Falha na análise');
            }
        } catch (err: any) {
            console.error('[AI Analysis] Error:', err);
            setAiAnalysis(`Erro ao gerar análise: ${err.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        if (activationId) {
            fetchSummary();
            loadSavedAnalysis();
        }
    }, [activationId]);

    const riskLevel: RiskLevel = useMemo(() => {
        if (!summary) return 'normal';
        const { risk, sentiment } = summary;
        if (risk.avg_risk_score > 70 || risk.escalated_crises > 0) return 'crisis';
        if (risk.avg_risk_score >= 40 || sentiment.ratio_neg_pos > 1.5 || risk.high_risk_count > 0) return 'attention';
        return 'normal';
    }, [summary]);

    const riskConfig = {
        normal: { label: 'NORMAL', emoji: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', desc: 'Cenário estável, sem indicadores de alerta.' },
        attention: { label: 'ATENÇÃO', emoji: '🟡', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', desc: 'Indicadores elevados detectados. Monitorar de perto.' },
        crisis: { label: 'CRISE', emoji: '🔴', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', desc: 'Nível crítico atingido. Ação imediata recomendada.' },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                    <p className="text-slate-500 text-sm">Calculando métricas da ativação...</p>
                </div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="bg-slate-800/50 p-8 rounded-lg border border-slate-700 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">{error || 'Nenhum dado disponível para esta ativação.'}</p>
                <Button variant="outline" size="sm" onClick={fetchSummary}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    const { overview, sentiment, risk, top_keywords, emergent_keywords, target_mentions, target_cooccurrence, top_risk_items } = summary;
    const sentimentNet = sentiment.positive - sentiment.negative;
    const maxKeywordCount = top_keywords.length > 0 ? Math.max(...top_keywords.map(k => Number(k.count))) : 1;
    const rl = riskConfig[riskLevel];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-primary bg-slate-900/50">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Citações</p>
                                <h3 className="text-3xl font-mono font-bold text-white mt-1">{overview.total_citations}</h3>
                            </div>
                            <div className="p-2 bg-primary/10 rounded-full">
                                <MessageSquare className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500">
                            {overview.monitoring_days > 0
                                ? `${overview.monitoring_days} dias de monitoramento`
                                : 'Monitoramento recente'}
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 bg-slate-900/50 ${sentimentNet < 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Sentimento (Net)</p>
                                <h3 className={`text-3xl font-mono font-bold mt-1 ${sentimentNet < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {sentimentNet > 0 ? '+' : ''}{sentimentNet}
                                </h3>
                            </div>
                            <div className={`p-2 rounded-full ${sentimentNet < 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                                <TrendingUp className={`w-5 h-5 ${sentimentNet < 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                            </div>
                        </div>
                        <div className="mt-4 flex gap-3 text-xs">
                            <span className="text-emerald-400">{sentiment.positive} pos</span>
                            <span className="text-red-400">{sentiment.negative} neg</span>
                            <span className="text-slate-500">{sentiment.neutral} neutro</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 bg-slate-900/50 ${risk.avg_risk_score > 60 ? 'border-l-red-500' : risk.avg_risk_score > 30 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Risk Score Médio</p>
                                <h3 className="text-3xl font-mono font-bold text-white mt-1">{risk.avg_risk_score}</h3>
                            </div>
                            <div className="p-2 bg-amber-500/10 rounded-full">
                                <ShieldAlert className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500">
                            Máximo: {risk.max_risk_score} | Alto risco: {risk.high_risk_count}
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 bg-slate-900/50 ${risk.escalated_crises > 0 ? 'border-l-red-500' : 'border-l-teal-500'}`}>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Crises Escaladas</p>
                                <h3 className="text-3xl font-mono font-bold text-white mt-1">{risk.escalated_crises}</h3>
                            </div>
                            <div className={`p-2 rounded-full ${risk.escalated_crises > 0 ? 'bg-red-500/10' : 'bg-teal-500/10'}`}>
                                <AlertOctagon className={`w-5 h-5 ${risk.escalated_crises > 0 ? 'text-red-400' : 'text-teal-400'}`} />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500">
                            {overview.total_files} arquivo(s) analisado(s)
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Traffic Light */}
            <div className={`p-4 rounded-lg border ${rl.bg} flex items-center gap-4`}>
                <span className="text-3xl">{rl.emoji}</span>
                <div>
                    <h4 className={`text-lg font-bold ${rl.color}`}>SEMÁFORO DE RISCO: {rl.label}</h4>
                    <p className="text-slate-400 text-sm">{rl.desc}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto text-slate-400" onClick={fetchSummary}>
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Keywords + Targets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Keywords Ranking */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Hash className="w-5 h-5 text-indigo-400" />
                            Keywords ({top_keywords.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {top_keywords.length === 0 ? (
                            <p className="text-slate-500 text-sm italic">Nenhuma keyword identificada no feed.</p>
                        ) : (
                            top_keywords.slice(0, 10).map((kw, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500 w-5 text-right font-mono">{idx + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm text-slate-200 font-medium">#{kw.keyword}</span>
                                            <span className="text-xs text-slate-500 font-mono">{kw.count}x</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                style={{ width: `${(Number(kw.count) / maxKeywordCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {/* Emergent Keywords */}
                        {emergent_keywords.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Keywords Emergentes
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {emergent_keywords.map((ek, idx) => (
                                        <span key={idx} className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-full border border-amber-500/20">
                                            {ek.keyword} ({ek.count})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Target Mentions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="w-5 h-5 text-sky-400" />
                            Alvos Monitorados ({target_mentions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {target_mentions.length === 0 ? (
                            <p className="text-slate-500 text-sm italic">Nenhum alvo detectado no conteúdo do feed.</p>
                        ) : (
                            target_mentions.map((t, idx) => {
                                const total = t.sentiment_positive + t.sentiment_negative + t.sentiment_neutral;
                                const posPercent = total > 0 ? (t.sentiment_positive / total) * 100 : 0;
                                const negPercent = total > 0 ? (t.sentiment_negative / total) * 100 : 0;

                                return (
                                    <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400">
                                                    {t.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm text-white font-medium">{t.name}</span>
                                            </div>
                                            <Badge variant="default" className="font-mono">{t.count} citações</Badge>
                                        </div>
                                        {/* Stacked sentiment bar */}
                                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
                                            {posPercent > 0 && <div className="h-full bg-emerald-500" style={{ width: `${posPercent}%` }} />}
                                            {negPercent > 0 && <div className="h-full bg-red-500" style={{ width: `${negPercent}%` }} />}
                                        </div>
                                        <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                                            <span className="text-emerald-400">{t.sentiment_positive} pos</span>
                                            <span className="text-red-400">{t.sentiment_negative} neg</span>
                                            <span>{t.sentiment_neutral} neutro</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {/* Co-occurrence */}
                        {target_cooccurrence.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Co-ocorrência de Alvos</p>
                                {target_cooccurrence.map((co, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 mb-1">
                                        <span className="text-sky-400">{co.pair[0]}</span>
                                        <span className="text-slate-600">↔</span>
                                        <span className="text-sky-400">{co.pair[1]}</span>
                                        <span className="text-slate-500 ml-auto font-mono">{co.count}x juntos</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* AI Contextual Analysis */}
            <Card className="bg-gradient-to-br from-indigo-900/10 to-slate-900 border-indigo-500/20">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Brain className="w-5 h-5 text-indigo-400" />
                        Análise Contextual (IA)
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAiAnalysis}
                        disabled={aiLoading}
                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                    >
                        {aiLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analisando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                {aiAnalysis ? 'Regenerar' : 'Gerar Análise'}
                            </>
                        )}
                    </Button>
                </CardHeader>
                <CardContent>
                    {aiLoading && !aiAnalysis && (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-4 bg-slate-700/50 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
                            ))}
                        </div>
                    )}
                    {aiAnalysis && (
                        <div className="max-w-none">
                            {aiUpdatedAt && (
                                <p className="text-[10px] text-slate-600 mb-4">
                                    Gerada em {new Date(aiUpdatedAt).toLocaleString('pt-BR')}
                                </p>
                            )}
                            <div className="space-y-3">
                                {aiAnalysis.split('\n').reduce((acc: React.ReactNode[], line: string, idx: number) => {
                                    const trimmed = line.trim();
                                    if (!trimmed) return acc;

                                    // Format inline bold and italic
                                    const formatInline = (text: string) => {
                                        const parts = text.split(/\*\*(.*?)\*\*/g);
                                        return parts.map((part, i) =>
                                            i % 2 === 1
                                                ? <strong key={i} className="text-white font-bold">{part}</strong>
                                                : <span key={i}>{part}</span>
                                        );
                                    };

                                    // # Main title (H1)
                                    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
                                        acc.push(
                                            <div key={idx} className="mt-4 mb-5 p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/10 rounded-xl border border-indigo-500/30">
                                                <h2 className="text-xl font-extrabold text-white tracking-tight">
                                                    {formatInline(trimmed.replace(/^#\s*/, ''))}
                                                </h2>
                                            </div>
                                        );
                                    }
                                    // ## Section headers
                                    else if (trimmed.startsWith('## ')) {
                                        acc.push(
                                            <div key={idx} className="mt-8 mb-4">
                                                <div className="flex items-center gap-3 pb-3 border-b-2 border-indigo-500/40">
                                                    <div className="w-1.5 h-8 bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-full" />
                                                    <h3 className="text-lg font-extrabold text-indigo-200 tracking-wide">
                                                        {formatInline(trimmed.replace(/^##\s*/, ''))}
                                                    </h3>
                                                </div>
                                            </div>
                                        );
                                    }
                                    // ### Sub-headers
                                    else if (trimmed.startsWith('### ')) {
                                        acc.push(
                                            <div key={idx} className="mt-5 mb-2 flex items-center gap-2">
                                                <div className="w-1 h-5 bg-indigo-500/60 rounded-full" />
                                                <h4 className="text-base font-bold text-slate-100">
                                                    {formatInline(trimmed.replace(/^###\s*/, ''))}
                                                </h4>
                                            </div>
                                        );
                                    }
                                    // #### Small headers
                                    else if (trimmed.startsWith('#### ')) {
                                        acc.push(
                                            <h5 key={idx} className="text-sm font-bold text-slate-200 mt-4 mb-1 uppercase tracking-wider">
                                                {formatInline(trimmed.replace(/^####\s*/, ''))}
                                            </h5>
                                        );
                                    }
                                    // Bullet lists
                                    else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                                        acc.push(
                                            <div key={idx} className="flex items-start gap-3 ml-3 py-0.5">
                                                <span className="text-indigo-400 mt-2 text-[8px] shrink-0">●</span>
                                                <p className="text-[13px] text-slate-300 leading-relaxed flex-1">
                                                    {formatInline(trimmed.replace(/^[-•*]\s*/, ''))}
                                                </p>
                                            </div>
                                        );
                                    }
                                    // Numbered lists
                                    else if (/^\d+[\.\)]\s/.test(trimmed)) {
                                        const num = trimmed.match(/^(\d+)/)?.[1];
                                        const text = trimmed.replace(/^\d+[\.\)]\s*/, '');
                                        acc.push(
                                            <div key={idx} className="flex items-start gap-3 ml-3 py-0.5">
                                                <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold min-w-[24px] h-[24px] flex items-center justify-center rounded-full shrink-0 mt-0.5">{num}</span>
                                                <p className="text-[13px] text-slate-300 leading-relaxed flex-1">
                                                    {formatInline(text)}
                                                </p>
                                            </div>
                                        );
                                    }
                                    // Horizontal rule / separator
                                    else if (trimmed === '---' || trimmed === '***') {
                                        acc.push(<hr key={idx} className="border-slate-700/50 my-4" />);
                                    }
                                    // Regular paragraphs
                                    else {
                                        acc.push(
                                            <p key={idx} className="text-[13px] text-slate-300 leading-[1.8]">
                                                {formatInline(trimmed)}
                                            </p>
                                        );
                                    }
                                    return acc;
                                }, [])}
                            </div>
                        </div>
                    )}
                    {!aiAnalysis && !aiLoading && (
                        <div className="text-center py-6 text-slate-500">
                            <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Clique em "Gerar Análise" para obter um resumo executivo baseado em todo o contexto rastreado.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top Risk Items */}
            {top_risk_items.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Citações de Maior Risco
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-700/50">
                            {top_risk_items.map((item) => (
                                <div key={item.id} className="p-4 hover:bg-slate-800/50 transition-colors flex items-start gap-3">
                                    <div className="mt-1">
                                        <div className={`w-2 h-2 rounded-full ${item.risk_score >= 90 ? 'bg-red-500 animate-pulse' : item.risk_score >= 70 ? 'bg-amber-500' : 'bg-slate-500'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={item.risk_score >= 80 ? 'danger' : 'default'} className="font-mono text-[10px]">
                                                RISCO {item.risk_score}
                                            </Badge>
                                            <Badge variant={item.sentiment === 'negative' ? 'danger' : item.sentiment === 'positive' ? 'success' : 'default'} className="text-[10px]">
                                                {item.sentiment === 'negative' ? 'Negativo' : item.sentiment === 'positive' ? 'Positivo' : 'Neutro'}
                                            </Badge>
                                            <span className="text-xs text-slate-500 ml-auto">
                                                {item.created_at && formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                                        {item.summary && (
                                            <p className="text-xs text-slate-400 line-clamp-2 mt-1">{item.summary}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
