import React from 'react';
import {
    T, Badge,
    IconShield, IconActivity, IconEye, IconTarget, IconAlertTriangle,
    IconMonitor, IconMessageCircle, IconTrendingUp, IconSearch, IconRadio,
    IconGlobe, IconUsers, IconBarChart, IconZap, IconClock, IconBrain,
    IconPlay, IconScissors, IconDownload, IconCheck, IconLock,
} from './icons';

/* ════════════════ Shared Layout Helpers ════════════════ */

const SlideLayout: React.FC<{
    title: string; subtitle?: string; accent?: string;
    icon?: React.ReactNode; children: React.ReactNode; wide?: boolean;
}> = ({ title, subtitle, accent = T.primary, icon, children, wide }) => (
    <div style={{ maxWidth: wide ? 1100 : 960, width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            {icon && <div style={{ color: accent, opacity: 0.8 }}>{icon}</div>}
            <h2 style={{ fontSize: 48, fontWeight: 800, margin: 0, color: T.white, letterSpacing: -1, lineHeight: 1.1 }}>{title}</h2>
        </div>
        {subtitle && <p style={{ fontSize: 16, color: T.dim, margin: '6px 0 0 0', lineHeight: 1.5, maxWidth: 600 }}>{subtitle}</p>}
        <div style={{ marginTop: 32 }}>{children}</div>
    </div>
);

const SplitSlide: React.FC<{
    title: string; subtitle?: string; accent?: string; icon?: React.ReactNode;
    points?: Array<{ icon: React.ReactNode; label: string; desc: string }>;
    children: React.ReactNode;
}> = ({ title, subtitle, accent = T.primary, icon, points, children }) => (
    <div style={{ maxWidth: 1100, width: '100%', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 48, alignItems: 'start' }}>
        <div style={{ paddingTop: 16, animation: 'slide-right 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
            {icon && <div style={{ color: accent, marginBottom: 14, opacity: 0.7 }}>{icon}</div>}
            <h2 style={{ fontSize: 44, fontWeight: 800, margin: 0, color: T.white, letterSpacing: -1, lineHeight: 1.15 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 17, color: T.muted, marginTop: 12, lineHeight: 1.7 }}>{subtitle}</p>}
            {points && (
                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {points.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: `slide-up 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.15}s both` }}>
                            <div style={{ color: accent, flexShrink: 0, marginTop: 2 }}>{p.icon}</div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{p.label}</div>
                                <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.6 }}>{p.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div style={{ animation: 'slide-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>{children}</div>
    </div>
);

const SimFrame: React.FC<{ children: React.ReactNode; glow?: string; noFloat?: boolean }> = ({ children, glow, noFloat }) => (
    <div style={{
        background: T.bg, borderRadius: 16, border: `1px solid ${T.border}`,
        padding: 20, boxShadow: glow ? `0 0 40px -8px ${glow}30, 0 25px 60px -12px rgba(0,0,0,0.5)` : '0 25px 60px -12px rgba(0,0,0,0.5)',
        animation: noFloat ? undefined : 'mockup-float 5s ease-in-out infinite',
    }}>{children}</div>
);

const Card: React.FC<{ accent?: string; children: React.ReactNode; glow?: boolean; style?: React.CSSProperties; delay?: number }> = ({ accent = T.primary, children, glow, style, delay }) => (
    <div style={{
        background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`,
        borderLeft: `4px solid ${accent}`, padding: '16px 20px',
        ...(glow ? { boxShadow: `inset 0 0 20px ${accent}08` } : {}),
        ...(delay !== undefined ? { animation: `slide-up 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s both` } : {}),
        ...style,
    }}>{children}</div>
);

const KpiCard: React.FC<{ label: string; value: string; accent: string; icon: React.ReactNode; extra?: string }> = ({ label, value, accent, icon, extra }) => (
    <Card accent={accent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 1.2 }}>{label}</div>
                <div style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.white, marginTop: 2 }}>{value}</div>
                {extra && <div style={{ fontSize: 9, color: accent, marginTop: 4 }}>{extra}</div>}
            </div>
            <div style={{ color: accent, opacity: 0.4 }}>{icon}</div>
        </div>
    </Card>
);

/* ════════════════ Impact Transition Slide ════════════════ */
export const ImpactSlide: React.FC<{
    line1: string; line2?: string; accent?: string; note?: string;
}> = ({ line1, line2, accent = T.accent, note }) => (
    <div style={{ textAlign: 'center', maxWidth: 800 }}>
        <div style={{ fontSize: 42, fontWeight: 300, color: T.muted, lineHeight: 1.6, letterSpacing: -0.5 }}>
            {line1}
        </div>
        {line2 && (
            <div style={{ fontSize: 44, fontWeight: 800, color: accent, lineHeight: 1.4, marginTop: 8, letterSpacing: -0.5 }}>
                {line2}
            </div>
        )}
        {note && (
            <div style={{ fontSize: 13, color: T.dim, marginTop: 40, fontStyle: 'italic' }}>{note}</div>
        )}
    </div>
);

/* ════════════════ PRINT PLACEHOLDER ════════════════
   Componente que marca onde um print real do sistema
   deve ser inserido futuramente via props.
   ══════════════════════════════════════════════════ */
export const ScreenPlaceholder: React.FC<{ label: string; screen: string }> = ({ label, screen }) => (
    <div style={{
        background: `repeating-linear-gradient(45deg, ${T.surface}, ${T.surface} 10px, ${T.bg} 10px, ${T.bg} 20px)`,
        borderRadius: 12, border: `2px dashed ${T.primary}40`, padding: '24px 20px',
        textAlign: 'center', minHeight: 120, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.7,
    }}>
        <IconMonitor size={24} color={T.primary} />
        <div style={{ fontSize: 12, fontWeight: 700, color: T.primary }}>{label}</div>
        <div style={{ fontSize: 10, color: T.dim }}>Substituir por: print de {screen}</div>
    </div>
);

/* ════════════════ SLIDE 1: Cover ════════════════ */
export const SlideCover = () => (
    <div style={{ textAlign: 'center', maxWidth: 700 }}>
        <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 32 }}>
            PLATAFORMA DE INTELIGÊNCIA POLÍTICA
        </div>
        <img
            src="/logo-elegeai-branca.png"
            alt="Elege.AI"
            style={{ height: 220, objectFit: 'contain', margin: '0 auto', display: 'block' }}
        />
        <p style={{ fontSize: 20, color: T.muted, marginTop: 32, lineHeight: 1.7 }}>
            Monitoramento em tempo real. Análise com IA.<br />
            <span style={{ color: T.white, fontWeight: 600 }}>Resposta estratégica automatizada.</span>
        </p>
        <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: T.dim }}>
            <span style={{ fontFamily: T.mono, color: T.muted, background: T.surface, padding: '3px 10px', borderRadius: 4, fontSize: 11 }}>→</span>
            para navegar
        </div>
    </div>
);

/* ════════════════ SLIDE 2: Evolution (Split: Timeline + Monitoramento) ════════════════ */
export const SlideEvolution: React.FC<{ isActive?: boolean }> = () => (
    <div style={{ maxWidth: 1100, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        {/* LEFT: Vertical Timeline */}
        <div style={{ animation: 'slide-right 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>TRAJETÓRIA</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: T.white, lineHeight: 1.15, letterSpacing: -1, margin: '0 0 28px' }}>3 anos de evolução contínua</h2>
            <div style={{ position: 'relative', paddingLeft: 28 }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg, ${T.primary}, ${T.purple}, ${T.accent})` }} />
                {[
                    { year: '2023', title: 'Gabinete Parlamentar', desc: 'Monitoramento básico de TV e rádio', color: T.primary, icon: <IconMonitor size={16} /> },
                    { year: '2024', title: 'Expansão Multicanal', desc: 'Portais, redes sociais, IA de sentimento', color: T.purple, icon: <IconBrain size={16} /> },
                    { year: '2025', title: 'War Room', desc: 'Arsenal completo: ameaças, crises, automação, planos de resposta com IA', color: T.accent, icon: <IconShield size={16} /> },
                ].map((item, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: i < 2 ? 28 : 0, animation: `slide-up 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.2}s both` }}>
                        {/* Dot */}
                        <div style={{ position: 'absolute', left: -24, top: 4, width: 14, height: 14, borderRadius: '50%', background: item.color, border: `3px solid ${T.bg}`, zIndex: 2 }} />
                        <div style={{ fontSize: 22, fontWeight: 800, color: item.color, fontFamily: T.mono }}>{item.year}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginTop: 2 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* RIGHT: What we monitor */}
        <div style={{ animation: 'slide-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>
            <div style={{ fontSize: 10, color: T.primary, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>O QUE MONITORAMOS</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: T.white, lineHeight: 1.15, letterSpacing: -1, margin: '0 0 32px' }}>Cobertura total de mídia</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                    { icon: <IconMonitor size={22} />, label: 'TVs', desc: 'Emissoras nacionais e regionais com transcrição automática', color: T.accent },
                    { icon: <IconRadio size={22} />, label: 'Rádios', desc: 'Estações monitoradas com detecção de citações por nome', color: T.teal },
                    { icon: <IconGlobe size={22} />, label: 'Portais de Notícias', desc: 'Portais regionais e nacionais com captura de screenshots', color: T.cyan },
                    { icon: <IconSearch size={22} />, label: 'Redes Sociais', desc: 'Twitter/X, Instagram, TikTok, Facebook — engajamento e sentimento', color: T.pink },
                ].map((item, i) => (
                    <div key={i} style={{
                        display: 'flex', gap: 14, alignItems: 'center',
                        background: `${item.color}08`, border: `1px solid ${item.color}20`, borderRadius: 12,
                        padding: '14px 18px', animation: `slide-up 0.6s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.15}s both`,
                    }}>
                        <div style={{ color: item.color, flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: `${item.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: T.white }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{item.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
            {/* 24h badge */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 28px',
                    background: `linear-gradient(135deg, ${T.primary}15, ${T.accent}15)`,
                    border: `1px solid ${T.primary}30`, borderRadius: 12,
                }}>
                    <IconClock size={18} color={T.accent} />
                    <span style={{ fontSize: 18, fontWeight: 800, color: T.white, fontFamily: T.mono }}>24/7</span>
                    <span style={{ fontSize: 13, color: T.muted }}>Monitoramento ininterrupto</span>
                </div>
            </div>
        </div>
    </div>
);

/* ════════════════ SLIDE 3: Centro de Comando ════════════════ */
export const SimDashboard = () => (
    <SplitSlide title="Centro de Comando" subtitle="Visão unificada de todas as frentes de monitoramento. KPIs em tempo real, alertas de crise e nuvem de assuntos em uma única interface."
        accent={T.primary} icon={<IconBarChart size={32} />}
        points={[
            { icon: <IconActivity size={16} />, label: 'KPIs em Tempo Real', desc: 'Menções, risk score, sentimento e volume atualizados por segundo' },
            { icon: <IconAlertTriangle size={16} />, label: 'Alerta de Crise Automático', desc: 'Banner ativado quando indicadores convergem para risco elevado' },
            { icon: <IconTarget size={16} />, label: 'Filtro por Ativação', desc: 'Cada campanha ou pré-campanha com dashboard independente' },
        ]}
    >
        <SimFrame>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>Centro de Comando</div>
                    <div style={{ fontSize: 10, color: T.dim }}>Monitoramento de ameaças e vigilância do sistema.</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <Badge label="MODO CRISE — 1 indicador" color={T.danger} filled />
                </div>
            </div>
            {/* Crisis banner */}
            <div style={{ background: `${T.danger}10`, border: `1px solid ${T.danger}25`, borderRadius: 8, padding: '8px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconAlertTriangle size={14} color={T.danger} className="anim-pulse" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fca5a5' }}>Indicadores de Crise Detectados</span>
                <span style={{ fontSize: 10, color: T.dim, marginLeft: 4 }}>6 alertas ativos</span>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {['Visão Geral', 'Flavio Bolsonaro', 'Lula'].map((t, i) => (
                    <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '6px 12px', borderRadius: 6, background: i === 0 ? `${T.primary}15` : T.surface, color: i === 0 ? T.primary : T.dim, border: `1px solid ${i === 0 ? `${T.primary}30` : T.border}` }}>{t}</span>
                ))}
            </div>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                <KpiCard label="Total Menções" value="916" accent={T.primary} icon={<IconBarChart size={18} />} extra="+35% (24h)" />
                <KpiCard label="Risk Score Médio" value="30" accent={T.success} icon={<IconShield size={18} />} extra="Baixo · Últimas 24h" />
                <KpiCard label="Sentimento (Net)" value="+222" accent={T.success} icon={<IconTrendingUp size={18} />} extra="▲ 267  ● 597  ▼ 45" />
                <KpiCard label="Ativações" value="1" accent={T.accent} icon={<IconZap size={18} />} extra="Monitoramentos ativos" />
            </div>
            {/* Secondary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                    { l: 'Redes Sociais', v: '20', s: '1h', c: T.cyan }, { l: 'Fontes Únicas', v: '3', s: '24h', c: T.primary },
                    { l: 'Entidades', v: '16', s: '24h', c: T.purple }, { l: 'Volume 24h', v: '97', s: '+35%', c: T.teal },
                ].map(k => (
                    <div key={k.l} style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`, borderLeft: `3px solid ${k.c}`, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div><div style={{ fontSize: 8, color: T.dim, textTransform: 'uppercase', letterSpacing: 1 }}>{k.l}</div><div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.white }}>{k.v}</div></div>
                        <div style={{ marginLeft: 'auto', fontSize: 8, color: T.dim }}>{k.s}</div>
                    </div>
                ))}
            </div>
        </SimFrame>
    </SplitSlide>
);

/* ════════════════ SLIDE 4: Feed TV ════════════════ */
export const SimFeedTV = () => (
    <SplitSlide title="Monitoramento de TV e Rádio" subtitle="Captura automática de vídeos com detecção de citações, player integrado e ferramentas de recorte para resposta rápida."
        accent={T.accent} icon={<IconMonitor size={32} />}
        points={[
            { icon: <IconPlay size={16} />, label: 'Player com Timeline de Citações', desc: 'Pontos verde/vermelho indicam o momento exato e o sentimento de cada citação' },
            { icon: <IconScissors size={16} />, label: 'Recorte de Trechos', desc: 'Corte o trecho relevante e baixe para compartilhamento imediato' },
            { icon: <IconSearch size={16} />, label: 'Transcrição Automática', desc: 'Busca por texto dentro de programas de TV e rádio' },
        ]}
    >
        <SimFrame glow={T.accent}>
            {/* Video area */}
            <div style={{ background: '#000', borderRadius: 10, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a2e, #16213e)', opacity: 0.8 }} />
                <div style={{ position: 'relative', textAlign: 'center', color: T.dim }}>
                    <IconMonitor size={40} color={T.accent} />
                    <div style={{ fontSize: 11, marginTop: 8 }}>Band Brasília · 27/02/2026</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.white, marginTop: 4 }}>Briga na CPI do INSS: Quebra de Sigilo Gera Conflito</div>
                </div>
                <div style={{ position: 'absolute', bottom: 8, left: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconPlay size={16} color={T.white} />
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.white }}>0:00</span>
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: T.surfaceLight }}><div style={{ height: '100%', width: '35%', background: T.primary, borderRadius: 2 }} /></div>
            </div>
            {/* Citation timeline */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Timeline de Citações</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {[{ l: 'Positivo', c: T.success }, { l: 'Negativo', c: T.danger }, { l: 'Neutro', c: T.dim }].map(x => (
                            <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: T.dim }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: x.c }} />{x.l}
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ position: 'relative', height: 16, background: T.surfaceLight, borderRadius: 8 }}>
                    {[{ p: 15, c: T.danger }, { p: 35, c: T.success }, { p: 55, c: T.success }, { p: 72, c: T.danger }, { p: 88, c: T.dim }].map((d, i) => (
                        <div key={i} style={{ position: 'absolute', left: `${d.p}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: d.c, border: `2px solid ${T.bg}` }} />
                    ))}
                </div>
            </div>
            {/* Clip tool + download */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <IconScissors size={14} color={T.dim} />
                <div style={{ background: T.surface, borderRadius: 4, padding: '4px 10px', fontFamily: T.mono, fontSize: 10, color: T.muted, border: `1px solid ${T.border}` }}>00:00</div>
                <span style={{ color: T.dim, fontSize: 10 }}>→</span>
                <div style={{ background: T.surface, borderRadius: 4, padding: '4px 10px', fontFamily: T.mono, fontSize: 10, color: T.muted, border: `1px solid ${T.border}` }}>05:00</div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: `${T.primary}15`, border: `1px solid ${T.primary}30`, borderRadius: 6, padding: '5px 12px', fontSize: 10, color: T.primary, fontWeight: 600 }}>
                    <IconDownload size={12} color={T.primary} /> Baixar Vídeo
                </div>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
                {['Mídias Geradas (1)', 'Transcrição'].map((t, i) => (
                    <span key={t} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '8px 0', color: i === 0 ? T.white : T.dim, borderBottom: i === 0 ? `2px solid ${T.primary}` : '2px solid transparent' }}>{t}</span>
                ))}
            </div>
        </SimFrame>
    </SplitSlide>
);

/* ════════════════ SLIDE 5: Análise de Menção ════════════════ */
export const SimMentionDetail = () => (
    <SplitSlide title="Análise Inteligente por Menção" subtitle="Cada menção capturada é processada pela IA que identifica alvos, classifica sentimento por entidade e calcula risco com justificativa detalhada."
        accent={T.cyan} icon={<IconBrain size={32} />}
        points={[
            { icon: <IconTarget size={16} />, label: 'Alvos Detectados', desc: 'A IA identifica automaticamente quais entidades monitoradas são citadas' },
            { icon: <IconUsers size={16} />, label: 'Análise por Citado', desc: 'Sentimento individualizado: positivo, negativo ou elogioso por pessoa' },
            { icon: <IconShield size={16} />, label: 'Análise de Risco Contextual', desc: 'Score 0-100 com justificativa textual gerada pela IA' },
        ]}
    >
        <SimFrame glow={T.cyan}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 4 }}>Detalhes da Menção</div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.dim, marginBottom: 16 }}>6549734b-9dd9-41dd-810c-900e2f41005d</div>
            {/* Alvos Detectados */}
            <Card accent={T.success} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <IconBrain size={14} color={T.cyan} /> <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Alvos Detectados</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${T.success}`, background: T.surfaceLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.white }}>FB</div>
                    <div><div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Flavio Bolsonaro</div><span style={{ fontSize: 10, fontWeight: 700, color: T.success }}>POSITIVO</span></div>
                </div>
            </Card>
            {/* Análise por Citado */}
            <Card accent={T.primary} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <IconUsers size={14} color={T.primary} /> <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Análise por Citado (1)</span>
                </div>
                <div style={{ background: T.bg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Flavio Bolsonaro</span>
                        <Badge label="ELOGIOSO" color={T.dim} /> <Badge label="Positivo" color={T.success} filled />
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
                        O nome de Flavio Bolsonaro é repetido insistentemente com a declaração "PRESIDENTE!".
                    </div>
                </div>
            </Card>
            {/* Análise de Risco */}
            <Card accent={T.danger} glow>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconBrain size={14} color={T.cyan} /> <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Análise de Risco</span>
                    </div>
                    <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 800, color: T.danger }}>75/100</span>
                </div>
                <div style={{ height: 4, background: T.surfaceLight, borderRadius: 2, marginBottom: 10 }}><div style={{ height: '100%', width: '75%', background: T.danger, borderRadius: 2 }} /></div>
                <div style={{ borderLeft: `2px solid ${T.dim}`, paddingLeft: 12, fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.7 }}>
                    "O conteúdo é diretamente sobre a candidatura de Flavio Bolsonaro, fortalecendo sua imagem como potencial presidente."
                </div>
            </Card>
        </SimFrame>
    </SplitSlide>
);

/* ════════════════ SLIDE 6: Gestão de Crises ════════════════ */
export const SimCrisis = () => (
    <SplitSlide title="Gestão de Crises com IA" subtitle="O sistema detecta crises automaticamente, agrega menções vinculadas e gera um plano de resposta estratégico refinável com inteligência artificial."
        accent={T.danger} icon={<IconAlertTriangle size={32} />}
        points={[
            { icon: <IconZap size={16} />, label: 'Detecção Automática', desc: 'Ativada por convergência de risk score, volume de menções e sentimento negativo' },
            { icon: <IconBrain size={16} />, label: 'Plano de Resposta com IA', desc: 'Estratégia recomendada gerada automaticamente com opção de refinamento' },
            { icon: <IconShield size={16} />, label: 'Riscos Multidimensionais', desc: 'Avaliação Política, Viral e Reputacional com nível de severidade' },
        ]}
    >
        <SimFrame glow={T.danger}>
            {/* Crisis header */}
            <div style={{ background: T.surface, borderRadius: 10, padding: '14px 18px', border: `1px solid ${T.border}`, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <Badge label="MÉDIA SEVERIDADE" color={T.accent} filled />
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: T.dim }}>ID: 05ec8146</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.dim }}><IconClock size={10} /> 2/26/2026, 6:58 PM</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.white, lineHeight: 1.4 }}>Crise: Flávio Bolsonaro condiciona apoio no DF a decisões eleitorais de Lula</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10, color: T.dim }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconUsers size={12} /> Responsável: <strong style={{ color: T.white }}>Admin</strong></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconCheck size={12} color={T.success} /> Status: <strong style={{ color: T.success }}>ATIVO</strong></span>
                </div>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, marginBottom: 14 }}>
                {[
                    { l: 'Plano de Resposta', active: true, c: T.primary },
                    { l: 'Menções Vinculadas', count: '21', active: false },
                    { l: 'Anexos', active: false },
                    { l: 'Comentários', active: false },
                ].map(t => (
                    <span key={t.l} style={{ fontSize: 11, fontWeight: 600, padding: '8px 14px', color: t.active ? T.white : T.dim, background: t.active ? T.primary : 'transparent', borderRadius: t.active ? '6px 6px 0 0' : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.l} {t.count && <span style={{ background: T.primary, color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{t.count}</span>}
                    </span>
                ))}
            </div>
            {/* Riscos */}
            <div style={{ fontSize: 12, fontWeight: 700, color: T.danger, marginBottom: 10 }}>Riscos Identificados</div>
            {[
                { type: 'Político', level: 'ALTO', color: T.danger },
                { type: 'Viral', level: 'MÉDIO', color: T.accent },
                { type: 'Reputacional', level: 'MÉDIO', color: T.accent },
            ].map(r => (
                <div key={r.type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 12, color: T.muted }}>{r.type}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: r.color }}>{r.level}</span>
                </div>
            ))}
            {/* AI Action */}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 600, color: T.muted }}>
                    <IconBrain size={14} color={T.cyan} className="anim-pulse-soft" /> Regerar e Refinar com IA
                </div>
            </div>
        </SimFrame>
    </SplitSlide>
);

