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
        <div style={{ paddingTop: 16 }}>
            {icon && <div style={{ color: accent, marginBottom: 14, opacity: 0.7 }}>{icon}</div>}
            <h2 style={{ fontSize: 44, fontWeight: 800, margin: 0, color: T.white, letterSpacing: -1, lineHeight: 1.15 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 15, color: T.muted, marginTop: 12, lineHeight: 1.7 }}>{subtitle}</p>}
            {points && (
                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {points.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ color: accent, flexShrink: 0, marginTop: 2 }}>{p.icon}</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{p.label}</div>
                                <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>{p.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div>{children}</div>
    </div>
);

const SimFrame: React.FC<{ children: React.ReactNode; glow?: string }> = ({ children, glow }) => (
    <div style={{
        background: T.bg, borderRadius: 16, border: `1px solid ${T.border}`,
        padding: 20, boxShadow: glow ? `0 0 40px -8px ${glow}30, 0 25px 60px -12px rgba(0,0,0,0.5)` : '0 25px 60px -12px rgba(0,0,0,0.5)',
    }}>{children}</div>
);

const Card: React.FC<{ accent?: string; children: React.ReactNode; glow?: boolean; style?: React.CSSProperties }> = ({ accent = T.primary, children, glow, style }) => (
    <div style={{
        background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`,
        borderLeft: `4px solid ${accent}`, padding: '14px 18px',
        ...(glow ? { boxShadow: `inset 0 0 20px ${accent}08` } : {}), ...style,
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

/* ════════════════ SLIDE 1: Cover ════════════════ */
export const SlideCover = () => (
    <div style={{ textAlign: 'center', maxWidth: 700 }}>
        <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 32 }}>
            PLATAFORMA DE INTELIGÊNCIA POLÍTICA
        </div>
        <h1 style={{
            fontSize: 80, fontWeight: 900, margin: 0, lineHeight: 1,
            background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Elege.AI</h1>
        <p style={{ fontSize: 20, color: T.muted, marginTop: 24, lineHeight: 1.7 }}>
            Monitoramento em tempo real. Análise com IA.<br />
            <span style={{ color: T.white, fontWeight: 600 }}>Resposta estratégica automatizada.</span>
        </p>
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 12 }}>
            {[
                { icon: <IconMonitor size={14} />, l: 'TV' }, { icon: <IconRadio size={14} />, l: 'Rádio' },
                { icon: <IconGlobe size={14} />, l: 'Portais' }, { icon: <IconSearch size={14} />, l: 'Twitter/X' },
                { icon: <IconEye size={14} />, l: 'Instagram' }, { icon: <IconActivity size={14} />, l: 'TikTok' },
                { icon: <IconMessageCircle size={14} />, l: 'WhatsApp' },
            ].map(s => (
                <span key={s.l} style={{ fontSize: 11, color: T.dim, background: T.surface, border: `1px solid ${T.border}`, padding: '6px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s.icon}{s.l}
                </span>
            ))}
        </div>
        <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: T.dim }}>
            <span style={{ fontFamily: T.mono, color: T.muted, background: T.surface, padding: '3px 10px', borderRadius: 4, fontSize: 11 }}>→</span>
            para navegar
        </div>
    </div>
);

/* ════════════════ SLIDE 2: Evolution ════════════════ */
export const SlideEvolution = () => (
    <SlideLayout title="A Evolução" subtitle="3 anos de desenvolvimento contínuo — de ferramenta de gabinete para centro de comando político." icon={<IconTrendingUp size={36} />}>
        <div style={{ position: 'relative', display: 'flex', gap: 0 }}>
            <div style={{ position: 'absolute', top: 28, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${T.primary}, ${T.purple}, ${T.accent})` }} />
            {[
                { year: '2023', title: 'Gabinete Parlamentar', desc: 'Monitoramento básico de TV e rádio para assessores de parlamentares', color: T.primary, icon: <IconMonitor size={18} /> },
                { year: '2024', title: 'Expansão Multicanal', desc: 'Portais, redes sociais, IA de sentimento e classificação automática', color: T.purple, icon: <IconBrain size={18} /> },
                { year: '2025', title: 'War Room', desc: 'Arsenal completo: ameaças, crises, automação, entidades, planos de resposta com IA', color: T.accent, icon: <IconShield size={18} /> },
            ].map((item, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative', paddingTop: 52 }}>
                    <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: 22, height: 22, borderRadius: '50%', background: item.color, border: `3px solid ${T.bg}`, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.bg }} />
                    </div>
                    <div style={{ color: item.color, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: item.color, fontFamily: T.mono }}>{item.year}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.white, marginTop: 8 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 6, lineHeight: 1.6, padding: '0 8px' }}>{item.desc}</div>
                </div>
            ))}
        </div>
        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
                { n: '7', l: 'Fontes de Mídia', c: T.primary }, { n: '19+', l: 'Integrações', c: T.cyan },
                { n: '28', l: 'Telas', c: T.purple }, { n: '24/7', l: 'Automação', c: T.accent },
            ].map(k => (
                <div key={k.l} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 800, color: k.c }}>{k.n}</div>
                    <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{k.l}</div>
                </div>
            ))}
        </div>
    </SlideLayout>
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

