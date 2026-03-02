import React, { useState, useEffect } from 'react';
import { T, Badge, IconShield, IconActivity, IconTarget, IconAlertTriangle, IconMonitor, IconMessageCircle, IconTrendingUp, IconSearch, IconRadio, IconUsers, IconBarChart, IconZap, IconClock, IconBrain, IconPlay, IconScissors, IconDownload, IconCheck, IconEye, IconLock } from './icons';
import { useCountUp, useRotatingIndex } from './hooks';

/* ════════════════ ANIMATED SHARED ════════════════ */
const SimFrame: React.FC<{ children: React.ReactNode; glow?: string }> = ({ children, glow }) => (
    <div style={{ background: T.bg, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, boxShadow: glow ? `0 0 40px -8px ${glow}30, 0 25px 60px -12px rgba(0,0,0,0.5)` : '0 25px 60px -12px rgba(0,0,0,0.5)', animation: 'mockup-float 5s ease-in-out infinite' }}>{children}</div>
);
const Card: React.FC<{ accent?: string; children: React.ReactNode; glow?: boolean; style?: React.CSSProperties; delay?: number }> = ({ accent = T.primary, children, glow, style, delay }) => (
    <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, borderLeft: `4px solid ${accent}`, padding: '16px 20px', ...(glow ? { boxShadow: `inset 0 0 20px ${accent}08` } : {}), ...(delay !== undefined ? { animation: `slide-up 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s both` } : {}), ...style }}>{children}</div>
);
const SplitWrap: React.FC<{ title: string; subtitle?: string; accent?: string; icon?: React.ReactNode; points?: Array<{ icon: React.ReactNode; label: string; desc: string }>; children: React.ReactNode }> = ({ title, subtitle, accent = T.primary, icon, points, children }) => (
    <div style={{ maxWidth: 1100, width: '100%', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 48, alignItems: 'start' }}>
        <div style={{ paddingTop: 16, animation: 'slide-right 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
            {icon && <div style={{ color: accent, marginBottom: 14, opacity: 0.7 }}>{icon}</div>}
            <h2 style={{ fontSize: 44, fontWeight: 800, margin: 0, color: T.white, letterSpacing: -1, lineHeight: 1.15 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 17, color: T.muted, marginTop: 12, lineHeight: 1.7 }}>{subtitle}</p>}
            {points && <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>{points.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: `slide-up 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.15}s both` }}>
                    <div style={{ color: accent, flexShrink: 0, marginTop: 2 }}>{p.icon}</div>
                    <div><div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{p.label}</div><div style={{ fontSize: 12, color: T.dim, lineHeight: 1.6 }}>{p.desc}</div></div>
                </div>))}</div>}
        </div>
        <div style={{ animation: 'slide-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>{children}</div>
    </div>
);

/* Animated KPI */
const AKpi: React.FC<{ label: string; value: number; suffix?: string; prefix?: string; accent: string; icon: React.ReactNode; extra?: string; delay?: number }> = ({ label, value, suffix = '', prefix = '', accent, icon, extra, delay = 0 }) => {
    const v = useCountUp(value, 1800, 400 + delay * 200);
    return (
        <Card accent={accent} delay={0.2 + delay * 0.1}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.white, marginTop: 2 }}>{prefix}{v}{suffix}</div>
                    {extra && <div style={{ fontSize: 9, color: accent, marginTop: 4 }}>{extra}</div>}
                </div>
                <div style={{ color: accent, opacity: 0.4 }}>{icon}</div>
            </div>
        </Card>
    );
};

/* ════════════════ Mini Chart (bar chart for dashboard) ════════════════ */
const MiniChart: React.FC<{ data: number[]; colors: string[]; labels: string[] }> = ({ data, colors, labels }) => {
    const max = Math.max(...data);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {data.map((v, i) => {
                const h = useCountUp(Math.round((v / max) * 100), 1200, 600 + i * 100);
                return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontFamily: T.mono, fontSize: 9, color: colors[i], fontWeight: 700 }}>{useCountUp(v, 1200, 600 + i * 100)}</div>
                        <div style={{ width: '100%', height: `${h}%`, background: `${colors[i]}30`, borderTop: `2px solid ${colors[i]}`, borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                        <div style={{ fontSize: 7, color: T.dim, textTransform: 'uppercase' }}>{labels[i]}</div>
                    </div>
                );
            })}
        </div>
    );
};

/* ════════════════ Mini Line Chart — animated stroke draw ════════════════ */
const MiniLineChart: React.FC<{ data: number[][]; colors: string[]; labels: string[]; xLabels: string[]; animated?: boolean }> = ({ data, colors, labels, xLabels, animated }) => {
    const allVals = data.flat();
    const max = Math.max(...allVals);
    const min = Math.min(...allVals);
    const range = max - min || 1;
    const w = 320; const h = 90;
    const pT = 4, pB = 18, pL = 8, pR = 4;
    const plotW = w - pL - pR;
    const plotH = h - pT - pB;
    return (
        <div style={{ width: '100%' }}>
            <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
                {/* Area shading */}
                {data.map((series, si) => {
                    const pts = series.map((v, i) => {
                        const x = pL + (i / (series.length - 1)) * plotW;
                        const y = pT + plotH - ((v - min) / range) * plotH;
                        return [x, y];
                    });
                    const pathD = `M${pts[0][0]},${pts[0][1]}` + pts.slice(1).map(([x, y]) => `L${x},${y}`).join('') + `L${pts[pts.length - 1][0]},${h - pB}L${pts[0][0]},${h - pB}Z`;
                    return <path key={`a${si}`} d={pathD} fill={colors[si]} fillOpacity={0.08} />;
                })}
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map(f => (
                    <line key={f} x1={pL} y1={pT + plotH * (1 - f)} x2={w - pR} y2={pT + plotH * (1 - f)}
                        stroke={T.border} strokeWidth="0.4" strokeDasharray="2,4" />
                ))}
                {/* Lines with animated draw */}
                {data.map((series, si) => {
                    const pts = series.map((v, i) => {
                        const x = pL + (i / (series.length - 1)) * plotW;
                        const y = pT + plotH - ((v - min) / range) * plotH;
                        return `${x},${y}`;
                    }).join(' ');
                    return (
                        <g key={si}>
                            <polyline points={pts} fill="none" stroke={colors[si]} strokeWidth="1.5"
                                strokeLinejoin="round" strokeLinecap="round"
                                style={animated ? { strokeDasharray: 600, strokeDashoffset: 0, animation: `line-draw-anim 1.4s ease-out ${si * 0.25}s both` } : undefined} />
                            {/* Dot at last point */}
                            {(() => { const [lx, ly] = series.map((v, i) => [pL + (i / (series.length - 1)) * plotW, pT + plotH - ((v - min) / range) * plotH])[series.length - 1]; return <circle cx={lx} cy={ly} r={2.5} fill={colors[si]} style={animated ? { animation: `fade-in 0.3s ease ${si * 0.25 + 1.2}s both` } : undefined} />; })()}
                        </g>
                    );
                })}
                {/* X labels */}
                {xLabels.map((l, i) => (
                    <text key={i} x={pL + (i / (xLabels.length - 1)) * plotW} y={h - 2} fill={T.dim} fontSize="7" textAnchor="middle">{l}</text>
                ))}
            </svg>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
                {labels.map((l, i) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: T.dim }}>
                        <span style={{ width: 10, height: 2, background: colors[i], borderRadius: 1 }} />{l}
                    </span>
                ))}
            </div>
        </div>
    );
};