/* ════════════════ SLIDE 7: Feed Social ════════════════ */
export const SimFeedSocial = () => (
    <SplitSlide title="Inteligência em Redes Sociais" subtitle="Captura e análise de posts em Twitter/X, Instagram e TikTok com métricas de engajamento, sentimento e detecção de entidades em tempo real."
        accent={T.pink} icon={<IconSearch size={32} />}
        points={[
            { icon: <IconActivity size={16} />, label: 'Métricas de Engajamento', desc: 'Reposts, respostas, curtidas e visualizações em tempo real' },
            { icon: <IconEye size={16} />, label: 'Captura Completa do Post', desc: 'Modal com contexto original incluindo respostas e threads' },
            { icon: <IconTarget size={16} />, label: 'Detecção de Narrativas', desc: 'Identificação de padrões de ataque coordenado ou amplificação' },
        ]}
    >
        <SimFrame glow={T.pink}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, marginBottom: 14 }}>
                {[
                    { l: 'Portais', c: T.cyan, a: false }, { l: 'Redes Sociais', c: T.pink, a: true },
                    { l: 'TV', c: T.accent, a: false }, { l: 'Rádio', c: T.teal, a: false },
                    { l: 'WhatsApp', c: T.success, a: false }, { l: 'Instagram', c: T.purple, a: false },
                    { l: 'TikTok', c: T.cyan, a: false },
                ].map(t => (
                    <span key={t.l} style={{ fontSize: 10, fontWeight: 600, padding: '8px 10px', color: t.a ? t.c : T.dim, borderBottom: t.a ? `2px solid ${t.c}` : '2px solid transparent' }}>{t.l}</span>
                ))}
            </div>
            {/* Tweet Card */}
            <div style={{ background: '#000', borderRadius: 12, padding: 16, border: `1px solid ${T.borderSolid}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: T.white }}>@</div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>@hernandojb</div>
                            <div style={{ fontSize: 10, color: T.dim }}>@hernandojb</div>
                        </div>
                    </div>
                    <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 900, color: T.white }}>X</span>
                </div>
                <p style={{ fontSize: 13, color: T.white, lineHeight: 1.6, margin: '0 0 10px' }}>
                    @nikolas_dm FLÁVIO BOLSONARO PRESIDENTE!<br />
                    FLÁVIO BOLSONARO PRESIDENTE!<br />
                    FLÁVIO BOLSONARO PRESIDENTE!
                </p>
                <div style={{ color: T.primary, fontSize: 11, marginBottom: 8 }}>#Flavio Bolsonaro</div>
                <div style={{ fontSize: 10, color: T.dim, marginBottom: 10 }}>13:43 · 25 de fev. de 2026 · X for Web</div>
                <div style={{ borderTop: `1px solid ${T.borderSolid}`, paddingTop: 8, display: 'flex', gap: 16, fontSize: 11 }}>
                    <span><strong style={{ color: T.white }}>435</strong> <span style={{ color: T.dim }}>Reposts</span></span>
                    <span><strong style={{ color: T.white }}>35</strong> <span style={{ color: T.dim }}>Respostas</span></span>
                    <span><strong style={{ color: T.white }}>2.8K</strong> <span style={{ color: T.dim }}>Curtidas</span></span>
                    <span><strong style={{ color: T.white }}>75.0K</strong> <span style={{ color: T.dim }}>Views</span></span>
                </div>
                <div style={{ borderTop: `1px solid ${T.borderSolid}`, paddingTop: 6, marginTop: 8, fontSize: 10 }}>
                    <strong style={{ color: T.white }}>30.5K</strong> <span style={{ color: T.dim }}>Seguidores</span>
                </div>
            </div>
        </SimFrame>
    </SplitSlide>
);

/* ════════════════ SLIDE 8: Radar de Ameaças — uses animated component ════════════════ */
export { AnimThreat as SimThreats } from './animated-slides';

/* ════════════════ SLIDE 9: WhatsApp ════════════════ */
export const SlideWhatsApp = () => (
    <SplitSlide title="Inteligência em WhatsApp" subtitle="Monitoramento de grupos políticos de WhatsApp com detecção de narrativas, alertas de mobilização e análise de sentimento — a fonte que nenhum concorrente captura."
        accent={T.success} icon={<IconMessageCircle size={32} />}
        points={[
            { icon: <IconEye size={16} />, label: 'Infiltração em Grupos Políticos', desc: 'Monitoramento passivo de grupos da oposição e da base aliada' },
            { icon: <IconAlertTriangle size={16} />, label: 'Detecção de Mobilização', desc: 'Alertas quando há convocação de atos ou disseminação de narrativas coordenadas' },
            { icon: <IconBrain size={16} />, label: 'Análise de Sentimento por Grupo', desc: 'Termômetro de cada grupo: favorável, hostil ou neutro ao candidato' },
            { icon: <IconLock size={16} />, label: 'Sigilo Total', desc: 'Operação silenciosa sem interação — apenas escuta e análise' },
        ]}
    >
        <SimFrame glow={T.success}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <IconMessageCircle size={18} color={T.success} /> <span style={{ fontSize: 14, fontWeight: 700, color: T.white }}>Monitoramento WhatsApp</span>
                <Badge label="EXCLUSIVO" color={T.success} />
            </div>
            {/* Groups */}
            {[
                { name: 'Grupo Oposição Nacional', members: 256, msgs: 847, sentiment: 'Hostil', color: T.danger, alert: true },
                { name: 'Base Aliada Nordeste', members: 189, msgs: 432, sentiment: 'Favorável', color: T.success, alert: false },
                { name: 'Imprensa Política DF', members: 92, msgs: 156, sentiment: 'Neutro', color: T.dim, alert: false },
            ].map((g, i) => (
                <Card key={i} accent={g.color} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>{g.name}</span>
                                {g.alert && <Badge label="ALERTA" color={T.danger} />}
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: T.dim }}>
                                <span><IconUsers size={10} /> {g.members} membros</span>
                                <span><IconMessageCircle size={10} /> {g.msgs} msgs/24h</span>
                            </div>
                        </div>
                        <Badge label={g.sentiment.toUpperCase()} color={g.color} />
                    </div>
                </Card>
            ))}
            {/* Alert banner */}
            <div style={{ marginTop: 12, background: `${T.danger}08`, border: `1px solid ${T.danger}20`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <IconAlertTriangle size={16} color={T.danger} className="anim-pulse" />
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', marginBottom: 2 }}>Alerta de Mobilização Detectado</div>
                    <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.6 }}>
                        Convocação para ato presencial detectada em "Grupo Oposição Nacional" — 23 interações nos últimos 40 minutos.
                    </div>
                </div>
            </div>
        </SimFrame>
    </SplitSlide>
);

/* ════════════════ SLIDE 10: Cenários ════════════════ */
export const SlideScenarios = () => (
    <SlideLayout title="Cenários Estratégicos" subtitle="Três situações reais onde o Elege.AI transforma informação bruta em vantagem competitiva." icon={<IconTarget size={36} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
                {
                    icon: <IconZap size={28} />, title: 'Contra-Ataque Relâmpago', color: T.danger,
                    steps: ['Adversário publica vídeo-ataque no Twitter', 'IA detecta, classifica sentimento e calcula risco', 'Alerta instantâneo via WhatsApp para a equipe', 'Busca retroativa encontra contradições do atacante', 'Resposta montada em minutos com dados concretos']
                },
                {
                    icon: <IconShield size={28} />, title: 'Crise Preventiva', color: T.accent,
                    steps: ['Word Cloud detecta crescimento anormal de termo + nome do candidato', 'Radar de Ameaças identifica 3 perfis coordenados', 'Modo Crise ativado com timeline e plano de ação', 'IA gera plano de resposta com análise de riscos', 'Candidato já se posicionou antes da cobertura de TV']
                },
                {
                    icon: <IconTrendingUp size={28} />, title: 'Amplificação Positiva', color: T.success,
                    steps: ['Automação cruza Google Trends com menções positivas', 'Sistema identifica pauta favorável ganhando tração', 'Relatório automático com trechos e métricas', 'Material pronto para equipe de marketing', 'Amplificação coordenada nas 7 plataformas monitoradas']
                },
            ].map((s, i) => (
                <div style={{ background: `${s.color}06`, border: `1px solid ${s.color}18`, borderRadius: 14, padding: 22 }}>
                    <div style={{ color: s.color, marginBottom: 12 }}>{s.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 14 }}>{s.title}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {s.steps.map((step, j) => (
                            <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: s.color, width: 18, flexShrink: 0 }}>{j + 1}.</span>
                                <span style={{ fontSize: 14, color: T.muted, lineHeight: 1.5 }}>{step}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </SlideLayout>
);

/* ════════════════ SLIDE 11: Close ════════════════ */
export const SlideClose = () => (
    <div style={{ textAlign: 'center', maxWidth: 700 }}>
        <img src="/logo-elegeai-branca.png" alt="Elege.AI" style={{ height: 160, objectFit: 'contain', margin: '0 auto 48px', display: 'block' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 40 }}>
            {[
                { name: 'Fábio Rosa', role: 'CEO', phone: '+55 61 99965-8985' },
                { name: 'Paulo Sart', role: 'CPO', phone: '+55 61 98378-3766' },
            ].map(c => (
                <div key={c.name} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '24px 36px', textAlign: 'center' }}>
                    <div style={{ fontSize: 23, fontWeight: 700, color: T.white }}>{c.name}</div>
                    <div style={{ fontSize: 16, color: T.accent, fontWeight: 600, marginTop: 4 }}>{c.role}</div>
                    <div style={{ fontSize: 17, color: T.muted, marginTop: 10, fontFamily: T.mono }}>{c.phone}</div>
                </div>
            ))}
        </div>
    </div>
);
/* ════════════════ SLIDE: Flow Pipeline ════════════════ */
export const SlideFlowPipeline: React.FC<{ isActive?: boolean }> = () => (
    <div style={{ maxWidth: 900, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>COMO FUNCIONA</div>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: T.white, letterSpacing: -1, margin: '0 0 8px' }}>Da captura à inteligência</h2>
        <p style={{ fontSize: 14, color: T.muted, margin: '0 0 48px', lineHeight: 1.6 }}>Todo conteúdo passa por 4 estágios automáticos antes de chegar ao seu dashboard.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
                {
                    icon: <IconSearch size={32} />, title: 'Monitoramento', color: T.primary,
                    desc: 'Captação contínua de 200+ veículos em 7 plataformas simultâneas',
                    items: ['TV e Rádio', 'Portais de Notícias', 'Redes Sociais', 'WhatsApp'],
                },
                {
                    icon: <IconTarget size={32} />, title: 'Seleção Automática', color: T.cyan,
                    desc: 'Filtros inteligentes selecionam conteúdos relevantes para cada ativação',
                    items: ['Keywords', 'Entidades citadas', 'Nomes monitorados', 'Contexto político'],
                },
                {
                    icon: <IconBrain size={32} />, title: 'Análise com IA', color: T.purple,
                    desc: 'Inteligência artificial processa e extrai insights de cada menção',
                    items: ['Sentimento por citado', 'Score de risco', 'Detecção de alvos', 'Contexto narrativo'],
                },
                {
                    icon: <IconShield size={32} />, title: 'Classificação', color: T.accent,
                    desc: 'Categorização automática por tipo de ameaça e nível de severidade',
                    items: ['Risco político', 'Risco viral', 'Risco reputacional', 'Prioridade de resposta'],
                },
            ].map((step, i) => (
                <div key={i} style={{
                    position: 'relative',
                    background: `${step.color}06`, border: `1px solid ${step.color}18`,
                    borderRadius: 16, padding: '28px 20px 24px',
                    animation: `slide-up 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.15}s both`,
                }}>
                    {/* Step number */}
                    <div style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        width: 24, height: 24, borderRadius: '50%', background: step.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: T.bg, fontFamily: T.mono,
                    }}>{i + 1}</div>
                    {/* Arrow connector */}
                    {i < 3 && (
                        <div style={{
                            position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
                            fontSize: 16, color: T.dim, zIndex: 5,
                        }}>→</div>
                    )}
                    <div style={{ color: step.color, marginBottom: 12 }}>{step.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: step.color, marginBottom: 8 }}>{step.title}</div>
                    <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>{step.desc}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {step.items.map((item, j) => (
                            <div key={j} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 10, color: T.dim,
                            }}>
                                <IconCheck size={10} color={step.color} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/* ════════════════ SLIDE: WhatsApp Notifications (Phone Mockup) ════════════════ */
export const SlideWhatsAppNotify: React.FC<{ isActive?: boolean }> = () => (
    <div style={{ maxWidth: 1000, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        {/* LEFT: Copy */}
        <div style={{ animation: 'slide-right 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div style={{ fontSize: 10, color: '#25D366', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>NOTIFICAÇÕES INSTANTÂNEAS</div>
            <h2 style={{ fontSize: 40, fontWeight: 800, color: T.white, lineHeight: 1.15, letterSpacing: -1, margin: '0 0 16px' }}>
                Notificações diretamente no <span style={{ color: '#25D366' }}>WhatsApp</span>
            </h2>
            <p style={{ fontSize: 16, color: T.muted, lineHeight: 1.7, margin: '0 0 32px' }}>
                Conteúdos selecionados automaticamente pela IA são enviados para o WhatsApp da equipe em tempo real. Sem precisar abrir o sistema.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                    { icon: <IconZap size={16} />, label: 'Envio Instantâneo', desc: 'Alertas em segundos após a detecção' },
                    { icon: <IconTarget size={16} />, label: 'Conteúdo Filtrado', desc: 'Só o que importa, sem ruído' },
                    { icon: <IconBrain size={16} />, label: 'Análise Inclusa', desc: 'Sentimento, risco e contexto em cada mensagem' },
                    { icon: <IconUsers size={16} />, label: 'Grupos da Equipe', desc: 'Cada ativação pode ter seu grupo dedicado' },
                ].map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: `slide-up 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.15}s both` }}>
                        <div style={{ color: '#25D366', flexShrink: 0, marginTop: 2 }}>{p.icon}</div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{p.label}</div>
                            <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>{p.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* RIGHT: Phone Mockup */}
        <div style={{ display: 'flex', justifyContent: 'center', animation: 'slide-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>
            <div style={{
                width: 280, borderRadius: 32, padding: 10,
                background: 'linear-gradient(145deg, #2a2a2e, #1a1a1e)',
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                animation: 'mockup-float 5s ease-in-out infinite',
            }}>
                {/* Phone notch */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 2px' }}>
                    <div style={{ width: 80, height: 20, borderRadius: 10, background: '#000' }} />
                </div>
                {/* Screen */}
                <div style={{ borderRadius: 22, overflow: 'hidden', background: '#0b141a' }}>
                    {/* WhatsApp header */}
                    <div style={{ background: '#1f2c34', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 11, color: '#25D366' }}>←</div>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                            <span style={{ fontSize: 12 }}>ε</span>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#e9edef' }}>ElegeAI</div>
                            <div style={{ fontSize: 8, color: '#8696a0' }}>+55 61 99395-6958</div>
                        </div>
                    </div>
                    {/* Chat messages */}
                    <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 320 }}>
                        {/* Message 1 - TV Alert */}
                        <div style={{
                            background: '#1f2c34', borderRadius: '0 8px 8px 8px', padding: '8px 10px',
                            maxWidth: '90%', border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <div style={{ fontSize: 9, color: '#25D366', fontWeight: 700, marginBottom: 4 }}>~Elege.AI</div>
                            {/* Video thumb */}
                            <div style={{ background: 'linear-gradient(135deg, #0d1117, #1a1a2e)', borderRadius: 6, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
                                <div style={{ position: 'relative', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <IconPlay size={14} color={T.white} />
                                </div>
                                <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 7, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', borderRadius: 3, padding: '1px 4px' }}>TV Band • Brasília</div>
                            </div>
                            <div style={{ fontSize: 10, color: '#e9edef', fontWeight: 700, marginBottom: 2 }}>TV Distrital - 02/03/26</div>
                            <div style={{ fontSize: 9, color: '#8696a0', marginBottom: 4 }}>20:18:45</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                <span style={{ fontSize: 9 }}>🟩</span>
                                <span style={{ fontSize: 9, color: '#e9edef', fontWeight: 600 }}>Flavio Bolsonaro</span>
                            </div>
                            <div style={{ fontSize: 8, color: '#8696a0', lineHeight: 1.5, marginBottom: 6 }}>
                                O texto cita o senador como líder de articulação da bancada, reforçando imagem positiva.
                            </div>
                            <div style={{ fontSize: 7, color: '#25D366', lineHeight: 1.4, marginBottom: 4 }}>
                                #SenadoFederal #PolíticaDF #Articulação
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 7, color: '#8696a0' }}>14:14</div>
                        </div>

                        {/* Message 2 - Portal Alert */}
                        <div style={{
                            background: '#1f2c34', borderRadius: '0 8px 8px 8px', padding: '8px 10px',
                            maxWidth: '90%', border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <div style={{ fontSize: 9, color: '#25D366', fontWeight: 700, marginBottom: 4 }}>~Elege.AI</div>
                            <div style={{ fontSize: 10, color: '#e9edef', fontWeight: 700, marginBottom: 2 }}>📢 Alerta Portal</div>
                            <div style={{ fontSize: 8, color: '#8696a0', lineHeight: 1.5 }}>
                                G1 publicou matéria com menção direta. Sentimento: <span style={{ color: '#f87171', fontWeight: 700 }}>NEGATIVO</span> • Risco: <span style={{ color: '#fb923c', fontWeight: 700 }}>68</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 7, color: '#8696a0', marginTop: 4 }}>14:22</div>
                        </div>
                    </div>
                </div>
                {/* Home bar */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                    <div style={{ width: 100, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                </div>
            </div>
        </div>
    </div>
);

/* ════════════════ SLIDE: Relatórios Estratégicos ════════════════ */
export const SlideReports: React.FC<{ isActive?: boolean }> = () => (
    <SplitSlide title="Relatórios Estratégicos" subtitle="Dashboards executivos com KPIs de monitoramento, sentimento e risco — gerados automaticamente para tomada de decisão rápida."
        accent={T.purple} icon={<IconBarChart size={32} />}
        points={[
            { icon: <IconBarChart size={16} />, label: 'KPIs em Tempo Real', desc: 'Métricas atualizadas automaticamente a cada ciclo de sync' },
            { icon: <IconTrendingUp size={16} />, label: 'Evolução Temporal', desc: 'Gráficos de tendência de menções, sentimento e risco' },
            { icon: <IconDownload size={16} />, label: 'Exportação PDF', desc: 'Relatórios formatados prontos para reuniões estratégicas' },
        ]}
    >
        <SimFrame glow={T.purple}>
            {/* Report header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>Relatório Executivo</div>
                    <div style={{ fontSize: 10, color: T.dim }}>Ativação: Flavio Bolsonaro • Últimas 24h</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <Badge label="PDF" color={T.purple} />
                    <Badge label="TEMPO REAL" color={T.success} filled />
                </div>
            </div>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                    { label: 'Menções Totais', value: '916', delta: '+35%', color: T.primary },
                    { label: 'Risk Score Médio', value: '30', delta: 'Baixo', color: T.success },
                    { label: 'Sentimento Net', value: '+222', delta: '29% positivo', color: T.success },
                ].map((k, i) => (
                    <div key={i} style={{ background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`, borderLeft: `3px solid ${k.color}`, padding: '10px 12px' }}>
                        <div style={{ fontSize: 8, color: T.dim, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
                        <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 800, color: T.white, marginTop: 2 }}>{k.value}</div>
                        <div style={{ fontSize: 9, color: k.color, marginTop: 2 }}>{k.delta}</div>
                    </div>
                ))}
            </div>
            {/* Secondary metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                    { label: 'Fontes Únicas', value: '47', icon: <IconGlobe size={12} />, color: T.cyan },
                    { label: 'Alertas Críticos', value: '6', icon: <IconAlertTriangle size={12} />, color: T.danger },
                    { label: 'Entidades', value: '16', icon: <IconUsers size={12} />, color: T.purple },
                    { label: 'Ameaças Ativas', value: '3', icon: <IconShield size={12} />, color: T.accent },
                ].map((m, i) => (
                    <div key={i} style={{ background: `${m.color}08`, borderRadius: 6, border: `1px solid ${m.color}15`, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ color: m.color, marginBottom: 4 }}>{m.icon}</div>
                        <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.white }}>{m.value}</div>
                        <div style={{ fontSize: 7, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
                    </div>
                ))}
            </div>
            {/* Chart mockup */}
            <div style={{ background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Tendência 7 dias</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {[{ l: 'Menções', c: T.primary }, { l: 'Positivo', c: T.success }, { l: 'Negativo', c: T.danger }].map(x => (
                            <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: T.dim }}>
                                <span style={{ width: 6, height: 2, borderRadius: 1, background: x.c }} />{x.l}
                            </span>
                        ))}
                    </div>
                </div>
                {/* Mini chart bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 50 }}>
                    {[45, 62, 38, 71, 55, 89, 78].map((v, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                            <div style={{ width: '100%', height: `${(v / 100) * 48}px`, borderRadius: 3, background: `linear-gradient(180deg, ${T.primary}, ${T.primary}60)` }} />
                            <span style={{ fontSize: 7, color: T.dim, marginTop: 2 }}>{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </SimFrame>
    </SplitSlide>
);
