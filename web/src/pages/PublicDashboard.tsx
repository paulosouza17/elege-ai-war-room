import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    MessageSquare, TrendingUp, TrendingDown, AlertOctagon, Zap, Newspaper, Eye,
    BarChart3, RefreshCw, Loader2, Lock, ShieldAlert, ArrowUpRight, ArrowDownRight, Globe, Share2,
    SkipBack, SkipForward, Play, Pause
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
// @ts-ignore
import WordCloud from 'wordcloud';

const API_BASE = '';

// Social media source detection
const SOCIAL_KEYWORDS = ['twitter', 'x.com', 'facebook', 'instagram', 'tiktok', 'youtube', 'threads', 'bluesky', 'reddit', 'telegram', 'whatsapp', 'linkedin', 'mastodon', 'kwai', 'pinterest'];
function isSocialMedia(source: string): boolean {
    const s = (source || '').toLowerCase();
    return SOCIAL_KEYWORDS.some(kw => s.includes(kw));
}

interface DashboardData {
    activation: {
        title: string; category: string; priority: string; status: string;
        keywords: string[]; people_of_interest: string[];
    };
    stats: {
        total_mentions: number; mentions_24h: number; mentions_growth_pct: number;
        avg_risk_score: number; sentiment_positive: number; sentiment_negative: number;
        sentiment_neutral: number; sentiment_net: number; unique_sources: number;
        unique_entities: number; alerts_count: number;
    };
    word_cloud: { word: string; count: number }[];
    alerts: { id: string; title: string; summary: string; source: string; sentiment: string; risk_score: number; created_at: string; keywords: string[] }[];
    recent_feed: { id: string; title: string; summary: string; source: string; sentiment: string; risk_score: number; created_at: string }[];
    time_series: { date: string; label: string; positive: number; negative: number; neutral: number; total: number }[];
    is_crisis: boolean;
    crisis_reasons: string[];
    generated_at: string;
}

// ─── Public Word Cloud (canvas-based) ──────────────────────
const PublicWordCloud: React.FC<{ words: { word: string; count: number }[] }> = ({ words }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{ text: string; count: number; x: number; y: number } | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current || words.length === 0) return;
        const canvas = canvasRef.current;
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const maxVal = Math.max(...words.map(w => w.count));
        const minSize = 10;
        const maxSize = Math.min(rect.width / 8, 48);
        const list: [string, number][] = words.map(w => [w.word, minSize + (w.count / maxVal) * (maxSize - minSize)]);
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        try {
            WordCloud(canvas, {
                list, gridSize: Math.round(8 * (rect.width / 600)), weightFactor: 1,
                fontFamily: 'Inter, system-ui, sans-serif', color: () => '#94a3b8',
                rotateRatio: 0.3, rotationSteps: 2, backgroundColor: 'transparent',
                drawOutOfBound: false, shrinkToFit: true,
                hover: (item: any, _dim: any, event: MouseEvent) => {
                    if (item) {
                        const kw = words.find(w => w.word === item[0].toLowerCase());
                        setTooltip({ text: item[0], count: kw?.count || 0, x: event.offsetX, y: event.offsetY });
                        canvas.style.cursor = 'pointer';
                    } else { setTooltip(null); canvas.style.cursor = 'default'; }
                },
            });
        } catch (err) { console.error('WordCloud render error:', err); }
    }, [words]);

    return (
        <div ref={containerRef} className="flex-1 min-h-0 relative">
            <canvas ref={canvasRef} className="w-full h-full" />
            {tooltip && (
                <div className="absolute z-10 pointer-events-none px-3 py-1.5 bg-slate-800/95 border border-slate-600 rounded-lg shadow-xl" style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}>
                    <span className="text-white text-sm font-semibold">{tooltip.text}</span>
                    <span className="text-slate-400 text-xs ml-2">{tooltip.count}×</span>
                </div>
            )}
        </div>
    );
};