/* ════════════════ DASHBOARD — Screen 1: KPIs / Screen 2: Charts ════════════════ */
export const AnimDashboard = () => {
    // screen 0 = KPIs, screen 1 = Charts. Alternates after full animation.
    const [screen, setScreen] = useState<0 | 1>(0);
    const chartIdx = useRotatingIndex(3, 5000);
    // Screen 0 stays 6s (time for all KPIs to animate: stagger 200ms*4 + 1.8s countup + margin)
    // Screen 1 stays 8s
    useEffect(() => {
        const duration = screen === 0 ? 6000 : 8000;
        const t = setTimeout(() => setScreen(s => s === 0 ? 1 : 0), duration);
        return () => clearTimeout(t);
    }, [screen]);
    return (
        <SplitWrap title="Centro de Comando" subtitle="Visão unificada de todas as frentes. KPIs animados em tempo real, alertas de crise e gráficos de sentimento." accent={T.primary} icon={<IconBarChart size={32} />}
            points={[
                { icon: <IconActivity size={16} />, label: 'KPIs em Tempo Real', desc: 'Menções, risk score, sentimento atualizados por segundo' },
                { icon: <IconAlertTriangle size={16} />, label: 'Alerta de Crise Automático', desc: 'Banner ativado quando indicadores convergem para risco elevado' },
                { icon: <IconTarget size={16} />, label: 'Filtro por Ativação', desc: 'Cada campanha com dashboard independente' },
            ]}>
            <SimFrame>
                {/* Header — always visible */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div><div style={{ fontSize: 15, fontWeight: 700, color: T.white }}>Centro de Comando</div><div style={{ fontSize: 9, color: T.dim }}>Monitoramento em tempo real</div></div>
                    <Badge label="MODO CRISE" color={T.danger} filled />
                </div>
                <div style={{ background: `${T.danger}10`, border: `1px solid ${T.danger}25`, borderRadius: 8, padding: '6px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconAlertTriangle size={12} color={T.danger} className="anim-pulse" /><span style={{ fontSize: 10, fontWeight: 600, color: '#fca5a5' }}>Indicadores de Crise Detectados</span><span style={{ fontSize: 9, color: T.dim }}>6 alertas ativos</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {['Visão Geral', 'Flavio Bolsonaro', 'Lula'].map((t, i) => (
                        <span key={t} style={{ fontSize: 9, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: i === 0 ? `${T.primary}15` : T.surface, color: i === 0 ? T.primary : T.dim, border: `1px solid ${i === 0 ? `${T.primary}30` : T.border}` }}>{t}</span>
                    ))}
                    {/* Screen indicator */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                        {[0, 1].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i === screen ? T.primary : T.border, transition: 'background 0.4s' }} />)}
                    </div>
                </div>
                {/* Two screens stacked — minHeight accommodates KPIs (2 rows of 2) */}
                <div style={{ position: 'relative', minHeight: 200 }}>
                    {/* SCREEN 1: KPIs */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        opacity: screen === 0 ? 1 : 0,
                        transform: screen === 0 ? 'translateY(0)' : 'translateY(-20px)',
                        transition: 'all 0.7s cubic-bezier(0.4,0,0.2,1)',
                        pointerEvents: screen === 0 ? 'auto' : 'none',
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                            <AKpi label="Total Menções" value={916} accent={T.primary} icon={<IconBarChart size={16} />} extra="+35% (24h)" delay={0} />
                            <AKpi label="Risk Score" value={30} accent={T.success} icon={<IconShield size={16} />} extra="Baixo · 24h" delay={1} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            <AKpi label="Sentimento +" value={267} accent={T.success} icon={<IconTrendingUp size={16} />} extra="▲ Positivo (24h)" delay={2} />
                            <AKpi label="Ativações" value={1} accent="#f59e0b" icon={<IconZap size={16} />} extra="Monitoramentos" delay={3} />
                        </div>
                    </div>
                    {/* SCREEN 2: Charts */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        opacity: screen === 1 ? 1 : 0,
                        transform: screen === 1 ? 'translateY(0)' : 'translateY(20px)',
                        transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s',
                        pointerEvents: screen === 1 ? 'auto' : 'none',
                    }}>
                        <div style={{ position: 'relative', minHeight: 140 }}>
                            <div style={{ position: 'absolute', inset: 0, opacity: chartIdx === 0 ? 1 : 0, transition: 'opacity 0.8s' }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Sentimento por Tipo</div>
                                <MiniChart data={[267, 597, 45]} colors={[T.success, T.primary, T.danger]} labels={['Positivo', 'Neutro', 'Negativo']} />
                            </div>
                            <div style={{ position: 'absolute', inset: 0, opacity: chartIdx === 1 ? 1 : 0, transition: 'opacity 0.8s' }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Volume por Fonte</div>
                                <MiniChart data={[420, 312, 97, 54, 33]} colors={[T.pink, T.cyan, T.accent, T.teal, T.success]} labels={['Twitter', 'Portais', 'TV', 'Rádio', 'WA']} />
                            </div>
                            <div style={{ position: 'absolute', inset: 0, opacity: chartIdx === 2 ? 1 : 0, transition: 'opacity 0.8s' }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Menções — 7 Dias</div>
                                <MiniLineChart
                                    data={[[42, 58, 73, 45, 91, 112, 134], [18, 25, 31, 20, 42, 38, 45], [5, 8, 12, 7, 15, 22, 18]]}
                                    colors={[T.success, T.primary, T.danger]}
                                    labels={['Positivo', 'Neutro', 'Negativo']}
                                    xLabels={['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']}
                                    animated={chartIdx === 2 && screen === 1}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </SimFrame>
        </SplitWrap>
    );
};

/* ════════════════ TV / RADIO — Toggle every 10s, TV with system video + mention hint ════════════════ */
export const AnimFeedTV = () => {
    const mode = useRotatingIndex(2, 10000); // 0=TV, 1=Radio
    const isTV = mode === 0;
    // Load real tracked TV media from Elege.AI system
    const [tvVideoSrc, setTvVideoSrc] = useState<string>('');
    useEffect(() => {
        fetch('/api/elege/feed?limit=20&source_type=tv')
            .then(r => r.json())
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
                // Find a TV item with video assets referencing Flávio/Bolsonaro
                for (const item of items) {
                    const assets = typeof item.assets === 'string' ? JSON.parse(item.assets) : item.assets;
                    if (assets && Array.isArray(assets)) {
                        const videoAsset = assets.find((a: any) => a.type === 'video' || a.content_type?.startsWith('video'));
                        if (videoAsset) {
                            setTvVideoSrc(`/api/elege/assets/${item.id}/${videoAsset.id}`);
                            return;
                        }
                    }
                }
                // Fallback: use any TV item video
                for (const item of items) {
                    const assets = typeof item.assets === 'string' ? JSON.parse(item.assets) : item.assets;
                    if (assets && Array.isArray(assets) && assets.length > 0) {
                        setTvVideoSrc(`/api/elege/assets/${item.id}/${assets[0].id}`);
                        return;
                    }
                }
            })
            .catch(() => { /* no-op, video area will show poster */ });
    }, []);
    return (
        <SplitWrap title={isTV ? "Monitoramento de TV" : "Monitoramento de Rádio"} subtitle={isTV ? "Player com timeline de citações, recorte de trechos e transcrição automática." : "Captura de áudio com waveform, detecção de citações e exportação de trechos."}
            accent={isTV ? T.accent : T.teal} icon={isTV ? <IconMonitor size={32} /> : <IconRadio size={32} />}
            points={[
                { icon: <IconPlay size={16} />, label: isTV ? 'Player com Timeline' : 'Waveform com Timeline', desc: isTV ? 'Pontos verde/vermelho indicam sentimento de cada citação' : 'Visualização de áudio com marcadores de citação' },
                { icon: <IconScissors size={16} />, label: 'Recorte de Trechos', desc: isTV ? 'Corte e baixe o vídeo para compartilhamento' : 'Corte o trecho de áudio e exporte' },
                { icon: <IconSearch size={16} />, label: 'Transcrição Automática', desc: 'Busca por texto dentro de programas' },
            ]}>
            <SimFrame glow={isTV ? T.accent : T.teal}>
                {/* Media area — taller for proper video proportion */}
                <div style={{ position: 'relative', borderRadius: 10, height: 240, overflow: 'hidden', marginBottom: 10 }}>
                    {/* TV Mode — system video */}
                    <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: isTV ? 1 : 0, transition: 'opacity 1s ease', zIndex: isTV ? 1 : 0, overflow: 'hidden' }}>
                        {tvVideoSrc ? (
                            <video src={tvVideoSrc} autoPlay muted loop playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <IconMonitor size={36} color={T.accent} className="anim-pulse-soft" />
                                    <div style={{ fontSize: 10, color: T.dim, marginTop: 8 }}>Carregando mídia...</div>
                                </div>
                            </div>
                        )}
                        {/* Channel overlay — top left */}
                        <div style={{ position: 'absolute', top: 8, left: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '4px 10px', backdropFilter: 'blur(4px)' }}>
                            <IconMonitor size={11} color={T.accent} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: T.white }}>Band Brasília</span>
                            <span style={{ fontSize: 8, color: T.dim }}>AO VIVO</span>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'glow-danger 1.5s infinite' }} />
                        </div>
                        {/* Title overlay — bottom */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92), transparent)', padding: '28px 10px 8px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.white, marginBottom: 3 }}>Flávio Bolsonaro defende pacote de medidas no Senado Federal</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <IconPlay size={10} color={T.white} />
                                <span style={{ fontFamily: T.mono, fontSize: 9, color: T.dim }}>02:34 / 15:00</span>
                                <div style={{ flex: 1, height: 2, background: T.surfaceLight, borderRadius: 1 }}><div style={{ height: '100%', width: '17%', background: T.primary, borderRadius: 1 }} /></div>
                            </div>
                        </div>
                        {/* Floating mention hint — bottom right */}
                        <div style={{
                            position: 'absolute', bottom: 40, right: 10,
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
                            animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 1s both',
                        }}>
                            {/* Mention dot */}
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.success, border: '3px solid rgba(255,255,255,0.9)', boxShadow: `0 0 12px ${T.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#000' }}>1</div>
                            {/* Hint card */}
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${T.success}30`,
                                borderRadius: 8, padding: '8px 10px', maxWidth: 180, backdropFilter: 'blur(8px)',
                                boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${T.success}20`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.success }} />
                                    <span style={{ fontSize: 8, fontWeight: 700, color: T.success, textTransform: 'uppercase', letterSpacing: 0.5 }}>Flávio Bolsonaro</span>
                                    <Badge label="POSITIVO" color={T.success} />
                                </div>
                                <div style={{ fontSize: 9, color: '#cbd5e1', lineHeight: 1.4 }}>
                                    "...Flávio Bolsonaro defende a proposta de redução de impostos e reforma do sistema tributário..."
                                </div>
                                <div style={{ fontSize: 8, color: T.dim, marginTop: 4 }}>02:34 · Band Brasília</div>
                            </div>
                        </div>
                    </div>
                    {/* Radio Mode — Waveform */}
                    <div style={{ position: 'absolute', inset: 0, background: '#0c1222', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: isTV ? 0 : 1, transition: 'opacity 1s ease', zIndex: isTV ? 0 : 1 }}>
                        <IconRadio size={28} color={T.teal} className="anim-pulse-soft" />
                        <div style={{ fontSize: 10, color: T.dim, marginTop: 8 }}>CBN Brasília · 28/02/2026</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.white, marginTop: 4 }}>Jornal da CBN — Eleições 2026</div>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginTop: 14, height: 36 }}>
                            {[1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 5, 2, 4, 1, 3, 5, 2, 4, 3, 1].map((n, i) => (
                                <div key={i} style={{ width: 3, borderRadius: 2, background: T.teal, animation: `wave-${(n % 5) + 1} ${0.8 + (i % 3) * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.05}s`, height: '50%' }} />
                            ))}
                        </div>
                    </div>
                </div>
                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {[{ l: 'TV', c: T.accent, a: isTV }, { l: 'Rádio', c: T.teal, a: !isTV }].map(m => (
                        <span key={m.l} style={{ fontSize: 9, fontWeight: 700, padding: '4px 12px', borderRadius: 5, background: m.a ? `${m.c}20` : T.surface, color: m.a ? m.c : T.dim, border: `1px solid ${m.a ? `${m.c}40` : T.border}`, transition: 'all 0.5s ease' }}>{m.l}</span>
                    ))}
                    <span style={{ fontSize: 8, color: T.dim, marginLeft: 'auto', fontStyle: 'italic' }}>alterna a cada 10s</span>
                </div>
                {/* Citation timeline — centered dots */}
                <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Timeline de Citações</span>
                        <div style={{ display: 'flex', gap: 8 }}>{[{ l: 'Positivo', c: T.success }, { l: 'Negativo', c: T.danger }, { l: 'Neutro', c: T.dim }].map(x => (<span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: T.dim }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: x.c, flexShrink: 0 }} />{x.l}</span>))}</div>
                    </div>
                    <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: T.surfaceLight, borderRadius: 3 }} />
                        {[{ p: 12, c: T.danger, t: '02:14' }, { p: 30, c: T.success, t: '04:30' }, { p: 52, c: T.success, t: '07:48' }, { p: 70, c: T.danger, t: '10:30' }, { p: 86, c: T.dim, t: '12:54' }].map((d, i) => (
                            <div key={i} style={{ position: 'absolute', left: `${d.p}%`, top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <div style={{ width: 13, height: 13, borderRadius: '50%', background: d.c, border: `2px solid ${T.bg}`, boxShadow: `0 0 8px ${d.c}70`, animation: `scale-in 0.4s cubic-bezier(0.16,1,0.3,1) ${0.8 + i * 0.15}s both` }} />
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <IconScissors size={13} color={T.dim} />
                    <div style={{ background: T.surface, borderRadius: 4, padding: '3px 8px', fontFamily: T.mono, fontSize: 9, color: T.muted, border: `1px solid ${T.border}` }}>00:00</div>
                    <span style={{ color: T.dim, fontSize: 9 }}>→</span>
                    <div style={{ background: T.surface, borderRadius: 4, padding: '3px 8px', fontFamily: T.mono, fontSize: 9, color: T.muted, border: `1px solid ${T.border}` }}>05:00</div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: `${T.primary}15`, border: `1px solid ${T.primary}30`, borderRadius: 5, padding: '4px 10px', fontSize: 9, color: T.primary, fontWeight: 600 }}><IconDownload size={11} color={T.primary} /> Baixar {isTV ? 'Vídeo' : 'Áudio'}</div>
                </div>
            </SimFrame>
        </SplitWrap>
    );
};


/* ════════════════ MENTION DETAIL — Staggered entry ════════════════ */
export const AnimMentionDetail = () => {
    const risk = useCountUp(75, 1800, 1200);
    const riskW = useCountUp(75, 1200, 1400);
    return (
        <SplitWrap title="Análise Inteligente por Menção" subtitle="Cada menção é processada pela IA que identifica alvos, classifica sentimento e calcula risco com justificativa detalhada."
            accent={T.cyan} icon={<IconBrain size={32} />}
            points={[
                { icon: <IconTarget size={16} />, label: 'Alvos Detectados', desc: 'Identifica quais entidades monitoradas são citadas' },
                { icon: <IconUsers size={16} />, label: 'Análise por Citado', desc: 'Sentimento individualizado por pessoa' },
                { icon: <IconShield size={16} />, label: 'Risco Contextual', desc: 'Score 0-100 com justificativa da IA' },
            ]}>
            <SimFrame glow={T.cyan}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 4 }}>Detalhes da Menção</div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: T.dim, marginBottom: 16 }}>6549734b-9dd9-41dd-810c-900e2f41005d</div>
                <Card accent={T.success} style={{ marginBottom: 12 }} delay={0.3}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><IconBrain size={14} color={T.cyan} /><span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Alvos Detectados</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${T.success}`, background: T.surfaceLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.white }}>FB</div>
                        <div><div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Flavio Bolsonaro</div><span style={{ fontSize: 10, fontWeight: 700, color: T.success }}>POSITIVO</span></div>
                    </div>
                </Card>
                <Card accent={T.primary} style={{ marginBottom: 12 }} delay={0.6}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><IconUsers size={14} color={T.primary} /><span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Análise por Citado (1)</span></div>
                    <div style={{ background: T.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Flavio Bolsonaro</span><Badge label="ELOGIOSO" color={T.dim} /><Badge label="Positivo" color={T.success} filled /></div>
                        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>O nome de Flavio Bolsonaro é repetido insistentemente com a declaração "PRESIDENTE!".</div>
                    </div>
                </Card>
                <Card accent={T.danger} glow delay={0.9}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconBrain size={14} color={T.cyan} /><span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Análise de Risco</span></div>
                        <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 800, color: T.danger }}>{risk}/100</span>
                    </div>
                    <div style={{ height: 4, background: T.surfaceLight, borderRadius: 2, marginBottom: 10 }}><div style={{ height: '100%', width: `${riskW}%`, background: T.danger, borderRadius: 2, transition: 'width 0.3s ease' }} /></div>
                    <div style={{ borderLeft: `2px solid ${T.dim}`, paddingLeft: 12, fontSize: 12, color: T.muted, fontStyle: 'italic', lineHeight: 1.7 }}>"O conteúdo é diretamente sobre a candidatura de Flavio Bolsonaro, fortalecendo sua imagem como potencial presidente."</div>
                </Card>
            </SimFrame>
        </SplitWrap>
    );
};

