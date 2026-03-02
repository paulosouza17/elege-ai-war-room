import React, { useState, useCallback, useEffect } from 'react';
import { T, GLOBAL_STYLES, IconChevronLeft, IconChevronRight } from './apresentacao/icons';
import {
    SlideCover, SlideEvolution, SimThreats,
    SlideWhatsApp, SlideScenarios, SlideClose, ImpactSlide,
} from './apresentacao/slides';
import {
    AnimDashboard, AnimFeedTV, AnimMentionDetail, AnimFeedSocial, AnimCrisis,
} from './apresentacao/animated-slides';

/* ═══════════════════════════════════════════════════════
   Elege.AI — Apresentação Estratégica v3
   Narrativa: Problema → Visão → Captura → Inteligência
              → Frente Oculta → Ameaças → Resposta → Ação
   ═══════════════════════════════════════════════════════ */

const css = {
    slide: {
        position: 'absolute' as const, inset: 0,
        display: 'flex', flexDirection: 'column' as const,
        justifyContent: 'center', alignItems: 'center',
        padding: '48px 64px', fontFamily: T.font,
        background: T.bg, color: T.white,
        transition: 'opacity 0.5s ease, transform 0.5s ease',
    },
    visible: { opacity: 1, pointerEvents: 'auto' as const, transform: 'translateX(0)' },
    hidden: { opacity: 0, pointerEvents: 'none' as const, transform: 'translateX(60px)' },
    exited: { opacity: 0, pointerEvents: 'none' as const, transform: 'translateX(-60px)' },
};

/* ══════════════════════════════════════════════════════════
   ORDEM ESTRATÉGICA DA APRESENTAÇÃO
   Fluxo narrativo: apresentar problema → visão geral →
   mostrar captura → revelar inteligência → frente oculta →
   identificar ameaças → resposta → cenários → fechamento

   MOCKUP vs PRINT:
   - [MOCKUP] = Simulação CSS (pode ser substituído por print)
   - [PRINT]  = Local reservado para screenshot real do sistema
   ══════════════════════════════════════════════════════════ */

const SLIDES: Array<{ component: React.FC; type: 'cover' | 'impact' | 'feature' | 'close'; mockup?: string }> = [
    /* ── ATO 1: ABERTURA ── */
    // 1. Capa — primeira impressão
    { component: SlideCover, type: 'cover' },

    // 2. Impacto — criar urgência
    {
        component: () => <ImpactSlide
            line1="Enquanto você lê esta frase,"
            line2="847 menções ao seu candidato foram publicadas."
            accent={T.danger}
            note="Twitter, portais, TV, rádio, WhatsApp, Instagram e TikTok. Simultaneamente."
        />, type: 'impact'
    },

    // 3. Evolução — credibilidade
    { component: SlideEvolution, type: 'feature' },

    /* ── ATO 2: VISÃO TOTAL ── */
    // 4. Impacto — transição para o produto
    {
        component: () => <ImpactSlide
            line1="200+ veículos. 7 plataformas."
            line2="Uma única tela."
            accent={T.primary}
        />, type: 'impact'
    },

    // 5. Centro de Comando [MOCKUP — substituir por print da tela Centro de Comando]
    { component: AnimDashboard, type: 'feature', mockup: 'Centro de Comando — Dashboard com KPIs, alertas e word cloud' },

    /* ── ATO 3: CAPTURA ── */
    // 6. Impacto — transição para as fontes
    {
        component: () => <ImpactSlide
            line1="A informação bruta é o petróleo."
            line2="A IA é a refinaria."
            accent={T.cyan}
            note="Cada menção é capturada, classificada e analisada em tempo real."
        />, type: 'impact'
    },

    // 7. Feed Social [MOCKUP — substituir por print do Feed de Inteligência aba Redes Sociais]
    { component: AnimFeedSocial, type: 'feature', mockup: 'Feed de Inteligência — aba Redes Sociais com modal de tweet' },

    // 8. Feed TV/Rádio [MOCKUP — substituir por print do Feed de Inteligência aba TV com player]
    { component: AnimFeedTV, type: 'feature', mockup: 'Feed de Inteligência — aba TV com player de vídeo e timeline de citações' },

    /* ── ATO 4: INTELIGÊNCIA ── */
    // 9. Análise de Menção [MOCKUP — substituir por print do painel Detalhes da Menção]
    { component: AnimMentionDetail, type: 'feature', mockup: 'Detalhes da Menção — Alvos Detectados, Análise por Citado, Análise de Risco' },

    /* ── ATO 5: FRENTE OCULTA ── */
    // 10. Impacto — WhatsApp como diferencial
    {
        component: () => <ImpactSlide
            line1="Existe uma frente de batalha"
            line2="que nenhum concorrente monitora."
            accent={T.success}
        />, type: 'impact'
    },

    // 11. WhatsApp Intelligence [MOCKUP — funcionalidade em desenvolvimento]
    { component: SlideWhatsApp, type: 'feature', mockup: 'Monitoramento WhatsApp — grupos, alertas de mobilização (em desenvolvimento)' },

    /* ── ATO 6: AMEAÇAS ── */
    // 12. Radar de Ameaças [MOCKUP — substituir por print da tela Radar de Ameaças]
    { component: SimThreats, type: 'feature', mockup: 'Radar de Ameaças — perfis ranqueados e entidades mais atacadas' },

    /* ── ATO 7: RESPOSTA ── */
    // 13. Impacto — transição para resposta
    {
        component: () => <ImpactSlide
            line1="Detectar é metade do caminho."
            line2="Responder com estratégia é o que vence."
            accent={T.danger}
        />, type: 'impact'
    },

    // 14. Gestão de Crises [MOCKUP — substituir por print da Gestão de Crises com Plano de Resposta IA]
    { component: AnimCrisis, type: 'feature', mockup: 'Gestão de Crises — 3 passos: Origem, Insight IA, Plano de Resposta + Dossiê' },

    /* ── ATO 8: FECHAMENTO ── */
    // 15. Cenários Estratégicos
    { component: SlideScenarios, type: 'feature' },

    // 16. Fechamento
    { component: SlideClose, type: 'close' },
];

