import { useState, useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════
   useCountUp — Anima um número de 0 até target
   ═══════════════════════════════════════════ */
export const useCountUp = (target: number, duration = 1800, startDelay = 300): number => {
    const [value, setValue] = useState(0);
    const started = useRef(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (started.current) return;
            started.current = true;
            const startTime = performance.now();
            const step = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // easeOutExpo
                const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                setValue(Math.round(eased * target));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, startDelay);
        return () => clearTimeout(timeout);
    }, [target, duration, startDelay]);

    return value;
};

/* ═══════════════════════════════════════════
   useFormattedCountUp — Count-up com sufixo (k, M)
   ═══════════════════════════════════════════ */
export const useFormattedCountUp = (display: string, duration = 1800, startDelay = 300): string => {
    // Parse "916", "30.5K", "75.0K", "+222", "2.8K"
    const cleaned = display.replace(/[+,]/g, '');
    const match = cleaned.match(/^([\d.]+)\s*(k|m|K|M)?$/i);
    if (!match) return display; // can't parse, return as-is

    const num = parseFloat(match[1]);
    const suffix = match[2] || '';
    const isFloat = match[1].includes('.');
    const animated = useCountUp(isFloat ? Math.round(num * 10) : Math.round(num), duration, startDelay);

    const prefix = display.startsWith('+') ? '+' : '';
    if (isFloat) {
        return `${prefix}${(animated / 10).toFixed(1)}${suffix}`;
    }
    return `${prefix}${animated}${suffix}`;
};

/* ═══════════════════════════════════════════
   useRotatingIndex — Cicla entre 0..count-1
   ═══════════════════════════════════════════ */
export const useRotatingIndex = (count: number, intervalMs = 5000, active = true): number => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (!active) { setIndex(0); return; }
        const timer = setInterval(() => setIndex(i => (i + 1) % count), intervalMs);
        return () => clearInterval(timer);
    }, [count, intervalMs, active]);
    return index;
};

/* ═══════════════════════════════════════════
   useStaggeredVisible — Revela items 1 por 1
   ═══════════════════════════════════════════ */
export const useStaggeredVisible = (total: number, staggerMs = 200, startDelay = 100): boolean[] => {
    const [visible, setVisible] = useState<boolean[]>(new Array(total).fill(false));
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        for (let i = 0; i < total; i++) {
            timers.push(setTimeout(() => {
                setVisible(prev => { const next = [...prev]; next[i] = true; return next; });
            }, startDelay + i * staggerMs));
        }
        return () => timers.forEach(clearTimeout);
    }, [total, staggerMs, startDelay]);
    return visible;
};

/* ═══════════════════════════════════════════
   useProgressBar — Anima width de 0% até target%
   ═══════════════════════════════════════════ */
export const useProgressBar = (targetPercent: number, duration = 1200, startDelay = 600): number => {
    return useCountUp(targetPercent, duration, startDelay);
};