/* ════════════════ SOCIAL — Compact modal cards with rotating Twitter mentions ════════════════ */
const CARD_MAX = 340;
const TWEET_TEXTS = [
    { user: 'Grok', handle: '@grok', initial: 'G', text: 'Flávio Bolsonaro não foi absolvido em julgamento de mérito. O caso das rachadinhas foi denunciado pelo MP-RJ em 2020, mas o STJ anulou decisões em 2021 por erro de foro.', stats: { rp: 641, res: 61, cur: '3.0K', views: '281.0K' }, followers: '8180.4K', hash: '#FlavioBolsonaro', time: '20:27 · 1 mar. 2026' },
    { user: 'Senado Federal', handle: '@seabordo', initial: 'S', text: 'O senador Flávio Bolsonaro defendeu hoje a proposta de reforma tributária no plenário, afirmando que "o Brasil precisa de simplificação e menos burocracia."', stats: { rp: 312, res: 89, cur: '1.8K', views: '145.0K' }, followers: '3200.5K', hash: '#ReformaTributária', time: '14:15 · 1 mar. 2026' },
    { user: 'Política Real', handle: '@politicareal', initial: 'P', text: '"Vamos trabalhar para que o Brasil tenha um governo que respeite o cidadão" — Flávio Bolsonaro na manifestação Acorda Brasil, Av. Paulista.', stats: { rp: 1205, res: 234, cur: '5.2K', views: '420.0K' }, followers: '1540.2K', hash: '#AcordaBrasil', time: '18:40 · 1 mar. 2026' },
];

