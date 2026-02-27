import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    MessageSquare, TrendingUp, AlertTriangle, ShieldAlert,
    Hash, Users, Radio, AlertOctagon, Brain, Loader2, Sparkles,
    Download, RefreshCw, Globe, Calendar, User, FileText
} from 'lucide-react';
import { ReportPasswordGate } from '../components/ReportPasswordGate';

interface ReportData {
    activation: {
        id: string;
        title: string;
        category: string;
        priority: string;
        keywords: string[];
        people_of_interest: string[];
        configured_sources: string[];
        status: string;
        created_at: string;
        created_by_name: string;
    };
    overview: {
        total_citations: number;
        total_files: number;
        first_citation_at: string;
        last_citation_at: string;
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
    sources: { source: string; count: number; last_seen: string }[];
    crises: {
        id: string;
        title: string;
        severity: string;
        status: string;
        created_at: string;
        resolved_at: string | null;
        resolution_notes: string | null;
    }[];
}

const API_BASE = '';

function formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

type RiskLevel = 'normal' | 'attention' | 'crisis';

function getRiskLevel(risk: ReportData['risk'], sentiment: ReportData['sentiment']): RiskLevel {
    if (risk.avg_risk_score > 70 || risk.escalated_crises > 0) return 'crisis';
    if (risk.avg_risk_score > 40 || sentiment.ratio_neg_pos > 1.5) return 'attention';
    return 'normal';
}

const RISK_CONFIG = {
    crisis: { label: 'CRISE', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
    attention: { label: 'ATENÇÃO', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
    normal: { label: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
};

export const PublicReport: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [authenticated, setAuthenticated] = useState(false);
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleAuthenticated = () => {
        setAuthenticated(true);
    };

    useEffect(() => {
        if (authenticated && token) {
            fetchReportData();
        }
    }, [authenticated, token]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/report/public/${token}/data`);
            const data = await res.json();
            if (data.success) {
                setReport(data.report);
            }
        } catch (err) {
            console.error('Failed to load report:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAiAnalysis = async () => {
        setAiLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/report/public/${token}/ai-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.success) {
                setAiAnalysis(data.analysis);
            }
        } catch (err) {
            console.error('Failed to generate AI analysis:', err);
        } finally {
            setAiLoading(false);
        }
    };

    const handlePrintPDF = () => {
        window.print();
    };

    // Password Gate
    if (!authenticated) {
        return <ReportPasswordGate token={token || ''} onAuthenticated={() => handleAuthenticated()} />;
    }

    // Loading
    if (loading || !report) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Carregando relatório...</p>
                </div>
            </div>
        );
    }

    const riskLevel = getRiskLevel(report.risk, report.sentiment);
    const riskCfg = RISK_CONFIG[riskLevel];
    const totalSentiment = report.sentiment.positive + report.sentiment.negative + report.sentiment.neutral;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Print-friendly styles */}
            <style>{`
                @media print {
                    /* Base */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    .no-print { display: none !important; }

                    /* Container */
                    .report-container {
                        background: white !important;
                        color: #1e293b !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                    }

                    /* Typography overrides for print readability */
                    .report-container * { border-color: #e2e8f0 !important; }
                    .report-container .text-white,
                    .report-container h1, .report-container h2,
                    .report-container h3, .report-container h4,
                    .report-container h5 { color: #0f172a !important; }
                    .report-container .text-slate-400,
                    .report-container .text-slate-300 { color: #475569 !important; }
                    .report-container .text-slate-500,
                    .report-container .text-slate-600 { color: #64748b !important; }
                    .report-container .text-orange-400,
                    .report-container .text-orange-500,
                    .report-container .text-orange-200,
                    .report-container .text-orange-300 { color: #ea580c !important; }
                    .report-container .text-indigo-200,
                    .report-container .text-indigo-300,
                    .report-container .text-indigo-400 { color: #4338ca !important; }

                    /* Backgrounds for print */
                    .report-container .bg-slate-800\\/50,
                    .report-container .bg-slate-800\\/30 { background: #f8fafc !important; }
                    .report-container .bg-gradient-to-r,
                    .report-container .bg-gradient-to-b,
                    .report-container .bg-gradient-to-br { background: #f1f5f9 !important; }

                    /* === CRITICAL: Prevent page breaks splitting content === */
                    section,
                    .report-section { 
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    
                    /* Keep cards, panels, and blocks intact */
                    .report-container .rounded-xl,
                    .report-container .rounded-lg,
                    .report-container table,
                    .report-container thead,
                    .report-container tr {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    /* Keep KPI grid row together */
                    .report-container .grid {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    /* Keep headers with following content */
                    h1, h2, h3, h4, h5 {
                        break-after: avoid !important;
                        page-break-after: avoid !important;
                    }

                    /* Allow page break before major sections but not inside */
                    section + section {
                        break-before: auto;
                        page-break-before: auto;
                    }

                    /* Footer stays at end */
                    footer {
                        break-before: auto;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    /* Fix table layout for print */
                    table { width: 100% !important; border-collapse: collapse !important; }
                    td, th { padding: 8px 12px !important; }

                    /* Remove animations */
                    * { animation: none !important; transition: none !important; }
                }

                @page {
                    size: A4;
                    margin: 15mm 12mm;
                }
            `}</style>

            {/* Floating Actions Bar */}
            <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
                <button
                    onClick={fetchReportData}
                    className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition flex items-center gap-2 text-sm"
                >
                    <RefreshCw className="w-4 h-4" /> Atualizar
                </button>
                <button
                    onClick={handlePrintPDF}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition flex items-center gap-2 text-sm font-medium"
                >
                    <Download className="w-4 h-4" /> Exportar PDF
                </button>
            </div>

            <div ref={reportRef} className="report-container max-w-5xl mx-auto px-4 py-8 md:px-8 md:py-12 space-y-8">

                {/* ===== SECTION 1: COVER / HEADER ===== */}
                <header className="text-center pb-8 border-b border-slate-700/50">
                    <img src="/elege-logo.png" alt="Elege.ai" className="h-10 mx-auto mb-6" />
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        {report.activation.title}
                    </h1>
                    <p className="text-orange-400 font-medium text-lg mb-4">Relatório de Inteligência</p>
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <User className="w-4 h-4" /> {report.activation.created_by_name}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {formatDate(report.overview.first_citation_at)} — {formatDate(report.overview.last_citation_at)}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" /> Gerado em {formatDateTime(new Date().toISOString())}
                        </span>
                    </div>
                    {report.activation.category && (
                        <div className="mt-3">
                            <span className="inline-block bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-xs font-medium uppercase">
                                {report.activation.category}
                            </span>
                        </div>
                    )}
                </header>

                {/* ===== SECTION 2: KPI PANEL ===== */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-400" /> Indicadores-Chave
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KPICard label="Citações" value={report.overview.total_citations} icon={<MessageSquare className="w-5 h-5" />} color="text-blue-400" />
                        <KPICard
                            label="Sentimento Net"
                            value={`${report.sentiment.positive - report.sentiment.negative > 0 ? '+' : ''}${report.sentiment.positive - report.sentiment.negative}`}
                            icon={<TrendingUp className="w-5 h-5" />}
                            color={report.sentiment.positive > report.sentiment.negative ? 'text-emerald-400' : 'text-red-400'}
                        />
                        <KPICard label="Risk Score" value={report.risk.avg_risk_score} icon={<AlertTriangle className="w-5 h-5" />} color={report.risk.avg_risk_score > 60 ? 'text-red-400' : 'text-yellow-400'} />
                        <KPICard label="Crises" value={report.risk.escalated_crises} icon={<ShieldAlert className="w-5 h-5" />} color={report.risk.escalated_crises > 0 ? 'text-red-400' : 'text-emerald-400'} />
                    </div>
                </section>

                {/* ===== SECTION 3: RISK TRAFFIC LIGHT ===== */}
                <section className={`p-5 rounded-xl border ${riskCfg.border} ${riskCfg.bg}`}>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <div className={`w-4 h-4 rounded-full ${riskLevel === 'normal' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-emerald-900/40'}`} />
                            <div className={`w-4 h-4 rounded-full ${riskLevel === 'attention' ? 'bg-yellow-500 shadow-lg shadow-yellow-500/30' : 'bg-yellow-900/40'}`} />
                            <div className={`w-4 h-4 rounded-full ${riskLevel === 'crisis' ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse' : 'bg-red-900/40'}`} />
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${riskCfg.color}`}>Nível de Risco: {riskCfg.label}</p>
                            <p className="text-sm text-slate-400">
                                Score médio {report.risk.avg_risk_score} | Máximo {report.risk.max_risk_score} | {report.risk.high_risk_count} item(s) risco alto
                            </p>
                        </div>
                    </div>
                    {/* Sentiment bar */}
                    {totalSentiment > 0 && (
                        <div className="mt-4">
                            <div className="flex items-center gap-4 text-xs text-slate-400 mb-1.5">
                                <span>Distribuição de Sentimento</span>
                                <span className="ml-auto flex gap-3">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Positivo {((report.sentiment.positive / totalSentiment) * 100).toFixed(0)}%</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />Neutro {((report.sentiment.neutral / totalSentiment) * 100).toFixed(0)}%</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Negativo {((report.sentiment.negative / totalSentiment) * 100).toFixed(0)}%</span>
                                </span>
                            </div>
                            <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden flex">
                                <div className="bg-emerald-500 transition-all" style={{ width: `${(report.sentiment.positive / totalSentiment) * 100}%` }} />
                                <div className="bg-slate-500 transition-all" style={{ width: `${(report.sentiment.neutral / totalSentiment) * 100}%` }} />
                                <div className="bg-red-500 transition-all" style={{ width: `${(report.sentiment.negative / totalSentiment) * 100}%` }} />
                            </div>
                        </div>
                    )}
                </section>

                {/* ===== SECTION 4: KEYWORDS ===== */}
                <section className="report-section">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Hash className="w-5 h-5 text-orange-400" /> Análise de Keywords
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Top Keywords */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Ranking de Frequência</h3>
                            <div className="space-y-2.5">
                                {(report.top_keywords || []).slice(0, 10).map((kw, i) => {
                                    const maxCount = report.top_keywords[0]?.count || 1;
                                    return (
                                        <div key={kw.keyword} className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 w-5 text-right font-mono">{i + 1}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="text-sm text-white">{kw.keyword}</span>
                                                    <span className="text-xs font-mono text-slate-400">{kw.count}x</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" style={{ width: `${(kw.count / maxCount) * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Emergent Keywords */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Keywords Emergentes</h3>
                            <p className="text-xs text-slate-500 mb-3">Termos detectados que NÃO estavam nas keywords configuradas</p>
                            {(report.emergent_keywords || []).length === 0 ? (
                                <p className="text-sm text-slate-500 italic">Nenhuma keyword emergente detectada.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {report.emergent_keywords.map(kw => (
                                        <span key={kw.keyword} className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-sm border border-orange-500/20">
                                            {kw.keyword} <span className="text-orange-500/60 font-mono text-xs">{kw.count}x</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ===== SECTION 5: TARGET MENTIONS ===== */}
                {(report.target_mentions || []).length > 0 && (
                    <section>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-orange-400" /> Alvos Monitorados
                        </h2>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                            <div className="space-y-4">
                                {report.target_mentions.map(t => {
                                    const total = t.sentiment_positive + t.sentiment_negative + t.sentiment_neutral;
                                    return (
                                        <div key={t.name}>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-sm text-white font-medium">{t.name}</span>
                                                <span className="text-xs font-mono text-slate-400">{t.count} citações</span>
                                            </div>
                                            {total > 0 && (
                                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
                                                    <div className="bg-emerald-500" style={{ width: `${(t.sentiment_positive / total) * 100}%` }} />
                                                    <div className="bg-slate-500" style={{ width: `${(t.sentiment_neutral / total) * 100}%` }} />
                                                    <div className="bg-red-500" style={{ width: `${(t.sentiment_negative / total) * 100}%` }} />
                                                </div>
                                            )}
                                            <div className="flex gap-3 text-[10px] text-slate-500 mt-1">
                                                <span>✅ {t.sentiment_positive}</span>
                                                <span>➖ {t.sentiment_neutral}</span>
                                                <span>❌ {t.sentiment_negative}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Co-occurrence */}
                            {(report.target_cooccurrence || []).length > 0 && (
                                <div className="mt-5 pt-4 border-t border-slate-700/50">
                                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Co-ocorrências</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {report.target_cooccurrence.map((co, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 bg-slate-700/50 text-slate-300 px-3 py-1 rounded-full text-xs border border-slate-600/50">
                                                {co.pair[0]} ↔ {co.pair[1]}
                                                <span className="text-slate-500 font-mono">{co.count}x</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* ===== SECTION 6: VEHICLES / SOURCES ===== */}
                <section className="report-section">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Radio className="w-5 h-5 text-orange-400" /> Veículos & Fontes Analisados
                    </h2>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-left">
                                    <th className="px-5 py-3 text-slate-400 font-medium">Fonte</th>
                                    <th className="px-5 py-3 text-slate-400 font-medium text-center">Citações</th>
                                    <th className="px-5 py-3 text-slate-400 font-medium text-right">Última Detecção</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(report.sources || []).map((src, i) => (
                                    <tr key={src.source} className={`border-b border-slate-700/30 ${i % 2 === 0 ? '' : 'bg-slate-800/30'}`}>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-slate-500" />
                                                <span className="text-white">{src.source}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center font-mono text-slate-300">{src.count}</td>
                                        <td className="px-5 py-3 text-right text-slate-400">{formatDate(src.last_seen)}</td>
                                    </tr>
                                ))}
                                {(report.sources || []).length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-6 text-center text-slate-500">Nenhuma fonte detectada</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ===== SECTION 7: SCENARIO HIGHLIGHTS ===== */}
                {((report.top_risk_items || []).length > 0 || (report.crises || []).length > 0) && (
                    <section>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <AlertOctagon className="w-5 h-5 text-orange-400" /> Destaques de Cenário
                        </h2>

                        {/* Crisis Events */}
                        {(report.crises || []).length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-red-400 mb-3">Crises Identificadas</h3>
                                <div className="space-y-2">
                                    {report.crises.map(c => (
                                        <div key={c.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 ${c.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                                                c.severity === 'high' ? 'bg-red-400' :
                                                    c.severity === 'medium' ? 'bg-yellow-400' : 'bg-slate-400'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm text-white font-medium">{c.title}</span>
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        c.status === 'investigating' ? 'bg-yellow-500/10 text-yellow-400' :
                                                            'bg-red-500/10 text-red-400'
                                                        }`}>{c.status.toUpperCase()}</span>
                                                </div>
                                                <span className="text-xs text-slate-500">{formatDate(c.created_at)} • Severidade: {c.severity}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Risk Items */}
                        {(report.top_risk_items || []).length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-yellow-400 mb-3">Citações de Maior Risco</h3>
                                <div className="space-y-2">
                                    {report.top_risk_items.map(item => (
                                        <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${item.risk_score >= 80 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {item.risk_score}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium mb-1 line-clamp-2">{item.title}</p>
                                                    {item.summary && item.summary !== item.title && (
                                                        <p className="text-xs text-slate-400 line-clamp-2">{item.summary}</p>
                                                    )}
                                                    <span className="text-xs text-slate-500 mt-1 block">{formatDate(item.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ===== SECTIONS 8 & 9: AI ANALYSIS ===== */}
                <section className="report-section">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-orange-400" /> Análise Contextual & Projeções (IA)
                    </h2>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                        {aiAnalysis ? (
                            <div className="max-w-none space-y-3">
                                {aiAnalysis.split('\n').reduce((acc: React.ReactNode[], line: string, idx: number) => {
                                    const trimmed = line.trim();
                                    if (!trimmed) return acc;

                                    const formatInline = (text: string) => {
                                        const parts = text.split(/\*\*(.*?)\*\*/g);
                                        return parts.map((part, i) =>
                                            i % 2 === 1
                                                ? <strong key={i} className="text-white font-bold">{part}</strong>
                                                : <span key={i}>{part}</span>
                                        );
                                    };

                                    // # Main title
                                    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
                                        acc.push(
                                            <div key={idx} className="mt-2 mb-5 p-4 bg-gradient-to-r from-orange-600/15 to-amber-600/5 rounded-xl border border-orange-500/30">
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
                                                <div className="flex items-center gap-3 pb-3 border-b-2 border-orange-500/30">
                                                    <div className="w-1.5 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full" />
                                                    <h3 className="text-lg font-extrabold text-orange-200 tracking-wide">
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
                                                <div className="w-1 h-5 bg-orange-500/60 rounded-full" />
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
                                                <span className="text-orange-400 mt-2 text-[8px] shrink-0">●</span>
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
                                                <span className="bg-orange-500/20 text-orange-300 text-xs font-bold min-w-[24px] h-[24px] flex items-center justify-center rounded-full shrink-0 mt-0.5">{num}</span>
                                                <p className="text-[13px] text-slate-300 leading-relaxed flex-1">
                                                    {formatInline(text)}
                                                </p>
                                            </div>
                                        );
                                    }
                                    // Separator
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
                        ) : (
                            <div className="text-center py-8">
                                <Sparkles className="w-8 h-8 text-orange-400/50 mx-auto mb-3" />
                                <p className="text-slate-400 text-sm mb-4">Gere a análise contextual com projeções de cenário de crise usando IA.</p>
                                <button
                                    onClick={fetchAiAnalysis}
                                    disabled={aiLoading}
                                    className="no-print bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2.5 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-40 font-medium flex items-center gap-2 mx-auto"
                                >
                                    {aiLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Gerando análise...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-4 h-4" /> Gerar Análise Contextual
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* ===== SECTION 10: FOOTER ===== */}
                <footer className="pt-8 border-t border-slate-700/50 text-center space-y-2">
                    <img src="/elege-logo.png" alt="Elege.ai" className="h-6 mx-auto opacity-50" />
                    <p className="text-xs text-slate-500">
                        Relatório gerado em {formatDateTime(new Date().toISOString())} — Dados em tempo real
                    </p>
                    <p className="text-[10px] text-slate-600">
                        As análises de IA são geradas automaticamente e devem ser validadas por um analista humano.
                        Este documento é confidencial e destinado exclusivamente ao destinatário autorizado.
                    </p>
                    <p className="text-[10px] text-slate-600 font-medium">
                        Powered by Elege.ai — Plataforma de Inteligência Estratégica
                    </p>
                </footer>
            </div>
        </div>
    );
};

// KPI Card Component
const KPICard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({
    label, value, icon, color,
}) => (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
            <span className={color}>{icon}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
);