/* ════════════════ SLIDE 8: Radar de Ameaças ════════════════ */
export const SimThreats = () => (
    <SplitSlide title="Radar de Ameaças" subtitle="Identifica e ranqueia automaticamente os perfis que mais atacam o candidato. Agrega menções negativas por autor, calcula alcance e nível de risco."
        accent={T.danger} icon={<IconShield size={32} />}
        points={[
            { icon: <IconUsers size={16} />, label: 'Perfis Hostis Ranqueados', desc: 'Ordenação por frequência de ataque, número de seguidores e risk score' },
            { icon: <IconTarget size={16} />, label: 'Entidade Mais Atacada', desc: 'Visualização de quem está sofrendo mais ataques na rede' },
            { icon: <IconLock size={16} />, label: 'WhatsApp (em desenvolvimento)', desc: 'Detecção de ameaças em grupos políticos de WhatsApp' },
        ]}
    >
        <SimFrame glow={T.danger}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <IconShield size={18} color={T.danger} /> <span style={{ fontSize: 16, fontWeight: 700, color: T.white }}>Radar de Ameaças</span>
                <Badge label="3 Críticos" color={T.danger} /> <Badge label="5 Altos" color="#f97316" />
            </div>
            {[
                { name: 'Carlos Opositor', user: '@opositor_real', level: 'CRÍTICO', color: T.danger, m: 12, f: '45.2k', r: 78, entity: 'Flávio Bolsonaro (8x)' },
                { name: 'Bot Crítico 22', user: '@critico_bot22', level: 'ALTO', color: '#f97316', m: 7, f: '12.1k', r: 65, entity: 'Jair Bolsonaro (5x)' },
            ].map((p, i) => (
                <div key={i} style={{ background: `${p.color}06`, border: `1px solid ${p.color}20`, borderLeft: `3px solid ${p.color}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${p.color}`, background: T.surfaceLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: T.muted, flexShrink: 0 }}>
                        {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: T.white }}>{p.name}</span><Badge label={p.level} color={p.color} /></div>
                        <div style={{ fontSize: 9, color: T.dim }}>{p.user}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, textAlign: 'center' }}>
                        <div><div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.danger }}>{p.m}</div><div style={{ fontSize: 7, color: T.dim, textTransform: 'uppercase' }}>Menções</div></div>
                        <div><div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.white }}>{p.f}</div><div style={{ fontSize: 7, color: T.dim, textTransform: 'uppercase' }}>Seguidores</div></div>
                        <div><div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: p.color }}>{p.r}%</div><div style={{ fontSize: 7, color: T.dim, textTransform: 'uppercase' }}>Risco</div></div>
                    </div>
                    <div style={{ fontSize: 9, color: T.danger, background: `${T.danger}10`, border: `1px solid ${T.danger}20`, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>
                        <IconTarget size={10} color={T.danger} /> {p.entity}
                    </div>
                </div>
            ))}
            {/* Most attacked */}
            <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    <IconTarget size={12} /> Mais Atacados
                </div>
                {[{ n: 'Flávio Bolsonaro', p: 100, c: 15 }, { n: 'Jair Bolsonaro', p: 60, c: 9 }].map(e => (
                    <div key={e.n} style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                            <span style={{ color: '#cbd5e1' }}>{e.n}</span><span style={{ color: T.danger, fontWeight: 700, fontFamily: T.mono }}>{e.c}x</span>
                        </div>
                        <div style={{ height: 4, background: T.surfaceLight, borderRadius: 2 }}><div style={{ height: '100%', width: `${e.p}%`, background: `${T.danger}80`, borderRadius: 2, animation: 'bar-fill 1s ease-out' }} /></div>
                    </div>
                ))}
            </div>
        </SimFrame>
    </SplitSlide>
);

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
                <div key={i} style={{ background: `${s.color}06`, border: `1px solid ${s.color}18`, borderRadius: 14, padding: 22 }}>
                    <div style={{ color: s.color, marginBottom: 12 }}>{s.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: s.color, marginBottom: 14 }}>{s.title}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {s.steps.map((step, j) => (
                            <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: s.color, width: 16, flexShrink: 0 }}>{j + 1}.</span>
                                <span style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{step}</span>
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
        <div style={{ fontSize: 24, fontWeight: 300, color: T.muted, lineHeight: 1.7, marginBottom: 40, fontStyle: 'italic' }}>
            "A informação que chega com 30 minutos de atraso<br />é apenas história. A que chega agora é <strong style={{ color: T.white, fontWeight: 700 }}>poder</strong>."
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 48, flexWrap: 'wrap' }}>
            {[
                { icon: <IconEye size={16} />, t: 'Vê tudo' },
                { icon: <IconBrain size={16} />, t: 'Entende tudo' },
                { icon: <IconZap size={16} />, t: 'Automatiza tudo' },
                { icon: <IconShield size={16} />, t: 'Antecipa tudo' },
            ].map(c => (
                <div key={c.t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ color: T.success }}><IconCheck size={16} /></div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.white, display: 'flex', alignItems: 'center', gap: 6 }}>{c.icon} {c.t}</span>
                </div>
            ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 40 }}>
            {[
                { name: 'Fábio Rosa', role: 'CEO', phone: '+55 61 99965-8985' },
                { name: 'Paulo Sart', role: 'CPO', phone: '+55 61 98378-3766' },
            ].map(c => (
                <div key={c.name} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 28px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginTop: 2 }}>{c.role}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 8, fontFamily: T.mono }}>{c.phone}</div>
                </div>
            ))}
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 900, background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Elege.AI</h1>
        <p style={{ fontSize: 13, color: T.dim, marginTop: 8 }}>De gabinete a War Room. O arsenal que faltava para a política brasileira.</p>
    </div>
);