/* ── Twitter/X Card (compact, accepts tweetIdx for rotation) ── */
const TwitterCard: React.FC<{ tweetIdx?: number }> = ({ tweetIdx = 0 }) => {
    const t = TWEET_TEXTS[tweetIdx % TWEET_TEXTS.length];
    return (
        <div style={{
            background: '#000', borderRadius: 12, overflow: 'hidden',
            border: `1px solid ${T.border}`, maxWidth: CARD_MAX, width: '100%',
            animation: 'crossfade-in 0.6s ease-out both',
        }}>
            <div style={{ padding: '10px 12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #334155' }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: T.white }}>{t.initial}</span>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>{t.user}</span>
                                <svg width="13" height="13" viewBox="0 0 22 22" fill="#1d9bf0"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.607-.274 1.264-.144 1.897.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.636.132 1.295.084 1.9-.138.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" /></svg>
                            </div>
                            <div style={{ fontSize: 10, color: T.dim }}>{t.handle}</div>
                        </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#e7e9ea"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </div>
                <p style={{ fontSize: 11, color: T.white, lineHeight: 1.5, margin: '0 0 6px' }}>{t.text}</p>
                <div style={{ color: '#1d9bf0', fontSize: 11, marginBottom: 4 }}>{t.hash}</div>
                <div style={{ fontSize: 9, color: T.dim, marginBottom: 8 }}>{t.time} · X for Web</div>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, padding: '6px 12px', display: 'flex', gap: 16, fontSize: 10 }}>
                <span><strong style={{ color: T.white }}>{t.stats.rp}</strong> <span style={{ color: T.dim }}>Reposts</span></span>
                <span><strong style={{ color: T.white }}>{t.stats.res}</strong> <span style={{ color: T.dim }}>Respostas</span></span>
                <span><strong style={{ color: T.white }}>{t.stats.cur}</strong> <span style={{ color: T.dim }}>Curtidas</span></span>
                <span><strong style={{ color: T.white }}>{t.stats.views}</strong> <span style={{ color: T.dim }}>Views</span></span>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, padding: '6px 12px', fontSize: 10 }}>
                <strong style={{ color: T.white }}>{t.followers}</strong> <span style={{ color: T.dim }}>Seguidores</span>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, padding: '8px 12px', display: 'flex', justifyContent: 'space-around' }}>
                {['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
                    'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
                    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
                    'M18 20V10M12 20V4M6 20v-6',
                ].map((d, i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5"><path d={d} /></svg>
                ))}
            </div>
            <div style={{ height: 3, background: '#ef4444' }} />
        </div>
    );
};