export const Apresentacao: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const total = SLIDES.length;

    const goTo = useCallback((idx: number) => {
        if (idx >= 0 && idx < total && idx !== current) setCurrent(idx);
    }, [current, total]);

    const next = useCallback(() => goTo(current + 1), [goTo, current]);
    const prev = useCallback(() => goTo(current - 1), [goTo, current]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [next, prev]);

    return (
        <div style={{ position: 'fixed', inset: 0, background: T.bg, overflow: 'hidden', fontFamily: T.font }}>
            <style>{GLOBAL_STYLES}</style>

            {SLIDES.map(({ component: Slide }, i) => (
                <div key={i} style={{
                    ...css.slide,
                    ...(i === current ? css.visible : i < current ? css.exited : css.hidden),
                }}>
                    <Slide />
                </div>
            ))}

            {/* Navigation */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                padding: '20px 24px', gap: 16,
                background: 'linear-gradient(transparent, rgba(15,23,42,0.97))',
            }}>
                <button onClick={prev} disabled={current === 0} style={{
                    background: current === 0 ? 'transparent' : T.surface, border: `1px solid ${current === 0 ? 'transparent' : T.border}`,
                    borderRadius: 8, padding: 8, cursor: current === 0 ? 'default' : 'pointer', display: 'flex',
                }}>
                    <IconChevronLeft size={16} color={current === 0 ? T.dim : T.muted} />
                </button>

                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {SLIDES.map((s, i) => (
                        <button key={i} onClick={() => goTo(i)} style={{
                            width: i === current ? 24 : s.type === 'impact' ? 4 : 7,
                            height: s.type === 'impact' ? 4 : 7,
                            borderRadius: 4, border: 'none',
                            background: i === current ? T.primary : s.type === 'impact' ? `${T.accent}40` : T.surfaceLight,
                            cursor: 'pointer', transition: 'all 0.3s ease',
                        }} />
                    ))}
                </div>

                <button onClick={next} disabled={current === total - 1} style={{
                    background: current === total - 1 ? 'transparent' : T.surface, border: `1px solid ${current === total - 1 ? 'transparent' : T.border}`,
                    borderRadius: 8, padding: 8, cursor: current === total - 1 ? 'default' : 'pointer', display: 'flex',
                }}>
                    <IconChevronRight size={16} color={current === total - 1 ? T.dim : T.muted} />
                </button>

                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.dim, marginLeft: 8 }}>
                    {current + 1} / {total}
                </span>
            </div>
        </div>
    );
};

export default Apresentacao;