// ─── Feed Item ─────────────────────────────────────────────
const FeedItem: React.FC<{ item: DashboardData['recent_feed'][0]; showSource?: boolean }> = ({ item, showSource }) => {
    const sentStyles: Record<string, string> = {
        negative: 'border-l-4 border-l-red-500 bg-red-500/[0.03]',
        positive: 'border-l-4 border-l-emerald-500 bg-emerald-500/[0.03]',
        neutral: 'border-l-4 border-l-slate-700',
    };
    return (
        <div className={`px-3 py-2.5 ${sentStyles[item.sentiment] || sentStyles.neutral} transition-colors hover:bg-slate-800/20`}>
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-[11px] font-bold text-blue-400 flex-shrink-0 uppercase border border-blue-500/20">
                    {(item.source || '??').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                    {showSource && <p className="text-xs text-blue-400 font-semibold truncate mb-0.5">{item.source || 'Desconhecido'}</p>}
                    <p className="text-sm text-slate-200 line-clamp-2 leading-snug">{item.title || item.summary || 'Sem conteúdo'}</p>
                    <span className="text-[11px] text-slate-600">{timeAgo(item.created_at)}</span>
                </div>
                <div className={`px-2 py-1 rounded text-[11px] font-bold flex-shrink-0 ${item.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                    item.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-slate-800 text-slate-400'
                    }`}>
                    {item.sentiment === 'negative' ? '▼' : item.sentiment === 'positive' ? '▲' : '●'}
                </div>
            </div>
        </div>
    );
};

// ─── Password Gate ─────────────────────────────────────────
const PasswordGate: React.FC<{ title: string; onVerified: () => void; token: string }> = ({ title, onVerified, token }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await fetch(`${API_BASE}/api/public/dashboard/${token}/verify`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (data.success) onVerified(); else setError(data.message || 'Senha incorreta.');
        } catch { setError('Erro ao verificar.'); } finally { setLoading(false); }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-950">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4"><Lock className="w-7 h-7 text-red-400" /></div>
                    <h1 className="text-xl font-bold text-white">WAR ROOM</h1>
                    <p className="text-slate-400 text-sm mt-1">{title || 'Dashboard Protegido'}</p>
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha de acesso"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest outline-none focus:border-red-500 transition-colors placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-sm" autoFocus />
                    <button type="submit" disabled={loading || !password} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />} Acessar Dashboard
                    </button>
                </form>
            </div>
        </div>
    );
};

