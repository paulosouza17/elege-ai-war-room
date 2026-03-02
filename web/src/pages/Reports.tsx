import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    FileText, Download, TrendingUp, AlertTriangle, ShieldAlert,
    MessageSquare, Hash, Users, Radio, Loader2, ChevronDown,
    ChevronRight, RefreshCw, Globe, Calendar, Table, FileSpreadsheet,
    AlertOctagon, Sparkles, Brain, GitCompareArrows, BarChart3,
    ArrowRight, Eye, ExternalLink, Filter, Clock, UserX, Tv, Mic
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUserActivations } from '@/hooks/useUserActivations';

// ─── Types ──────────────────────────────────────────────────────────
interface SummaryData {
    activation?: {
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

// ─── Helpers ────────────────────────────────────────────────────────
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

function getRiskLevel(risk: SummaryData['risk'], sentiment: SummaryData['sentiment']): RiskLevel {
    if (risk.avg_risk_score > 70 || risk.escalated_crises > 0) return 'crisis';
    if (risk.avg_risk_score > 40 || sentiment.ratio_neg_pos > 1.5) return 'attention';
    return 'normal';
}

const RISK_CONFIG = {
    crisis: { label: 'CRISE', emoji: '🔴', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    attention: { label: 'ATENÇÃO', emoji: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    normal: { label: 'NORMAL', emoji: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
};

// ─── CSV / Export Helpers ───────────────────────────────────────────
function summaryToCSV(data: SummaryData, activationName: string): string {
    const lines: string[] = [];
    const sep = ',';

    // Header info
    lines.push(`Relatório de Dados - ${activationName}`);
    lines.push(`Gerado em:${sep}${formatDateTime(new Date().toISOString())}`);
    lines.push(`Período:${sep}${formatDate(data.overview.first_citation_at)} a ${formatDate(data.overview.last_citation_at)}`);
    lines.push('');

    // KPIs
    lines.push('=== INDICADORES-CHAVE ===');
    lines.push(`Métrica${sep}Valor`);
    lines.push(`Total Citações${sep}${data.overview.total_citations}`);
    lines.push(`Dias de Monitoramento${sep}${data.overview.monitoring_days}`);
    lines.push(`Sentimento Positivo${sep}${data.sentiment.positive}`);
    lines.push(`Sentimento Negativo${sep}${data.sentiment.negative}`);
    lines.push(`Sentimento Neutro${sep}${data.sentiment.neutral}`);
    lines.push(`Sentimento Net${sep}${data.sentiment.positive - data.sentiment.negative}`);
    lines.push(`Risk Score Médio${sep}${data.risk.avg_risk_score}`);
    lines.push(`Risk Score Máximo${sep}${data.risk.max_risk_score}`);
    lines.push(`Itens Alto Risco${sep}${data.risk.high_risk_count}`);
    lines.push(`Crises Escaladas${sep}${data.risk.escalated_crises}`);
    lines.push('');

    // Keywords
    if (data.top_keywords?.length > 0) {
        lines.push('=== KEYWORDS ===');
        lines.push(`Posição${sep}Keyword${sep}Frequência`);
        data.top_keywords.forEach((kw, i) => {
            lines.push(`${i + 1}${sep}${kw.keyword}${sep}${kw.count}`);
        });
        lines.push('');
    }

    // Emergent Keywords
    if (data.emergent_keywords?.length > 0) {
        lines.push('=== KEYWORDS EMERGENTES ===');
        lines.push(`Keyword${sep}Frequência`);
        data.emergent_keywords.forEach(kw => {
            lines.push(`${kw.keyword}${sep}${kw.count}`);
        });
        lines.push('');
    }

    // Target Mentions
    if (data.target_mentions?.length > 0) {
        lines.push('=== ALVOS MONITORADOS ===');
        lines.push(`Nome${sep}Total Citações${sep}Positivo${sep}Negativo${sep}Neutro`);
        data.target_mentions.forEach(t => {
            lines.push(`${t.name}${sep}${t.count}${sep}${t.sentiment_positive}${sep}${t.sentiment_negative}${sep}${t.sentiment_neutral}`);
        });
        lines.push('');
    }

    // Sources
    if (data.sources?.length > 0) {
        lines.push('=== FONTES ===');
        lines.push(`Fonte${sep}Citações${sep}Última Detecção`);
        data.sources.forEach(src => {
            lines.push(`${src.source}${sep}${src.count}${sep}${formatDate(src.last_seen)}`);
        });
        lines.push('');
    }

    // Top Risk Items
    if (data.top_risk_items?.length > 0) {
        lines.push('=== CITAÇÕES DE MAIOR RISCO ===');
        lines.push(`Risk Score${sep}Título${sep}Sentimento${sep}Data`);
        data.top_risk_items.forEach(item => {
            lines.push(`${item.risk_score}${sep}"${(item.title || '').replace(/"/g, '""')}"${sep}${item.sentiment}${sep}${formatDate(item.created_at)}`);
        });
        lines.push('');
    }

    // Crises
    if (data.crises?.length > 0) {
        lines.push('=== CRISES ===');
        lines.push(`Título${sep}Severidade${sep}Status${sep}Criada em${sep}Resolvida em`);
        data.crises.forEach(c => {
            lines.push(`"${(c.title || '').replace(/"/g, '""')}"${sep}${c.severity}${sep}${c.status}${sep}${formatDate(c.created_at)}${sep}${c.resolved_at ? formatDate(c.resolved_at) : '—'}`);
        });
    }

    return lines.join('\n');
}

function downloadCSV(content: string, filename: string) {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function openGoogleSheets(csvContent: string) {
    // Encode CSV for Sheets import via URL
    const encoded = encodeURIComponent(csvContent);
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vT/pub?output=csv`; // fallback
    // The most reliable way is to copy to clipboard and let user paste
    navigator.clipboard.writeText(csvContent).then(() => {
        window.open('https://docs.google.com/spreadsheets/create', '_blank');
    });
}

// ─── Main Component ─────────────────────────────────────────────────
export const Reports: React.FC = () => {
    const { activations, loading: activationsLoading } = useUserActivations();
    const [selectedActivation, setSelectedActivation] = useState<string | null>(null);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        kpis: true, strategic: true, risk: true, keywords: true, targets: true, sources: true, riskItems: true, crises: true, ai: false, compare: false, vehicles: false, threats: false,
    });
    const reportRef = useRef<HTMLDivElement>(null);

    // AI Analysis
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiUpdatedAt, setAiUpdatedAt] = useState<string | null>(null);

    // Compare Mode
    const [compareMode, setCompareMode] = useState(false);
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const [compareSummaries, setCompareSummaries] = useState<Record<string, SummaryData>>({});
    const [compareLoading, setCompareLoading] = useState(false);

    // Period Filter
    const [periodDays, setPeriodDays] = useState<number | null>(null); // null = all time

    // Vehicle Filter
    const [vehicleFilter, setVehicleFilter] = useState<string | null>(null); // null = all
    const [vehicleItems, setVehicleItems] = useState<{ id: string; title: string; url: string | null; source: string; source_type: string; sentiment: string; risk_score: number; created_at: string }[]>([]);
    const [vehicleLoading, setVehicleLoading] = useState(false);

    // Threats Data
    const [threatProfiles, setThreatProfiles] = useState<{ key: string; displayName: string; username: string | null; profileImage: string | null; followers: number | null; verified: boolean; negativeMentionCount: number; avgRiskScore: number; maxRiskScore: number; sourceTypes: string[]; lastActivity: string }[]>([]);
    const [threatsLoading, setThreatsLoading] = useState(false);

    // Auto-select first activation
    useEffect(() => {
        if (activations.length > 0 && !selectedActivation) {
            setSelectedActivation(activations[0].id);
        }
    }, [activations]);

    // Fetch data when activation changes
    useEffect(() => {
        if (selectedActivation && !compareMode) {
            fetchSummary(selectedActivation);
            loadSavedAiAnalysis(selectedActivation);
        }
    }, [selectedActivation, compareMode]);

    const fetchSummary = async (activationId: string) => {
        setDataLoading(true);
        setSummaryData(null);
        try {
            const { data, error } = await supabase.rpc('get_activation_summary', {
                p_activation_id: activationId,
            });
            if (error) throw error;
            setSummaryData(data);
        } catch (err: any) {
            console.error('[Reports] Summary fetch error:', err);
        } finally {
            setDataLoading(false);
        }
    };

    const loadSavedAiAnalysis = async (activationId: string) => {
        try {
            const res = await fetch(`/api/v1/activations/${activationId}/ai-analysis`);
            const json = await res.json();
            if (json.success && json.analysis) {
                setAiAnalysis(json.analysis);
                setAiUpdatedAt(json.updated_at || null);
            } else {
                setAiAnalysis(null);
                setAiUpdatedAt(null);
            }
        } catch { setAiAnalysis(null); }
    };

    const generateAiAnalysis = async () => {
        if (!selectedActivation) return;
        setAiLoading(true);
        try {
            const res = await fetch(`/api/v1/activations/${selectedActivation}/ai-analysis`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
            });
            const json = await res.json();
            if (json.success) {
                setAiAnalysis(json.analysis);
                setAiUpdatedAt(new Date().toISOString());
                setExpandedSections(prev => ({ ...prev, ai: true }));
            }
        } catch (err: any) {
            console.error('[AI Analysis] Error:', err);
        } finally {
            setAiLoading(false);
        }
    };

    // Compare: toggle activation in compare list
    const toggleCompareId = (id: string) => {
        setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const fetchCompareSummaries = async () => {
        if (compareIds.length < 2) return;
        setCompareLoading(true);
        try {
            const results: Record<string, SummaryData> = {};
            await Promise.all(compareIds.map(async (id) => {
                const { data, error } = await supabase.rpc('get_activation_summary', { p_activation_id: id });
                if (!error && data) results[id] = data;
            }));
            setCompareSummaries(results);
        } catch (err) {
            console.error('[Compare] Error:', err);
        } finally {
            setCompareLoading(false);
        }
    };

    useEffect(() => {
        if (compareMode && compareIds.length >= 2) fetchCompareSummaries();
    }, [compareIds, compareMode]);

    // Fetch vehicle items when activation + filter changes
    const fetchVehicleItems = async () => {
        if (!selectedActivation) return;
        setVehicleLoading(true);
        try {
            let query = supabase
                .from('intelligence_feed')
                .select('id, title, url, source, source_type, sentiment, risk_score, created_at')
                .eq('activation_id', selectedActivation)
                .neq('status', 'archived')
                .order('created_at', { ascending: false })
                .limit(200);
            if (vehicleFilter) query = query.eq('source_type', vehicleFilter);
            if (periodDays) {
                const since = new Date();
                since.setDate(since.getDate() - periodDays);
                query = query.gte('created_at', since.toISOString());
            }
            const { data, error } = await query;
            if (!error && data) setVehicleItems(data as any);
        } catch (err) { console.error('[Vehicle] Error:', err); }
        finally { setVehicleLoading(false); }
    };

    // Fetch threat profiles for selected activation
    const fetchThreatProfiles = async () => {
        if (!selectedActivation) return;
        setThreatsLoading(true);
        try {
            let query = supabase
                .from('intelligence_feed')
                .select('id, title, source, source_type, risk_score, sentiment, created_at, classification_metadata')
                .eq('activation_id', selectedActivation)
                .eq('sentiment', 'negative')
                .neq('status', 'archived')
                .order('created_at', { ascending: false })
                .limit(500);
            if (periodDays) {
                const since = new Date();
                since.setDate(since.getDate() - periodDays);
                query = query.gte('created_at', since.toISOString());
            }
            const { data, error } = await query;
            if (!error && data) {
                // Aggregate by author/source
                const profileMap = new Map<string, any>();
                for (const item of data as any[]) {
                    const cm = item.classification_metadata || {};
                    const key = cm.author_username || cm.author_name || item.source || 'desconhecido';
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
                            sourceTypes: new Set<string>(),
                            totalRisk: 0,
                            lastActivity: item.created_at,
                        });
                    }
                    const p = profileMap.get(key)!;
                    p.negativeMentionCount++;
                    p.totalRisk += (item.risk_score || 0);
                    p.maxRiskScore = Math.max(p.maxRiskScore, item.risk_score || 0);
                    p.sourceTypes.add(item.source_type || 'portal');
                    if (new Date(item.created_at) > new Date(p.lastActivity)) p.lastActivity = item.created_at;
                    if (!p.followers && cm.author_followers) p.followers = cm.author_followers;
                    if (!p.profileImage && cm.author_profile_image) p.profileImage = cm.author_profile_image;
                }
                const profiles = Array.from(profileMap.values()).map((p: any) => ({
                    ...p,
                    avgRiskScore: Math.round(p.totalRisk / p.negativeMentionCount),
                    sourceTypes: Array.from(p.sourceTypes),
                })).sort((a: any, b: any) => b.negativeMentionCount - a.negativeMentionCount || b.maxRiskScore - a.maxRiskScore);
                setThreatProfiles(profiles);
            }
        } catch (err) { console.error('[Threats] Error:', err); }
        finally { setThreatsLoading(false); }
    };

    // Refetch when activation or period changes
    useEffect(() => {
        if (selectedActivation && !compareMode) {
            fetchVehicleItems();
            fetchThreatProfiles();
        }
    }, [selectedActivation, periodDays, vehicleFilter, compareMode]);

    // Available source types from current vehicle items + sources
    const availableSourceTypes = useMemo(() => {
        const types = new Set<string>();
        (summaryData?.sources || []).forEach(s => {
            // infer source type from source name
            types.add(s.source.toLowerCase().includes('twitter') || s.source.toLowerCase().includes('x.com') ? 'social_media' : 'portal');
        });
        vehicleItems.forEach(v => types.add(v.source_type));
        return Array.from(types).sort();
    }, [summaryData, vehicleItems]);

    const sourceTypeLabels: Record<string, string> = {
        portal: 'Portais', social_media: 'Redes Sociais', tv: 'TV', radio: 'Rádio',
        instagram: 'Instagram', tiktok: 'TikTok', whatsapp: 'WhatsApp', twitter: 'Twitter/X',
    };

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleExportPDF = () => { window.print(); };

    const handleExportCSV = () => {
        if (!summaryData) return;
        const name = activations.find(a => a.id === selectedActivation)?.name || 'relatorio';
        const csv = summaryToCSV(summaryData, name);
        downloadCSV(csv, `relatorio_${name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`);
    };

    const handleExportSheets = () => {
        if (!summaryData) return;
        const name = activations.find(a => a.id === selectedActivation)?.name || 'relatorio';
        const csv = summaryToCSV(summaryData, name);
        openGoogleSheets(csv);
    };

    const selectedName = activations.find(a => a.id === selectedActivation)?.name || '';

    // Strategic KPIs
    const strategicKPIs = useMemo(() => {
        if (!summaryData) return null;
        const s = summaryData.sentiment;
        const total = s.positive + s.negative + s.neutral;
        return {
            ratioNegPos: s.positive > 0 ? (s.negative / s.positive).toFixed(2) : '∞',
            pctNegative: total > 0 ? ((s.negative / total) * 100).toFixed(1) : '0',
            pctPositive: total > 0 ? ((s.positive / total) * 100).toFixed(1) : '0',
            totalSources: summaryData.sources?.length || 0,
            totalTargets: summaryData.target_mentions?.length || 0,
            avgCitationsPerDay: summaryData.overview.monitoring_days > 0 ? Math.round(summaryData.overview.total_citations / summaryData.overview.monitoring_days) : summaryData.overview.total_citations,
            emergentCount: summaryData.emergent_keywords?.length || 0,
        };
    }, [summaryData]);

    // Computed values
    const riskLevel = summaryData ? getRiskLevel(summaryData.risk, summaryData.sentiment) : 'normal';
    const riskCfg = RISK_CONFIG[riskLevel];
    const totalSentiment = summaryData ? summaryData.sentiment.positive + summaryData.sentiment.negative + summaryData.sentiment.neutral : 0;

    return (
        <div className="min-h-screen">
            {/* Print styles */}
            <style>{`
                @media print {
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    html, body { background: white !important; margin: 0 !important; padding: 0 !important; width: 100% !important; height: auto !important; overflow: visible !important; font-size: 11px !important; }
                    nav, header, .no-print, aside, [class*="sidebar"], [class*="Sidebar"] { display: none !important; width: 0 !important; height: 0 !important; overflow: hidden !important; }
                    main, [class*="main-content"], .print-report { 
                        margin: 0 !important; padding: 8mm 0 !important; max-width: 100% !important; width: 100% !important;
                        background: white !important; color: #1e293b !important;
                    }
                    .print-report * { border-color: #cbd5e1 !important; }
                    .print-report .text-white, .print-report h1, .print-report h2,
                    .print-report h3, .print-report h4 { color: #0f172a !important; }
                    .print-report .text-slate-400, .print-report .text-slate-300 { color: #475569 !important; }
                    .print-report .text-slate-500 { color: #64748b !important; }
                    .print-report .text-orange-400 { color: #ea580c !important; }
                    .print-report .text-emerald-400, .print-report .text-green-400 { color: #059669 !important; }
                    .print-report .text-red-400 { color: #dc2626 !important; }
                    .print-report .text-yellow-400 { color: #ca8a04 !important; }
                    .print-report .text-blue-400 { color: #2563eb !important; }
                    .print-report [class*="bg-slate-800"], .print-report [class*="bg-slate-900"] { background: #f8fafc !important; }
                    .print-report [class*="bg-gradient"] { background: #f1f5f9 !important; }
                    .print-report [class*="bg-red-500/"], .print-report [class*="bg-emerald-500/"],
                    .print-report [class*="bg-orange-500/"], .print-report [class*="bg-yellow-500/"] { background-color: inherit !important; }
                    .report-section { break-inside: avoid !important; page-break-inside: avoid !important; margin-bottom: 4mm !important; }
                    .print-report .rounded-xl, .print-report .rounded-lg { break-inside: avoid !important; }
                    .print-report table { break-inside: auto !important; width: 100% !important; border-collapse: collapse !important; }
                    .print-report tr { break-inside: avoid !important; }
                    .print-report td, .print-report th { padding: 4px 8px !important; font-size: 10px !important; }
                    h1, h2, h3, h4 { break-after: avoid !important; }
                    .print-report .grid { gap: 3mm !important; }
                    .print-report .space-y-6 > * + * { margin-top: 4mm !important; }
                    .print-report .p-5, .print-report .p-4 { padding: 3mm !important; }
                    * { animation: none !important; transition: none !important; }
                }
                @page { size: A4; margin: 6mm 8mm; }
            `}</style>

            {/* ─── HEADER BAR (no-print) ─── */}
            <div className="no-print p-6 pb-0">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <FileText className="w-7 h-7 text-orange-400" />
                            Relatórios
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Relatórios detalhados e comparativos por ativação</p>
                    </div>
                    <div className="flex gap-2">
                        {/* Mode Toggle */}
                        <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mr-2">
                            <button
                                onClick={() => { setCompareMode(false); }}
                                className={`px-3 py-2 text-xs font-medium transition flex items-center gap-1.5 ${!compareMode ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <FileText className="w-3.5 h-3.5" /> Individual
                            </button>
                            <button
                                onClick={() => { setCompareMode(true); if (compareIds.length === 0 && activations.length >= 2) setCompareIds(activations.slice(0, 2).map(a => a.id)); }}
                                className={`px-3 py-2 text-xs font-medium transition flex items-center gap-1.5 ${compareMode ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <GitCompareArrows className="w-3.5 h-3.5" /> Comparativo
                            </button>
                        </div>
                        {!compareMode && (
                            <button
                                onClick={generateAiAnalysis}
                                disabled={!selectedActivation || aiLoading}
                                className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-purple-500 hover:to-purple-400 transition flex items-center gap-2 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                                {aiLoading ? 'Gerando...' : 'Relatório IA'}
                            </button>
                        )}
                        <button onClick={handleExportCSV} disabled={!summaryData && !compareMode} className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition flex items-center gap-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                            <Table className="w-4 h-4" /> CSV
                        </button>
                        <button onClick={handleExportSheets} disabled={!summaryData && !compareMode} className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition flex items-center gap-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed" title="Copia dados e abre Google Sheets">
                            <FileSpreadsheet className="w-4 h-4" /> Sheets
                        </button>
                        <button onClick={handleExportPDF} disabled={!summaryData && !compareMode} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition flex items-center gap-2 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed">
                            <Download className="w-4 h-4" /> PDF
                        </button>
                    </div>
                </div>

                {/* ─── ACTIVATION SELECTOR ─── */}
                {activationsLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando ativações...
                    </div>
                ) : compareMode ? (
                    <div className="mb-6">
                        <p className="text-xs text-slate-500 mb-2">Selecione 2 ou mais ativações para comparar:</p>
                        <div className="flex gap-2 flex-wrap">
                            {activations.map(act => (
                                <button
                                    key={act.id}
                                    onClick={() => toggleCompareId(act.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${compareIds.includes(act.id)
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    {act.name}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 flex-wrap mb-6">
                        {activations.map(act => (
                            <button
                                key={act.id}
                                onClick={() => setSelectedActivation(act.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedActivation === act.id
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {act.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── FILTER BAR (no-print) ─── */}
            {!compareMode && selectedActivation && !dataLoading && summaryData && (
                <div className="no-print px-6 pb-4 flex flex-wrap items-center gap-3">
                    {/* Period Filter */}
                    <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500 ml-2" />
                        {[{ label: '7d', value: 7 }, { label: '15d', value: 15 }, { label: '30d', value: 30 }, { label: 'Tudo', value: null as number | null }].map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => setPeriodDays(opt.value)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${periodDays === opt.value ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Vehicle Filter */}
                    <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-0.5">
                        <Filter className="w-3.5 h-3.5 text-slate-500 ml-2" />
                        <button
                            onClick={() => setVehicleFilter(null)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${vehicleFilter === null ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Todos
                        </button>
                        {availableSourceTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => setVehicleFilter(type)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${vehicleFilter === type ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {sourceTypeLabels[type] || type}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── REPORT CONTENT ─── */}
            {compareMode ? (
                /* ══════════ COMPARE MODE VIEW ══════════ */
                compareLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                    </div>
                ) : compareIds.length < 2 ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <GitCompareArrows className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500">Selecione pelo menos 2 ativações para comparar.</p>
                        </div>
                    </div>
                ) : (
                    <div className="print-report px-6 py-4 space-y-6">
                        <div className="hidden print:block text-center pb-4 border-b border-slate-700/50">
                            <h1 className="text-xl font-bold text-white">Relatório Comparativo</h1>
                            <p className="text-orange-400 text-sm mt-1">{compareIds.map(id => activations.find(a => a.id === id)?.name).join(' vs ')}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Gerado em {formatDateTime(new Date().toISOString())}</p>
                        </div>

                        {/* Compare: KPIs Table */}
                        <section className="report-section">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-orange-400" />
                                <h2 className="text-lg font-bold text-white">Comparativo de KPIs</h2>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="px-4 py-3 text-left text-slate-400 font-medium">Métrica</th>
                                            {compareIds.map(id => (
                                                <th key={id} className="px-4 py-3 text-center text-orange-400 font-medium">
                                                    {activations.find(a => a.id === id)?.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: 'Total Citações', key: (d: SummaryData) => d.overview.total_citations },
                                            { label: 'Dias Monitoramento', key: (d: SummaryData) => d.overview.monitoring_days },
                                            { label: 'Citações/Dia', key: (d: SummaryData) => d.overview.monitoring_days > 0 ? Math.round(d.overview.total_citations / d.overview.monitoring_days) : d.overview.total_citations },
                                            { label: 'Sentimento Positivo', key: (d: SummaryData) => d.sentiment.positive },
                                            { label: 'Sentimento Negativo', key: (d: SummaryData) => d.sentiment.negative },
                                            { label: 'Sentimento Neutro', key: (d: SummaryData) => d.sentiment.neutral },
                                            { label: 'Sentimento Net', key: (d: SummaryData) => d.sentiment.positive - d.sentiment.negative },
                                            { label: '% Negativo', key: (d: SummaryData) => { const t = d.sentiment.positive + d.sentiment.negative + d.sentiment.neutral; return t > 0 ? ((d.sentiment.negative / t) * 100).toFixed(1) + '%' : '0%'; } },
                                            { label: 'Ratio Neg/Pos', key: (d: SummaryData) => d.sentiment.positive > 0 ? (d.sentiment.negative / d.sentiment.positive).toFixed(2) : '∞' },
                                            { label: 'Risk Score Médio', key: (d: SummaryData) => d.risk.avg_risk_score },
                                            { label: 'Risk Score Máximo', key: (d: SummaryData) => d.risk.max_risk_score },
                                            { label: 'Itens Alto Risco', key: (d: SummaryData) => d.risk.high_risk_count },
                                            { label: 'Crises Escaladas', key: (d: SummaryData) => d.risk.escalated_crises },
                                            { label: 'Total Fontes', key: (d: SummaryData) => d.sources?.length || 0 },
                                            { label: 'Keywords Emergentes', key: (d: SummaryData) => d.emergent_keywords?.length || 0 },
                                        ].map((row, i) => (
                                            <tr key={row.label} className={`border-b border-slate-700/30 ${i % 2 ? 'bg-slate-800/30' : ''}`}>
                                                <td className="px-4 py-2 text-slate-300 font-medium">{row.label}</td>
                                                {compareIds.map(id => {
                                                    const d = compareSummaries[id];
                                                    return <td key={id} className="px-4 py-2 text-center font-mono text-white">{d ? row.key(d) : '—'}</td>;
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Compare: Targets */}
                        <section className="report-section">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-orange-400" />
                                <h2 className="text-lg font-bold text-white">Comparativo de Alvos</h2>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="px-4 py-3 text-left text-slate-400 font-medium">Pessoa</th>
                                            {compareIds.map(id => (
                                                <th key={id} className="px-4 py-3 text-center text-orange-400 font-medium" colSpan={2}>
                                                    {activations.find(a => a.id === id)?.name}
                                                </th>
                                            ))}
                                        </tr>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="px-4 py-1"></th>
                                            {compareIds.map(id => (<React.Fragment key={id}>
                                                <th className="px-2 py-1 text-[10px] text-slate-500 text-center">Citações</th>
                                                <th className="px-2 py-1 text-[10px] text-slate-500 text-center">Sentimento</th>
                                            </React.Fragment>))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const allNames = new Set<string>();
                                            compareIds.forEach(id => {
                                                (compareSummaries[id]?.target_mentions || []).forEach(t => allNames.add(t.name));
                                            });
                                            return Array.from(allNames).map((name, i) => (
                                                <tr key={name} className={`border-b border-slate-700/30 ${i % 2 ? 'bg-slate-800/30' : ''}`}>
                                                    <td className="px-4 py-2 text-white font-medium">{name}</td>
                                                    {compareIds.map(id => {
                                                        const t = (compareSummaries[id]?.target_mentions || []).find(x => x.name === name);
                                                        return <React.Fragment key={id}>
                                                            <td className="px-2 py-2 text-center font-mono text-slate-300">{t?.count || 0}</td>
                                                            <td className="px-2 py-2 text-center">
                                                                {t ? (
                                                                    <span className="text-[10px]">
                                                                        <span className="text-emerald-400">+{t.sentiment_positive}</span>{' '}
                                                                        <span className="text-red-400">-{t.sentiment_negative}</span>
                                                                    </span>
                                                                ) : <span className="text-slate-600">—</span>}
                                                            </td>
                                                        </React.Fragment>;
                                                    })}
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Compare: Sources */}
                        <section className="report-section">
                            <div className="flex items-center gap-2 mb-4">
                                <Radio className="w-5 h-5 text-orange-400" />
                                <h2 className="text-lg font-bold text-white">Comparativo de Veículos</h2>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="px-4 py-3 text-left text-slate-400 font-medium">Veículo</th>
                                            {compareIds.map(id => (
                                                <th key={id} className="px-4 py-3 text-center text-orange-400 font-medium">
                                                    {activations.find(a => a.id === id)?.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const allSources = new Set<string>();
                                            compareIds.forEach(id => {
                                                (compareSummaries[id]?.sources || []).forEach(s => allSources.add(s.source));
                                            });
                                            return Array.from(allSources).sort().map((src, i) => (
                                                <tr key={src} className={`border-b border-slate-700/30 ${i % 2 ? 'bg-slate-800/30' : ''}`}>
                                                    <td className="px-4 py-2"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-slate-500" /><span className="text-white">{src}</span></span></td>
                                                    {compareIds.map(id => {
                                                        const s = (compareSummaries[id]?.sources || []).find(x => x.source === src);
                                                        return <td key={id} className="px-4 py-2 text-center font-mono text-slate-300">{s?.count || 0}</td>;
                                                    })}
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <footer className="hidden print:block pt-4 border-t border-slate-700/50 text-center">
                            <p className="text-[10px] text-slate-600">Relatório Comparativo — Gerado em {formatDateTime(new Date().toISOString())} — Elege.ai</p>
                        </footer>
                    </div>
                )
            ) : dataLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Carregando dados do relatório...</p>
                    </div>
                </div>
            ) : !summaryData ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500">Selecione uma ativação para gerar o relatório.</p>
                    </div>
                </div>
            ) : (
                <div ref={reportRef} className="print-report px-6 py-4 space-y-6">

                    {/* ═══ HEADER (print only branding) ═══ */}
                    <div className="hidden print:block text-center pb-6 border-b border-slate-700/50">
                        <h1 className="text-2xl font-bold text-white">{selectedName}</h1>
                        <p className="text-orange-400 font-medium mt-1">Relatório de Dados Diretos</p>
                        <p className="text-xs text-slate-500 mt-2">
                            Período: {formatDate(summaryData.overview.first_citation_at)} — {formatDate(summaryData.overview.last_citation_at)} | Gerado em {formatDateTime(new Date().toISOString())}
                        </p>
                    </div>

                    {/* ═══ SECTION 1: KPIs ═══ */}
                    <SectionWrapper
                        title="Indicadores-Chave"
                        icon={<TrendingUp className="w-5 h-5 text-orange-400" />}
                        sectionKey="kpis"
                        expanded={expandedSections.kpis}
                        onToggle={toggleSection}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <KPICard label="Citações" value={summaryData.overview.total_citations} icon={<MessageSquare className="w-5 h-5" />} color="text-blue-400" sub={`${summaryData.overview.monitoring_days} dias`} />
                            <KPICard
                                label="Sentimento Net"
                                value={`${summaryData.sentiment.positive - summaryData.sentiment.negative > 0 ? '+' : ''}${summaryData.sentiment.positive - summaryData.sentiment.negative}`}
                                icon={<TrendingUp className="w-5 h-5" />}
                                color={summaryData.sentiment.positive > summaryData.sentiment.negative ? 'text-emerald-400' : 'text-red-400'}
                                sub={`${summaryData.sentiment.positive} pos / ${summaryData.sentiment.negative} neg / ${summaryData.sentiment.neutral} neutro`}
                            />
                            <KPICard label="Risk Score" value={summaryData.risk.avg_risk_score} icon={<AlertTriangle className="w-5 h-5" />} color={summaryData.risk.avg_risk_score > 60 ? 'text-red-400' : 'text-yellow-400'} sub={`Máx: ${summaryData.risk.max_risk_score} | Alto: ${summaryData.risk.high_risk_count}`} />
                            <KPICard label="Crises" value={summaryData.risk.escalated_crises} icon={<ShieldAlert className="w-5 h-5" />} color={summaryData.risk.escalated_crises > 0 ? 'text-red-400' : 'text-emerald-400'} sub={`${summaryData.overview.total_files} arquivos`} />
                        </div>
                    </SectionWrapper>

                    {/* ═══ SECTION 1.5: STRATEGIC KPIs ═══ */}
                    {strategicKPIs && (
                        <SectionWrapper title="Indicadores Estratégicos" icon={<BarChart3 className="w-5 h-5 text-orange-400" />} sectionKey="strategic" expanded={expandedSections.strategic} onToggle={toggleSection}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KPICard label="Citações/Dia" value={strategicKPIs.avgCitationsPerDay} icon={<BarChart3 className="w-5 h-5" />} color="text-sky-400" sub="Média durante monitoramento" />
                                <KPICard label="Ratio Neg/Pos" value={strategicKPIs.ratioNegPos} icon={<TrendingUp className="w-5 h-5" />} color={Number(strategicKPIs.ratioNegPos) > 1 ? 'text-red-400' : 'text-emerald-400'} sub={`${strategicKPIs.pctNegative}% negativo | ${strategicKPIs.pctPositive}% positivo`} />
                                <KPICard label="Veículos" value={strategicKPIs.totalSources} icon={<Radio className="w-5 h-5" />} color="text-purple-400" sub={`${strategicKPIs.totalTargets} alvo(s) monitorado(s)`} />
                                <KPICard label="Keywords Emergentes" value={strategicKPIs.emergentCount} icon={<Sparkles className="w-5 h-5" />} color="text-amber-400" sub="Termos fora do configurado" />
                            </div>
                        </SectionWrapper>
                    )}

                    {/* ═══ SECTION 2: RISK TRAFFIC LIGHT ═══ */}
                    <SectionWrapper
                        title="Semáforo de Risco"
                        icon={<ShieldAlert className="w-5 h-5 text-orange-400" />}
                        sectionKey="risk"
                        expanded={expandedSections.risk}
                        onToggle={toggleSection}
                    >
                        <div className={`p-5 rounded-xl border ${riskCfg.border} ${riskCfg.bg}`}>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <div className={`w-4 h-4 rounded-full ${riskLevel === 'normal' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-emerald-900/40'}`} />
                                    <div className={`w-4 h-4 rounded-full ${riskLevel === 'attention' ? 'bg-yellow-500 shadow-lg shadow-yellow-500/30' : 'bg-yellow-900/40'}`} />
                                    <div className={`w-4 h-4 rounded-full ${riskLevel === 'crisis' ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse' : 'bg-red-900/40'}`} />
                                </div>
                                <div>
                                    <p className={`text-lg font-bold ${riskCfg.color}`}>Nível de Risco: {riskCfg.label}</p>
                                    <p className="text-sm text-slate-400">
                                        Score médio {summaryData.risk.avg_risk_score} | Máximo {summaryData.risk.max_risk_score} | {summaryData.risk.high_risk_count} item(s) risco alto
                                    </p>
                                </div>
                            </div>
                            {/* Sentiment bar */}
                            {totalSentiment > 0 && (
                                <div className="mt-4">
                                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-1.5">
                                        <span>Distribuição de Sentimento</span>
                                        <span className="ml-auto flex gap-3">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Positivo {((summaryData.sentiment.positive / totalSentiment) * 100).toFixed(0)}%</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />Neutro {((summaryData.sentiment.neutral / totalSentiment) * 100).toFixed(0)}%</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Negativo {((summaryData.sentiment.negative / totalSentiment) * 100).toFixed(0)}%</span>
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden flex">
                                        <div className="bg-emerald-500 transition-all" style={{ width: `${(summaryData.sentiment.positive / totalSentiment) * 100}%` }} />
                                        <div className="bg-slate-500 transition-all" style={{ width: `${(summaryData.sentiment.neutral / totalSentiment) * 100}%` }} />
                                        <div className="bg-red-500 transition-all" style={{ width: `${(summaryData.sentiment.negative / totalSentiment) * 100}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </SectionWrapper>

                    {/* ═══ SECTION 3: KEYWORDS ═══ */}
                    <SectionWrapper
                        title="Análise de Keywords"
                        icon={<Hash className="w-5 h-5 text-orange-400" />}
                        sectionKey="keywords"
                        expanded={expandedSections.keywords}
                        onToggle={toggleSection}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Top Keywords */}
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Ranking de Frequência</h3>
                                <div className="space-y-2.5">
                                    {(summaryData.top_keywords || []).slice(0, 10).map((kw, i) => {
                                        const maxCount = summaryData.top_keywords[0]?.count || 1;
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
                                    {(summaryData.top_keywords || []).length === 0 && (
                                        <p className="text-sm text-slate-500 italic">Nenhuma keyword identificada.</p>
                                    )}
                                </div>
                            </div>

                            {/* Emergent Keywords */}
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Keywords Emergentes</h3>
                                <p className="text-xs text-slate-500 mb-3">Termos detectados que NÃO estavam nas keywords configuradas</p>
                                {(summaryData.emergent_keywords || []).length === 0 ? (
                                    <p className="text-sm text-slate-500 italic">Nenhuma keyword emergente detectada.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {summaryData.emergent_keywords.map(kw => (
                                            <span key={kw.keyword} className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-sm border border-orange-500/20">
                                                {kw.keyword} <span className="text-orange-500/60 font-mono text-xs">{kw.count}x</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </SectionWrapper>

                    {/* ═══ SECTION 4: TARGET MENTIONS ═══ */}
                    {(summaryData.target_mentions || []).length > 0 && (
                        <SectionWrapper
                            title="Alvos Monitorados"
                            icon={<Users className="w-5 h-5 text-orange-400" />}
                            sectionKey="targets"
                            expanded={expandedSections.targets}
                            onToggle={toggleSection}
                        >
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                                <div className="space-y-4">
                                    {summaryData.target_mentions.map(t => {
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
                                {(summaryData.target_cooccurrence || []).length > 0 && (
                                    <div className="mt-5 pt-4 border-t border-slate-700/50">
                                        <h3 className="text-sm font-semibold text-slate-300 mb-2">Co-ocorrências</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {summaryData.target_cooccurrence.map((co, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 bg-slate-700/50 text-slate-300 px-3 py-1 rounded-full text-xs border border-slate-600/50">
                                                    {co.pair[0]} ↔ {co.pair[1]}
                                                    <span className="text-slate-500 font-mono">{co.count}x</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SectionWrapper>
                    )}

                    {/* ═══ SECTION 5: SOURCES TABLE ═══ */}
                    {(summaryData.sources || []).length > 0 && (
                        <SectionWrapper
                            title="Veículos & Fontes"
                            icon={<Radio className="w-5 h-5 text-orange-400" />}
                            sectionKey="sources"
                            expanded={expandedSections.sources}
                            onToggle={toggleSection}
                        >
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
                                        {summaryData.sources.map((src, i) => (
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
                                    </tbody>
                                </table>
                            </div>
                        </SectionWrapper>
                    )}

                    {/* ═══ SECTION 6: TOP RISK ITEMS ═══ */}
                    {(summaryData.top_risk_items || []).length > 0 && (
                        <SectionWrapper
                            title="Citações de Maior Risco"
                            icon={<AlertOctagon className="w-5 h-5 text-orange-400" />}
                            sectionKey="riskItems"
                            expanded={expandedSections.riskItems}
                            onToggle={toggleSection}
                        >
                            <div className="space-y-2">
                                {summaryData.top_risk_items.map(item => (
                                    <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${item.risk_score >= 80 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                {item.risk_score}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium mb-1 line-clamp-2">{item.title}</p>
                                                {item.summary && item.summary !== item.title && (
                                                    <p className="text-xs text-slate-400 line-clamp-2">{item.summary}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${item.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' : item.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                                        {item.sentiment === 'negative' ? 'Negativo' : item.sentiment === 'positive' ? 'Positivo' : 'Neutro'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionWrapper>
                    )}

                    {/* ═══ SECTION 7: CRISES ═══ */}
                    {(summaryData.crises || []).length > 0 && (
                        <SectionWrapper
                            title="Crises Identificadas"
                            icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                            sectionKey="crises"
                            expanded={expandedSections.crises}
                            onToggle={toggleSection}
                        >
                            <div className="space-y-2">
                                {summaryData.crises.map(c => (
                                    <div key={c.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.severity === 'critical' ? 'bg-red-500 animate-pulse' :
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
                        </SectionWrapper>
                    )}

                    {/* ═══ SECTION 8: VEHICLE DETAILS ═══ */}
                    <SectionWrapper
                        title={`Detalhamento por Veículo${vehicleFilter ? ` — ${sourceTypeLabels[vehicleFilter] || vehicleFilter}` : ''}`}
                        icon={<Globe className="w-5 h-5 text-orange-400" />}
                        sectionKey="vehicles"
                        expanded={expandedSections.vehicles}
                        onToggle={toggleSection}
                    >
                        {vehicleLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                            </div>
                        ) : vehicleItems.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">Nenhum item encontrado para este filtro.</p>
                        ) : (
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700/50 text-left">
                                            <th className="px-4 py-3 text-slate-400 font-medium">Título</th>
                                            <th className="px-4 py-3 text-slate-400 font-medium text-center w-24">Veículo</th>
                                            <th className="px-4 py-3 text-slate-400 font-medium text-center w-20">Sentimento</th>
                                            <th className="px-4 py-3 text-slate-400 font-medium text-center w-16">Risco</th>
                                            <th className="px-4 py-3 text-slate-400 font-medium text-center w-28">Data</th>
                                            <th className="px-4 py-3 text-slate-400 font-medium text-center w-16">Fonte</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vehicleItems.slice(0, 50).map((item, i) => {
                                            const isMediaOnly = item.source_type === 'tv' || item.source_type === 'radio';
                                            return (
                                                <tr key={item.id} className={`border-b border-slate-700/30 ${i % 2 ? 'bg-slate-800/30' : ''}`}>
                                                    <td className="px-4 py-2 text-white max-w-sm">
                                                        <span className="line-clamp-1">{item.title || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <span className="text-xs text-slate-400 flex items-center justify-center gap-1">
                                                            {item.source_type === 'tv' ? <Tv className="w-3 h-3" /> :
                                                                item.source_type === 'radio' ? <Mic className="w-3 h-3" /> :
                                                                    <Globe className="w-3 h-3" />}
                                                            {sourceTypeLabels[item.source_type] || item.source_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${item.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                                                                item.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                    'bg-slate-700 text-slate-400'
                                                            }`}>
                                                            {item.sentiment === 'negative' ? 'Neg' : item.sentiment === 'positive' ? 'Pos' : 'Neutro'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-2 text-center font-mono text-xs ${item.risk_score >= 70 ? 'text-red-400' : item.risk_score >= 40 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                                        {item.risk_score || '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-xs text-slate-400">{formatDate(item.created_at)}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        {isMediaOnly ? (
                                                            <span className="text-[10px] text-slate-500">{item.source_type.toUpperCase()}</span>
                                                        ) : item.url ? (
                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition" title={item.url}>
                                                                <ExternalLink className="w-3.5 h-3.5 mx-auto" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-600">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {vehicleItems.length > 50 && (
                                    <div className="px-4 py-2 text-xs text-slate-500 text-center border-t border-slate-700/30">
                                        Exibindo 50 de {vehicleItems.length} itens
                                    </div>
                                )}
                            </div>
                        )}
                    </SectionWrapper>

                    {/* ═══ SECTION 9: THREATS REPORT ═══ */}
                    <SectionWrapper
                        title="Relatório de Ameaças"
                        icon={<UserX className="w-5 h-5 text-red-400" />}
                        sectionKey="threats"
                        expanded={expandedSections.threats}
                        onToggle={toggleSection}
                    >
                        {threatsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                            </div>
                        ) : threatProfiles.length === 0 ? (
                            <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-6 text-center">
                                <ShieldAlert className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Nenhuma ameaça identificada no período.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Summary KPIs */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-center">
                                        <div className="text-xl font-bold text-red-400">{threatProfiles.length}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Perfis Hostis</div>
                                    </div>
                                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 text-center">
                                        <div className="text-xl font-bold text-orange-400">{threatProfiles.reduce((s, p) => s + p.negativeMentionCount, 0)}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Menções Negativas</div>
                                    </div>
                                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-center">
                                        <div className="text-xl font-bold text-yellow-400">{Math.max(...threatProfiles.map(p => p.maxRiskScore))}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Risco Máximo</div>
                                    </div>
                                </div>

                                {/* Profile List */}
                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700/50 text-left">
                                                <th className="px-4 py-3 text-slate-400 font-medium">Perfil</th>
                                                <th className="px-4 py-3 text-slate-400 font-medium text-center">Menções Neg.</th>
                                                <th className="px-4 py-3 text-slate-400 font-medium text-center">Risco Médio</th>
                                                <th className="px-4 py-3 text-slate-400 font-medium text-center">Risco Máx.</th>
                                                <th className="px-4 py-3 text-slate-400 font-medium text-center">Tipo Mídia</th>
                                                <th className="px-4 py-3 text-slate-400 font-medium text-right">Última Atividade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {threatProfiles.slice(0, 25).map((profile, i) => {
                                                const level = profile.maxRiskScore >= 80 ? 'critical' : profile.maxRiskScore >= 60 ? 'high' : profile.negativeMentionCount >= 2 ? 'moderate' : 'low';
                                                const levelColors = { critical: 'text-red-400', high: 'text-orange-400', moderate: 'text-amber-400', low: 'text-slate-400' };
                                                return (
                                                    <tr key={profile.key} className={`border-b border-slate-700/30 ${i % 2 ? 'bg-slate-800/30' : ''}`}>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-2">
                                                                {profile.profileImage ? (
                                                                    <img src={profile.profileImage} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-600" />
                                                                ) : (
                                                                    <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                                                        {profile.displayName.slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="text-white text-sm font-medium">{profile.displayName}</span>
                                                                    {profile.username && <span className="text-[10px] text-slate-500 ml-1.5">@{profile.username}</span>}
                                                                    {profile.followers && <span className="text-[10px] text-slate-600 ml-1">{profile.followers >= 1000 ? `${(profile.followers / 1000).toFixed(1)}k` : profile.followers} seg.</span>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-center font-mono font-bold text-red-400">{profile.negativeMentionCount}</td>
                                                        <td className={`px-4 py-2 text-center font-mono ${levelColors[level]}`}>{profile.avgRiskScore}%</td>
                                                        <td className={`px-4 py-2 text-center font-mono ${levelColors[level]}`}>{profile.maxRiskScore}%</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {profile.sourceTypes.map(t => (
                                                                    <span key={t} className="text-[9px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">{sourceTypeLabels[t] || t}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-xs text-slate-400">{formatDate(profile.lastActivity)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {threatProfiles.length > 25 && (
                                        <div className="px-4 py-2 text-xs text-slate-500 text-center border-t border-slate-700/30">
                                            Exibindo 25 de {threatProfiles.length} perfis
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </SectionWrapper>

                    {/* ═══ SECTION 10: AI ANALYSIS ═══ */}
                    <SectionWrapper
                        title="Análise por IA"
                        icon={<Brain className="w-5 h-5 text-purple-400" />}
                        sectionKey="ai"
                        expanded={expandedSections.ai}
                        onToggle={toggleSection}
                    >
                        {aiLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
                                    <p className="text-slate-400 text-sm">Gerando análise com IA...</p>
                                    <p className="text-slate-500 text-xs mt-1">Isso pode levar alguns segundos.</p>
                                </div>
                            </div>
                        ) : aiAnalysis ? (
                            <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-5">
                                {aiUpdatedAt && (
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
                                        <span className="text-xs text-slate-500">Atualizado em {formatDateTime(aiUpdatedAt)}</span>
                                        <button
                                            onClick={generateAiAnalysis}
                                            className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Regenerar
                                        </button>
                                    </div>
                                )}
                                <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {aiAnalysis}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-8 text-center">
                                <Brain className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400 text-sm mb-3">Nenhuma análise de IA gerada para esta ativação.</p>
                                <button
                                    onClick={generateAiAnalysis}
                                    disabled={aiLoading}
                                    className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-2 rounded-lg hover:from-purple-500 hover:to-purple-400 transition text-sm font-medium inline-flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" /> Gerar Relatório com IA
                                </button>
                            </div>
                        )}
                    </SectionWrapper>

                    {/* ═══ FOOTER (print) ═══ */}
                    <footer className="hidden print:block pt-4 border-t border-slate-700/50 text-center">
                        <p className="text-[10px] text-slate-500">
                            Relatório gerado em {formatDateTime(new Date().toISOString())} — Elege.ai
                        </p>
                    </footer>
                </div>
            )}
        </div>
    );
};

// ─── Sub-Components ─────────────────────────────────────────────────
const SectionWrapper: React.FC<{
    title: string;
    icon: React.ReactNode;
    sectionKey: string;
    expanded: boolean;
    onToggle: (key: string) => void;
    children: React.ReactNode;
}> = ({ title, icon, sectionKey, expanded, onToggle, children }) => (
    <section className="report-section">
        <button
            onClick={() => onToggle(sectionKey)}
            className="no-print w-full flex items-center gap-2 mb-4 group"
        >
            {icon}
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <span className="ml-auto text-slate-500 group-hover:text-slate-300 transition">
                {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </span>
        </button>
        {/* Print always shows the title without toggle */}
        <div className="hidden print:flex items-center gap-2 mb-4">
            {icon}
            <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        <div className={`${expanded ? '' : 'hidden'} print:!block`}>
            {children}
        </div>
    </section>
);

const KPICard: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    sub?: string;
}> = ({ label, value, icon, color, sub }) => (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
            <span className={color}>{icon}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
);