/* ── Instagram Card (compact, with real system-like image) ── */
const InstagramCard: React.FC = () => (
    <div style={{
        background: '#0f172a', borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${T.border}`, maxWidth: CARD_MAX, width: '100%',
        animation: 'crossfade-in 0.6s ease-out both',
    }}>
        <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: T.white }}>SB</div>
                </div>
                <div><div style={{ fontSize: 12, fontWeight: 700, color: T.white }}>SBT News</div><div style={{ fontSize: 9, color: T.dim }}>Instagram</div></div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.2" fill="#e879f9" stroke="none" /></svg>
        </div>
        <div style={{ width: '100%', aspectRatio: '4/3', background: 'linear-gradient(135deg, #1e293b, #0f172a)', position: 'relative', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
            {/* Real image from system media feed */}
            <img src="https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=300&fit=crop&q=80" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
            <div style={{ position: 'relative', width: '100%', background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6), transparent)', padding: '30px 12px 12px' }}>
                <div style={{ width: 40, height: 2, background: T.white, borderRadius: 1, margin: '0 auto 8px' }} />
                <div style={{ fontSize: 11, fontWeight: 800, color: T.white, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.3 }}>
                    FLÁVIO DIZ QUE FALTA<br />MAIORIA PARA IMPEACHMENT<br />DE MINISTROS E ACUSA STF DE...
                </div>
            </div>
        </div>
        <div style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.8"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>
        </div>
        <div style={{ padding: '0 10px', fontSize: 11, fontWeight: 700, color: T.white }}>538 curtidas</div>
        <div style={{ padding: '4px 10px 0', fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
            <strong style={{ color: T.white }}>SBT News</strong>{' '}Flávio Bolsonaro (PL-RJ) afirmou que há apoio ao impeachment de ministros do STF...
        </div>
        <div style={{ padding: '3px 10px 0', fontSize: 11, color: '#a78bfa', fontStyle: 'italic' }}>#Politica</div>
        <div style={{ padding: '4px 10px 0' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.surface, border: `2px solid ${T.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: T.white }}>FN</div>
        </div>
        <div style={{ padding: '4px 10px 0', fontSize: 10, color: T.dim }}>Ver todos os 696 comentários</div>
        <div style={{ padding: '2px 10px 10px', fontSize: 8, color: T.dim, textTransform: 'uppercase' }}>HÁ 41 MINUTOS</div>
    </div>
);

/* ── TikTok Card (compact) ── */
const TikTokCard: React.FC = () => (
    <div style={{
        background: '#000', borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${T.border}`, maxWidth: CARD_MAX, width: '100%',
        animation: 'crossfade-in 0.6s ease-out both',
    }}>
        <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${T.cyan}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.white }}>PB</span>
                </div>
                <div><div style={{ fontSize: 12, fontWeight: 700, color: T.white }}>Política BR</div><div style={{ fontSize: 9, color: T.dim }}>TikTok</div></div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#22d3ee"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
        </div>
        <div style={{ width: '100%', aspectRatio: '9/10', background: 'linear-gradient(135deg, #0f172a, #1e293b)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(34,211,238,0.05), transparent)' }} />
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                <IconPlay size={20} color={T.white} />
            </div>
            <div style={{ position: 'absolute', right: 8, bottom: 14, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                {[{ n: '8.2K', d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }, { n: '1.4K', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }].map((a, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#e2e8f0"><path d={a.d} /></svg>
                        <div style={{ fontSize: 8, color: T.white, marginTop: 1, fontWeight: 600 }}>{a.n}</div>
                    </div>
                ))}
            </div>
        </div>
        <div style={{ padding: '8px 10px', fontSize: 11, color: T.white, lineHeight: 1.4 }}>Análise: movimentações pré-eleitorais no Senado Federal. O que esperar de 2026?</div>
        <div style={{ padding: '0 10px 3px', display: 'flex', gap: 6, fontSize: 10 }}>
            <span style={{ color: T.cyan }}>#PoliticaBR</span>
            <span style={{ color: T.cyan }}>#Eleições2026</span>
        </div>
        <div style={{ padding: '2px 10px 6px', display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span style={{ color: T.dim }}>156K views</span>
            <span style={{ color: T.dim }}>há 6 horas</span>
        </div>
        <div style={{ height: 2, background: '#22d3ee' }} />
    </div>
);

/* AnimFeedSocial: 3 cards side-by-side, Instagram centered (highlighted), active card cycles every 3s */
export const AnimFeedSocial = () => {
    // Active highlight cycles: 0=Twitter, 1=Instagram, 2=TikTok
    const activeCard = useRotatingIndex(3, 3000);
    const tabLabels = ['Twitter / X', 'Instagram', 'TikTok'];
    const tabColors = ['#e7e9ea', '#e879f9', '#22d3ee'];
    // Single tweet shown — cycles within the highlight
    const tweetIdx = activeCard === 0 ? 0 : 1; // rotate tweet within twitter slot
    return (
        <SplitWrap title="Inteligência em Redes Sociais" subtitle="Captura e análise de posts em Twitter/X, Instagram e TikTok com métricas de engajamento e detecção de entidades em tempo real."
            accent={T.pink} icon={<IconSearch size={32} />}
            points={[
                { icon: <IconActivity size={16} />, label: 'Métricas de Engajamento', desc: 'Reposts, curtidas, views em tempo real' },
                { icon: <IconEye size={16} />, label: 'Captura Completa', desc: 'Modal com contexto original e threads' },
                { icon: <IconTarget size={16} />, label: 'Detecção de Narrativas', desc: 'Identificação de ataques coordenados' },
            ]}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'mockup-float 5s ease-in-out infinite' }}>
                {/* Tab indicator */}
                <div style={{ display: 'flex', gap: 4, background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`, padding: 3, alignSelf: 'center' }}>
                    {tabLabels.map((t, i) => {
                        const isActive = i === activeCard;
                        return <span key={t} style={{ fontSize: 9, fontWeight: 600, padding: '3px 10px', borderRadius: 5, color: isActive ? tabColors[i] : T.dim, background: isActive ? T.surface : 'transparent', border: isActive ? `1px solid ${tabColors[i]}30` : '1px solid transparent', transition: 'all 0.4s ease' }}>{t}</span>;
                    })}
                </div>
                {/* All 3 cards simultaneously side-by-side — FIXED dimensions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'center' }}>
                    {/* Twitter — left */}
                    <div style={{
                        width: 200, flexShrink: 0,
                        transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                        opacity: activeCard === 0 ? 1 : 0.5,
                        transform: activeCard === 0 ? 'scale(1.03)' : 'scale(0.97)',
                        zIndex: activeCard === 0 ? 3 : 1,
                        filter: activeCard === 0 ? 'drop-shadow(0 0 12px rgba(231,233,234,0.25))' : 'none',
                    }}>
                        <TwitterCard tweetIdx={tweetIdx} />
                    </div>
                    {/* Instagram — center (prominent) */}
                    <div style={{
                        width: 210, flexShrink: 0,
                        transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                        opacity: activeCard === 1 ? 1 : 0.6,
                        transform: activeCard === 1 ? 'scale(1.03) translateY(-4px)' : 'scale(0.97)',
                        zIndex: activeCard === 1 ? 3 : 2,
                        filter: activeCard === 1 ? `drop-shadow(0 0 14px #e879f940)` : 'none',
                    }}>
                        <InstagramCard />
                    </div>
                    {/* TikTok — right */}
                    <div style={{
                        width: 200, flexShrink: 0,
                        transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                        opacity: activeCard === 2 ? 1 : 0.5,
                        transform: activeCard === 2 ? 'scale(1.03)' : 'scale(0.97)',
                        zIndex: activeCard === 2 ? 3 : 1,
                        filter: activeCard === 2 ? 'drop-shadow(0 0 12px rgba(34,211,238,0.25))' : 'none',
                    }}>
                        <TikTokCard />
                    </div>
                </div>
            </div>
        </SplitWrap>
    );
};