// ─── Time formatting ───────────────────────────────────────
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}
function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Main Component ────────────────────────────────────────
export const PublicDashboard: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsPassword, setNeedsPassword] = useState(false);
    const [dashTitle, setDashTitle] = useState('');
    const [verified, setVerified] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(60);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageProgress, setPageProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const portalScrollRef = useRef<HTMLDivElement>(null);
    const socialScrollRef = useRef<HTMLDivElement>(null);
    const TOTAL_PAGES = 3;
    const PAGE_INTERVAL = 15;

    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/public/dashboard/${token}/verify`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
                });
                const result = await res.json();
                if (result.success) setVerified(true);
                else if (result.requires_password) { setDashTitle(result.title || ''); setNeedsPassword(true); }
                else setError(result.message || 'Dashboard não encontrado.');
            } catch { setError('Erro ao conectar ao servidor.'); } finally { setLoading(false); }
        })();
    }, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/public/dashboard/${token}/data`);
            const result = await res.json();
            if (result.success) { setData(result.dashboard); setLastUpdate(new Date()); setCountdown(60); }
            else setError(result.message);
        } catch { console.error('[PublicDashboard] Fetch failed'); }
    }, [token]);

    useEffect(() => { if (!verified) return; fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, [verified, fetchData]);
    useEffect(() => { if (!verified || !data) return; const t = setInterval(() => setCountdown(p => p <= 1 ? 60 : p - 1), 1000); return () => clearInterval(t); }, [verified, data]);

    // Page auto-rotation 15s (respects isPaused)
    useEffect(() => {
        if (!verified || !data || isPaused) return;
        setPageProgress(0);
        const t = setInterval(() => {
            setPageProgress(prev => {
                if (prev >= 100) { setCurrentPage(p => (p + 1) % TOTAL_PAGES); return 0; }
                return prev + (100 / (PAGE_INTERVAL * 10));
            });
        }, 100);
        return () => clearInterval(t);
    }, [verified, data, currentPage, isPaused]);

    // Auto-scroll feed containers on Page 2
    useEffect(() => {
        if (!verified || !data || currentPage !== 1) return;
        const scrollSpeed = 0.5; // px per frame
        let raf: number;
        const animate = () => {
            [portalScrollRef, socialScrollRef].forEach(ref => {
                const el = ref.current;
                if (!el) return;
                el.scrollTop += scrollSpeed;
                // Loop back to top when reaching the end
                if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) {
                    el.scrollTop = 0;
                }
            });
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, [verified, data, currentPage]);

    const goPage = (dir: number) => {
        setCurrentPage(p => ((p + dir) % TOTAL_PAGES + TOTAL_PAGES) % TOTAL_PAGES);
        setPageProgress(0);
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 text-red-500 animate-spin" /></div>;
    if (error) return <div className="h-screen w-full flex items-center justify-center bg-slate-950"><div className="text-center"><ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" /><h2 className="text-xl font-bold text-white mb-2">Acesso Negado</h2><p className="text-slate-400">{error}</p></div></div>;
    if (needsPassword && !verified) return <PasswordGate title={dashTitle} token={token!} onVerified={() => { setNeedsPassword(false); setVerified(true); }} />;
    if (!data) return <div className="h-screen w-full flex items-center justify-center bg-slate-950"><RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto" /></div>;

    const s = data.stats;
    const riskColor = s.avg_risk_score >= 70 ? 'text-red-400' : s.avg_risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400';
    const riskBg = s.avg_risk_score >= 70 ? 'from-red-500/20' : s.avg_risk_score >= 40 ? 'from-amber-500/20' : 'from-emerald-500/20';
    const sentTotal = s.sentiment_positive + s.sentiment_negative + s.sentiment_neutral || 1;

    // Split feed into portals vs social
    const portalFeed = data.recent_feed.filter(f => !isSocialMedia(f.source));
    const socialFeed = data.recent_feed.filter(f => isSocialMedia(f.source));

    const pageTransition = (page: number) => {
        if (currentPage === page) return 'opacity-100 translate-x-0';
        if (currentPage < page) return 'opacity-0 translate-x-full pointer-events-none';
        return 'opacity-0 -translate-x-full pointer-events-none';
    };

    return (
        <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
            {/* Header */}
            <header className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl flex-shrink-0 z-50">
                <div className="flex items-center justify-between max-w-[1920px] mx-auto">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold truncate">{data.activation.title}</h1>
                            <p className="text-[10px] text-slate-500 truncate">WAR ROOM • Centro de Comando</p>
                        </div>
                    </div>

                    {/* Crisis Indicators — centered in header */}
                    {data.is_crisis && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-red-950/50 border border-red-500/30 rounded-lg animate-pulse max-w-xl">
                            <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <div className="min-w-0">
                                <span className="text-red-300 font-bold text-[11px] mr-2">⚠️ Crise</span>
                                <span className="text-red-400/70 text-[10px]">{data.crisis_reasons.slice(0, 2).join(' • ')}{data.crisis_reasons.length > 2 ? ` +${data.crisis_reasons.length - 2}` : ''}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
                        {data.is_crisis && (
                            <span className="flex sm:hidden items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold border border-red-500/30 animate-pulse">
                                <AlertOctagon className="w-3.5 h-3.5" /> CRISE
                            </span>
                        )}
                        {/* Playback controls */}
                        <div className="flex items-center gap-1">
                            <button onClick={() => goPage(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-300" title="Anterior">
                                <SkipBack className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setIsPaused(p => !p)} className={`p-1.5 rounded-lg transition-colors ${isPaused ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'hover:bg-slate-800 text-slate-500 hover:text-slate-300'}`} title={isPaused ? 'Reproduzir' : 'Pausar'}>
                                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => goPage(1)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-300" title="Próxima">
                                <SkipForward className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {[0, 1, 2].map(i => (
                                <button key={i} onClick={() => { setCurrentPage(i); setPageProgress(0); }}
                                    className={`h-2 rounded-full transition-all ${currentPage === i ? 'bg-red-500 w-6' : 'bg-slate-700 w-2 hover:bg-slate-500'}`} />
                            ))}
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono tabular-nums">{countdown}s</span>
                        <div className={`w-2 h-2 rounded-full ${countdown > 5 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    </div>
                </div>
                <div className="h-0.5 bg-slate-800/50 mt-2 -mx-4 sm:-mx-6 lg:-mx-8">
                    <div className="h-full bg-red-500/60 transition-all duration-100" style={{ width: `${pageProgress}%` }} />
                </div>
            </header>

            <main className="flex-1 overflow-hidden relative">

                {/* ═══ PAGE 1 — KPIs + Word Cloud + Alerts ═══ */}
                <div className={`absolute inset-0 px-4 sm:px-6 lg:px-8 py-4 overflow-hidden transition-all duration-700 ${pageTransition(0)}`}>
                    <div className="max-w-[1920px] mx-auto h-full flex flex-col gap-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                            {/* Total */}
                            <div className="bg-gradient-to-br from-blue-500/10 to-slate-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Menções</p><h3 className="text-2xl sm:text-3xl lg:text-4xl font-mono font-bold mt-1">{s.total_mentions.toLocaleString()}</h3></div>
                                    <div className="p-2 bg-blue-500/10 rounded-lg"><MessageSquare className="w-4 h-4 text-blue-400" /></div>
                                </div>
                                <div className="mt-2 text-xs">
                                    {s.mentions_growth_pct > 0 ? <span className={`flex items-center font-medium ${s.mentions_growth_pct > 50 ? 'text-red-400' : 'text-blue-400'}`}><ArrowUpRight className="w-3 h-3 mr-1" />+{s.mentions_growth_pct}% <span className="text-slate-600 ml-1">vs 24h</span></span>
                                        : s.mentions_growth_pct < 0 ? <span className="flex items-center font-medium text-slate-500"><ArrowDownRight className="w-3 h-3 mr-1" />{s.mentions_growth_pct}%</span>
                                            : <span className="text-slate-600">Estável</span>}
                                </div>
                            </div>
                            {/* Risk */}
                            <div className={`bg-gradient-to-br ${riskBg} to-slate-900 border border-slate-800 rounded-xl p-4`}>
                                <div className="flex items-start justify-between">
                                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Risk Score</p><h3 className={`text-2xl sm:text-3xl lg:text-4xl font-mono font-bold mt-1 ${riskColor}`}>{s.avg_risk_score}</h3></div>
                                    <div className={`p-2 rounded-lg ${s.avg_risk_score >= 70 ? 'bg-red-500/10' : s.avg_risk_score >= 40 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}><Zap className={`w-4 h-4 ${riskColor}`} /></div>
                                </div>
                                <div className="mt-2 text-xs text-slate-500">{s.avg_risk_score >= 70 ? '🔴 Crítico' : s.avg_risk_score >= 40 ? '🟡 Atenção' : '🟢 Normal'}</div>
                            </div>
                            {/* Sentimento */}
                            <div className={`bg-gradient-to-br ${s.sentiment_net < 0 ? 'from-red-500/10' : 'from-emerald-500/10'} to-slate-900 border border-slate-800 rounded-xl p-4`}>
                                <div className="flex items-start justify-between">
                                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Sentimento Net</p>
                                        <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-mono font-bold mt-1 ${s.sentiment_net < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{s.sentiment_net > 0 ? '+' : ''}{s.sentiment_net}</h3>
                                    </div>
                                    <div className={`p-2 rounded-lg ${s.sentiment_net < 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>{s.sentiment_net < 0 ? <TrendingDown className="w-4 h-4 text-red-400" /> : <TrendingUp className="w-4 h-4 text-emerald-400" />}</div>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
                                        <div className="bg-emerald-500" style={{ width: `${(s.sentiment_positive / sentTotal) * 100}%` }} />
                                        <div className="bg-slate-500" style={{ width: `${(s.sentiment_neutral / sentTotal) * 100}%` }} />
                                        <div className="bg-red-500" style={{ width: `${(s.sentiment_negative / sentTotal) * 100}%` }} />
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="text-emerald-500">▲{s.sentiment_positive}</span><span>●{s.sentiment_neutral}</span><span className="text-red-500">▼{s.sentiment_negative}</span></div>
                                </div>
                            </div>
                            {/* Volume */}
                            <div className="bg-gradient-to-br from-teal-500/10 to-slate-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Volume 24h</p><h3 className="text-2xl sm:text-3xl lg:text-4xl font-mono font-bold mt-1">{s.mentions_24h.toLocaleString()}</h3></div>
                                    <div className="p-2 bg-teal-500/10 rounded-lg"><BarChart3 className="w-4 h-4 text-teal-400" /></div>
                                </div>
                                <div className="mt-2 text-xs text-slate-500">Últimas 24 horas</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 shrink-0">
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Newspaper className="w-4 h-4 text-blue-400" /></div><div><p className="text-[10px] text-slate-500 uppercase">Fontes</p><p className="text-lg font-mono font-bold">{s.unique_sources}</p></div></div>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3"><div className="p-2 bg-purple-500/10 rounded-lg"><Eye className="w-4 h-4 text-purple-400" /></div><div><p className="text-[10px] text-slate-500 uppercase">Entidades</p><p className="text-lg font-mono font-bold">{s.unique_entities}</p></div></div>
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3"><div className="p-2 bg-red-500/10 rounded-lg"><AlertOctagon className="w-4 h-4 text-red-400" /></div><div><p className="text-[10px] text-slate-500 uppercase">Alertas</p><p className="text-lg font-mono font-bold">{s.alerts_count}</p></div></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
                            <div className="lg:col-span-2 bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex flex-col min-h-0">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                                    Nuvem de Assuntos<span className="ml-auto text-[10px] font-normal text-slate-600 normal-case tracking-normal">{data.word_cloud.length} termos</span>
                                </h3>
                                {data.word_cloud.length === 0 ? <div className="flex-1 min-h-0 flex items-center justify-center"><p className="text-slate-500 text-sm">Sem dados</p></div> : <PublicWordCloud words={data.word_cloud} />}
                                <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-slate-800 shrink-0">
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-green-500"></span> Positivo</span>
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Neutro</span>
                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-red-500"></span> Negativo</span>
                                </div>
                            </div>

                            <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-0">
                                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><AlertOctagon className="w-3.5 h-3.5 text-red-400" /> Alertas Recentes</h3>
                                    {data.alerts.length > 0 && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] font-bold">{data.alerts.length}</span>}
                                </div>
                                <div className="flex-1 divide-y divide-slate-800/60 overflow-y-auto">
                                    {data.alerts.length === 0 ? <div className="p-6 text-center text-slate-600 text-sm">🛡️ Nenhum alerta</div>
                                        : data.alerts.map(a => (
                                            <div key={a.id} className="px-4 py-2.5 hover:bg-slate-800/30">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1.5"><div className={`w-2 h-2 rounded-full ${a.risk_score >= 70 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${a.risk_score >= 70 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{a.risk_score}</span>
                                                            <span className="text-[10px] text-slate-600 font-mono">{timeAgo(a.created_at)}</span>
                                                            {a.source && <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-[100px]">{a.source}</span>}
                                                        </div>
                                                        <p className="text-sm text-slate-200 line-clamp-1 font-medium">{a.title || 'Sem título'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ PAGE 2 — Feed Split: Portais vs Redes Sociais ═══ */}
                <div className={`absolute inset-0 px-4 sm:px-6 lg:px-8 py-4 overflow-auto transition-all duration-700 ${pageTransition(1)}`}>
                    <div className="max-w-[1920px] mx-auto space-y-4">
                        {/* Stats bar */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg"><MessageSquare className="w-4 h-4 text-blue-400" /></div>
                                <div><p className="text-[10px] text-slate-500 uppercase">Total</p><p className="text-xl font-mono font-bold">{s.total_mentions.toLocaleString()}</p></div>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
                                <div><p className="text-[10px] text-emerald-400/60 uppercase">Positivas</p><p className="text-xl font-mono font-bold text-emerald-400">{s.sentiment_positive}</p></div>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
                                <div className="p-2 bg-slate-500/10 rounded-lg"><BarChart3 className="w-4 h-4 text-slate-400" /></div>
                                <div><p className="text-[10px] text-slate-500 uppercase">Neutras</p><p className="text-xl font-mono font-bold text-slate-300">{s.sentiment_neutral}</p></div>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg"><TrendingDown className="w-4 h-4 text-red-400" /></div>
                                <div><p className="text-[10px] text-red-400/60 uppercase">Negativas</p><p className="text-xl font-mono font-bold text-red-400">{s.sentiment_negative}</p></div>
                            </div>
                        </div>

                        {/* Sentiment bar */}
                        <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
                            <div className="bg-emerald-500 relative" style={{ width: `${(s.sentiment_positive / sentTotal) * 100}%` }}>{(s.sentiment_positive / sentTotal) > 0.1 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80">{Math.round((s.sentiment_positive / sentTotal) * 100)}%</span>}</div>
                            <div className="bg-slate-500 relative" style={{ width: `${(s.sentiment_neutral / sentTotal) * 100}%` }}>{(s.sentiment_neutral / sentTotal) > 0.1 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80">{Math.round((s.sentiment_neutral / sentTotal) * 100)}%</span>}</div>
                            <div className="bg-red-500 relative" style={{ width: `${(s.sentiment_negative / sentTotal) * 100}%` }}>{(s.sentiment_negative / sentTotal) > 0.1 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80">{Math.round((s.sentiment_negative / sentTotal) * 100)}%</span>}</div>
                        </div>

                        {/* Two-column feed */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* PORTAIS */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                                <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-400" />
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Portais de Notícia</h3>
                                    <span className="ml-auto px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">{portalFeed.length}</span>
                                </div>
                                <div ref={portalScrollRef} className="flex-1 divide-y divide-slate-800/60 overflow-y-auto max-h-[calc(100vh-380px)] scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {portalFeed.length === 0 ? <div className="p-6 text-center text-slate-600 text-sm">Nenhuma menção de portais</div>
                                        : portalFeed.map(f => <FeedItem key={f.id} item={f} showSource />)}
                                </div>
                            </div>

                            {/* REDES SOCIAIS */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                                <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                                    <Share2 className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Redes Sociais</h3>
                                    <span className="ml-auto px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[10px] font-bold">{socialFeed.length}</span>
                                </div>
                                <div ref={socialScrollRef} className="flex-1 divide-y divide-slate-800/60 overflow-y-auto max-h-[calc(100vh-380px)] scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {socialFeed.length === 0 ? <div className="p-6 text-center text-slate-600 text-sm">Nenhuma menção de redes sociais</div>
                                        : socialFeed.map(f => <FeedItem key={f.id} item={f} showSource />)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ PAGE 3 — Temporal Chart ═══ */}
                <div className={`absolute inset-0 px-4 sm:px-6 lg:px-8 py-4 overflow-auto transition-all duration-700 ${pageTransition(2)}`}>
                    <div className="max-w-[1920px] mx-auto space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-400" /> Evolução de Menções — Últimos 7 Dias
                            </h2>
                        </div>

                        {/* Main chart */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 sm:p-6">
                            <div className="h-[calc(100vh-380px)] min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.time_series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradNeu" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}
                                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                        <Area type="monotone" dataKey="positive" name="Positivas" stroke="#22c55e" strokeWidth={2} fill="url(#gradPos)" dot={{ r: 4, fill: '#22c55e' }} />
                                        <Area type="monotone" dataKey="negative" name="Negativas" stroke="#ef4444" strokeWidth={2} fill="url(#gradNeg)" dot={{ r: 4, fill: '#ef4444' }} />
                                        <Area type="monotone" dataKey="neutral" name="Neutras" stroke="#94a3b8" strokeWidth={1.5} fill="url(#gradNeu)" dot={{ r: 3, fill: '#94a3b8' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Summary cards below chart */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                                <p className="text-[10px] text-emerald-400/60 uppercase mb-1">Total Positivas (7d)</p>
                                <p className="text-2xl font-mono font-bold text-emerald-400">{data.time_series.reduce((a, d) => a + d.positive, 0)}</p>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-center">
                                <p className="text-[10px] text-slate-500 uppercase mb-1">Total Neutras (7d)</p>
                                <p className="text-2xl font-mono font-bold text-slate-300">{data.time_series.reduce((a, d) => a + d.neutral, 0)}</p>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
                                <p className="text-[10px] text-red-400/60 uppercase mb-1">Total Negativas (7d)</p>
                                <p className="text-2xl font-mono font-bold text-red-400">{data.time_series.reduce((a, d) => a + d.negative, 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="px-4 py-2 border-t border-slate-800/40 flex-shrink-0">
                <p className="text-center text-[10px] text-slate-700 font-mono">
                    Atualizado: {lastUpdate ? formatTime(lastUpdate.toISOString()) : '—'} • Refresh: {countdown}s • Pág {currentPage + 1}/{TOTAL_PAGES} • WAR ROOM Intelligence
                </p>
            </footer>
        </div>
    );
};
