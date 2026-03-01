import React, { useState, useCallback, useEffect } from 'react';
import { T, GLOBAL_STYLES, IconChevronLeft, IconChevronRight } from './apresentacao/icons';
import {
    SlideCover, SlideEvolution, SimDashboard, SimFeedTV,
    SimMentionDetail, SimCrisis, SimFeedSocial, SimThreats,
    SlideWhatsApp, SlideScenarios, SlideClose,
} from './apresentacao/slides';

/* ═══════════════════════════════════════════════════════
   Elege.AI — Apresentação Estratégica v2
   Layout lateralizado · SVG icons animados · CSS sims
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

const SLIDES = [
    SlideCover,        // 1. Capa
    SlideEvolution,    // 2. Evolução 2023-2025
    SimDashboard,      // 3. Centro de Comando (Dashboard)
    SimFeedTV,         // 4. Monitoramento TV/Rádio (player, timeline, recorte)
    SimMentionDetail,  // 5. Análise de Menção (Alvos, Citado, Risco)
    SimCrisis,         // 6. Gestão de Crises (plano de resposta, riscos IA)
    SimFeedSocial,     // 7. Inteligência Redes Sociais (Twitter/X modal)
    SimThreats,        // 8. Radar de Ameaças
    SlideWhatsApp,     // 9. WhatsApp Intelligence
    SlideScenarios,    // 10. Cenários Estratégicos
    SlideClose,        // 11. Fechamento
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

            {SLIDES.map((Slide, i) => (
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

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {SLIDES.map((_, i) => (
                        <button key={i} onClick={() => goTo(i)} style={{
                            width: i === current ? 28 : 8, height: 8, borderRadius: 4, border: 'none',
                            background: i === current ? T.primary : `${T.surfaceLight}`,
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