/* ════════════════ CRISIS — 3 Steps — expanded vertical layout ════════════════ */
export const AnimCrisis = () => {
    const stepIdx = useRotatingIndex(3, 7000);
    const mentionCount = useCountUp(21, 1500, 400);
    return (
        <SplitWrap title="Gestão de Crises com IA" subtitle="De menção avulsa a dossiê estratégico — a IA detecta, analisa e monta o plano de resposta automaticamente."
            accent={T.danger} icon={<IconAlertTriangle size={32} />}
            points={[
                { icon: <IconZap size={16} />, label: '1. Origem da Crise', desc: 'Agrupamento automático de menções que convergem para um tema crítico' },
                { icon: <IconBrain size={16} />, label: '2. Insight da IA', desc: 'Análise de risco multidimensional: político, viral e reputacional' },
                { icon: <IconShield size={16} />, label: '3. Plano de Resposta', desc: 'Estratégia recomendada + criação de dossiê com evidências' },
            ]}>
            <SimFrame glow={T.danger}>
                {/* Crisis header */}
                <Card accent={T.accent} style={{ marginBottom: 14 }} delay={0.2}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <Badge label="MÉDIA SEVERIDADE" color={T.accent} filled />
                        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.dim }}>ID: 05ec8146</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.dim }}><IconClock size={10} /> 2/26/2026, 6:58 PM</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.white, lineHeight: 1.4 }}>Crise: Flávio Bolsonaro condiciona apoio no DF a decisões eleitorais de Lula</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 10, color: T.dim }}>
                        <span><IconUsers size={12} /> <strong style={{ color: T.white }}>Admin</strong></span>
                        <span><IconCheck size={12} color={T.success} /> <strong style={{ color: T.success }}>ATIVO</strong></span>
                        <span><IconMessageCircle size={12} /> <strong style={{ color: T.primary }}>{mentionCount}</strong> menções vinculadas</span>
                    </div>
                </Card>
                {/* 3 Step Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {[
                        { l: '1. Origem', icon: <IconZap size={12} /> },
                        { l: '2. Insight IA', icon: <IconBrain size={12} /> },
                        { l: '3. Plano', icon: <IconShield size={12} /> },
                    ].map((s, i) => (
                        <div key={i} onClick={() => { }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, fontWeight: 700, padding: '8px 0', borderRadius: 6, background: i === stepIdx ? `${T.danger}20` : T.surface, color: i === stepIdx ? T.white : T.dim, border: `1px solid ${i === stepIdx ? `${T.danger}40` : T.border}`, transition: 'all 0.5s ease' }}>
                            {s.icon}{s.l}
                        </div>
                    ))}
                </div>
                {/* Step Content — rotating, extended height */}
                <div style={{ position: 'relative', minHeight: 170 }}>
                    {/* Step 1: Origem */}
                    <div style={{ position: 'absolute', inset: 0, opacity: stepIdx === 0 ? 1 : 0, transition: 'all 0.6s ease', transform: stepIdx === 0 ? 'translateX(0)' : 'translateX(20px)', pointerEvents: stepIdx === 0 ? 'auto' : 'none' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.danger, marginBottom: 10 }}>Agrupamento Automático de Menções</div>
                        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, marginBottom: 12 }}>O sistema detectou <strong style={{ color: T.white }}>convergência de 21 menções</strong> sobre o mesmo tema em <strong style={{ color: T.white }}>4 fontes diferentes</strong> (Twitter, Portais, TV, Instagram) nas últimas 6 horas.</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[{ s: 'Twitter', n: 12, c: T.pink }, { s: 'Portais', n: 5, c: T.cyan }, { s: 'TV', n: 3, c: T.accent }, { s: 'Instagram', n: 1, c: T.purple }].map(x => (
                                <div key={x.s} style={{ background: `${x.c}10`, border: `1px solid ${x.c}20`, borderRadius: 6, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: x.c }}>{x.n}</span>
                                    <span style={{ fontSize: 9, color: T.dim }}>{x.s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Step 2: Insight IA */}
                    <div style={{ position: 'absolute', inset: 0, opacity: stepIdx === 1 ? 1 : 0, transition: 'all 0.6s ease', transform: stepIdx === 1 ? 'translateX(0)' : 'translateX(20px)', pointerEvents: stepIdx === 1 ? 'auto' : 'none' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.danger, marginBottom: 10 }}>Riscos Identificados pela IA</div>
                        {[{ type: 'Político', level: 'ALTO', color: T.danger, desc: 'Barganha política pode provocar retaliação do Planalto' },
                        { type: 'Viral', level: 'MÉDIO', color: T.accent, desc: 'Alto potencial de viralização com memes e narrativas polarizadoras' },
                        { type: 'Reputacional', level: 'MÉDIO', color: T.accent, desc: 'Imagem de inflexibilidade dificulta futuras alianças' },
                        ].map((r, i) => (
                            <div key={r.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}`, animation: `slide-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.15}s both` }}>
                                <div><div style={{ fontSize: 12, fontWeight: 600, color: T.white }}>{r.type}</div><div style={{ fontSize: 10, color: T.dim }}>{r.desc}</div></div>
                                <span style={{ fontSize: 12, fontWeight: 800, color: r.color, flexShrink: 0, marginLeft: 16 }}>{r.level}</span>
                            </div>
                        ))}
                    </div>
                    {/* Step 3: Plano de Resposta */}
                    <div style={{ position: 'absolute', inset: 0, opacity: stepIdx === 2 ? 1 : 0, transition: 'all 0.6s ease', transform: stepIdx === 2 ? 'translateX(0)' : 'translateX(20px)', pointerEvents: stepIdx === 2 ? 'auto' : 'none' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.cyan, marginBottom: 10 }}>Estratégia Recomendada + Dossiê</div>
                        <div style={{ background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`, padding: 12, marginBottom: 10 }}>
                            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.7, fontStyle: 'italic' }}>"Recomenda-se nota oficial reforçando independência e visão de Estado, sem entrar em polêmica direta com Planalto..."</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1, background: T.surface, borderRadius: 8, padding: '8px 12px', border: `1px solid ${T.border}` }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: 'uppercase', marginBottom: 4 }}>Dossiê</div>
                                <div style={{ fontSize: 10, color: T.muted }}>21 menções + fontes + timeline + análise IA compilados</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 600, color: T.muted }}>
                                <IconBrain size={14} color={T.cyan} className="anim-pulse-soft" /> Refinar com IA
                            </div>
                        </div>
                    </div>
                </div>
            </SimFrame>
        </SplitWrap>
    );
};

/* ════════════════ RADAR DE AMEAÇAS — Rotating between feed view and threat profile ════════════════ */
export const AnimThreat = () => {
    const view = useRotatingIndex(2, 6000); // 0=feed view, 1=user profile
    return (
        <SplitWrap title="Radar de Ameaças" subtitle="Identifica usuários com padrões de comportamento hostil, coordenação de ataques e amplificação artificial." accent={T.danger} icon={<IconAlertTriangle size={32} />}
            points={[
                { icon: <IconShield size={16} />, label: 'Detecção Proativa', desc: 'IA mapeia contas que atacam coordenadamente' },
                { icon: <IconTarget size={16} />, label: 'Perfil do Ameaçador', desc: 'Score de risco, historico de posts e rede de amplificação' },
                { icon: <IconLock size={16} />, label: 'Dossiê Jurídico', desc: 'Evidencias compiladas para medidas legais' },
            ]}>
            <div style={{ position: 'relative', animation: 'mockup-float 5s ease-in-out infinite' }}>
                {/* Tab indicator */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`, padding: 3, width: 'fit-content' }}>
                    {[{ l: 'Feed de Ameaças', active: view === 0 }, { l: 'Perfil do Usuário', active: view === 1 }].map((t, i) => (
                        <span key={t.l} style={{ fontSize: 9, fontWeight: 600, padding: '4px 10px', borderRadius: 5, color: t.active ? T.danger : T.dim, background: t.active ? T.surface : 'transparent', border: t.active ? `1px solid ${T.danger}30` : '1px solid transparent', transition: 'all 0.4s ease' }}>{t.l}</span>
                    ))}
                </div>
                {/* View 0: Threat Feed */}
                <div key={view} style={{ animation: 'crossfade-in 0.6s ease-out both' }}>
                    {view === 0 && (
                        <SimFrame glow={T.danger}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: T.white, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <IconAlertTriangle size={14} color={T.danger} />
                                    Ameaças Detectadas
                                </div>
                                <Badge label="3 ATIVOS" color={T.danger} filled />
                            </div>
                            {/* Threat list */}
                            {[
                                { handle: '@carloslopes91', score: 87, type: 'Coordenado', posts: 43, color: T.danger, status: 'ATIVO' },
                                { handle: '@noticias_reais', score: 71, type: 'Desinformação', posts: 28, color: T.accent, status: 'MONITORADO' },
                                { handle: '@bot_politico_br', score: 64, type: 'Bot Suspeito', posts: 156, color: T.accent, status: 'MONITORADO' },
                            ].map((t, i) => (
                                <div key={t.handle} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none', animation: `slide-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s both` }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${t.color}15`, border: `2px solid ${t.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: t.color, flexShrink: 0 }}>
                                        {t.handle.slice(1, 3).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: T.white }}>{t.handle}</div>
                                        <div style={{ fontSize: 9, color: T.dim }}>{t.type} · {t.posts} posts</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                        <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 800, color: t.color }}>{t.score}</span>
                                        <span style={{ fontSize: 7, fontWeight: 700, color: t.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.status}</span>
                                    </div>
                                </div>
                            ))}
                        </SimFrame>
                    )}
                    {/* View 1: Threat User Profile */}
                    {view === 1 && (
                        <SimFrame glow="#ef4444">
                            {/* Profile header */}
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
                                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #7f1d1d, #450a0a)', border: `3px solid ${T.danger}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fca5a5', flexShrink: 0 }}>CL</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: T.white }}>Carlos Lopes</div>
                                            <div style={{ fontSize: 11, color: T.dim }}>@carloslopes91</div>
                                        </div>
                                        <Badge label="RISCO ALTO" color={T.danger} filled />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 9 }}>
                                        <span style={{ color: T.dim }}>Desde 2019</span>
                                        <span style={{ color: T.dim }}>1.4K seguidores</span>
                                        <span style={{ color: T.accent }}>43 posts hostis</span>
                                    </div>
                                </div>
                            </div>
                            {/* Risk metrics */}
                            {[
                                { label: 'Score de Risco', value: 87, max: 100, color: T.danger },
                                { label: 'Velocity (posts/h)', value: 12, max: 50, color: T.accent },
                                { label: 'Amplificação de Rede', value: 67, max: 100, color: T.accent },
                            ].map((m, i) => (
                                <div key={m.label} style={{ marginBottom: 10, animation: `slide-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s both` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 9, color: T.dim }}>{m.label}</span>
                                        <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: m.color }}>{m.value}/{m.max}</span>
                                    </div>
                                    <div style={{ height: 4, background: T.surfaceLight, borderRadius: 2 }}>
                                        <div style={{ height: '100%', width: `${(m.value / m.max) * 100}%`, background: `linear-gradient(to right, ${m.color}80, ${m.color})`, borderRadius: 2, transition: 'width 1s ease' }} />
                                    </div>
                                </div>
                            ))}
                            {/* Recent hostile post */}
                            <div style={{ background: `${T.danger}08`, border: `1px solid ${T.danger}20`, borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: T.danger, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Post hostil mais recente</div>
                                <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 }}>"Esse corrupto nunca vai ser presidente de nada! É só mais um laranja..." — 2h atrás</div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, background: `${T.danger}15`, color: T.danger, border: `1px solid ${T.danger}25` }}>Calunioso</span>
                                    <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}25` }}>Injurioso</span>
                                </div>
                            </div>
                        </SimFrame>
                    )}
                </div>
            </div>
        </SplitWrap>
    );
};
