import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag, Loader2, Cloud } from 'lucide-react';

// wordcloud2.js — canvas-based interactive word cloud
// @ts-ignore
import WordCloud from 'wordcloud';

interface WordItem {
    text: string;
    value: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
}

export const WordCloudChart: React.FC<{ activationId?: string; activationIds?: string[]; onWordClick?: (word: string) => void }> = ({ activationId, activationIds, onWordClick }) => {
    const [keywords, setKeywords] = useState<WordItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState<{ text: string; count: number; x: number; y: number } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchKeywords = async () => {
            try {
                // Determine which activation IDs to filter by
                const filterIds = activationId ? [activationId] : (activationIds || []);

                // If no activations to filter by, show empty
                if (filterIds.length === 0) {
                    setKeywords([]);
                    return;
                }

                let query = supabase
                    .from('intelligence_feed')
                    .select('keywords, sentiment')
                    .not('keywords', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (filterIds.length === 1) {
                    query = query.eq('activation_id', filterIds[0]);
                } else {
                    query = query.in('activation_id', filterIds);
                }

                const { data, error } = await query;

                if (error) throw error;
                if (!data) return;

                // Aggregate keyword counts + track sentiment
                const counts: Record<string, { count: number; sentiments: Record<string, number> }> = {};
                data.forEach((row: any) => {
                    if (Array.isArray(row.keywords)) {
                        row.keywords.forEach((word: string) => {
                            const clean = word.trim().toLowerCase();
                            if (!clean || clean.length < 2) return;
                            if (!counts[clean]) counts[clean] = { count: 0, sentiments: {} };
                            counts[clean].count += 1;
                            const s = row.sentiment || 'neutral';
                            counts[clean].sentiments[s] = (counts[clean].sentiments[s] || 0) + 1;
                        });
                    }
                });

                // Determine dominant sentiment per keyword
                const sorted = Object.entries(counts)
                    .map(([text, { count, sentiments }]) => {
                        const dominant = Object.entries(sentiments).sort((a, b) => b[1] - a[1])[0];
                        return {
                            text,
                            value: count,
                            sentiment: (dominant?.[0] || 'neutral') as WordItem['sentiment'],
                        };
                    })
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 50);

                setKeywords(sorted);
            } catch (err) {
                console.error('Error fetching word cloud data:', err);
            } finally {
                setLoading(false);
            }
        };

        setLoading(true);
        fetchKeywords();
    }, [activationId, activationIds]);

    const getSentimentColor = useCallback((sentiment?: string): string => {
        switch (sentiment) {
            case 'positive': return '#22c55e';
            case 'negative': return '#ef4444';
            default: return '#94a3b8';
        }
    }, []);

    // Render word cloud with wordcloud2.js
    useEffect(() => {
        if (!canvasRef.current || keywords.length === 0) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!container) return;

        // Size canvas to container
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const maxVal = Math.max(...keywords.map(k => k.value));
        const minSize = 10;
        const maxSize = Math.min(rect.width / 8, 48);

        // Build [word, size] list with color mapping
        const list: [string, number][] = keywords.map(k => {
            const normalized = k.value / maxVal;
            const size = minSize + normalized * (maxSize - minSize);
            return [k.text, size];
        });

        // Color function: each word gets its sentiment color
        const colorMap = new Map(keywords.map(k => [k.text, getSentimentColor(k.sentiment)]));

        // Clear canvas before rendering
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        try {
            WordCloud(canvas, {
                list,
                gridSize: Math.round(8 * (rect.width / 600)),
                weightFactor: 1,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: (word: string) => colorMap.get(word.toLowerCase()) || '#94a3b8',
                rotateRatio: 0.3,
                rotationSteps: 2,
                backgroundColor: 'transparent',
                drawOutOfBound: false,
                shrinkToFit: true,
                hover: (item: any, _dimension: any, event: MouseEvent) => {
                    if (item) {
                        const kw = keywords.find(k => k.text === item[0].toLowerCase());
                        setTooltip({
                            text: item[0],
                            count: kw?.value || 0,
                            x: event.offsetX,
                            y: event.offsetY,
                        });
                        canvas.style.cursor = 'pointer';
                    } else {
                        setTooltip(null);
                        canvas.style.cursor = 'default';
                    }
                },
                click: (item: any) => {
                    if (item && onWordClick) {
                        onWordClick(item[0]);
                    }
                },
            });
        } catch (err) {
            console.error('WordCloud render error:', err);
        }
    }, [keywords, getSentimentColor, onWordClick]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 h-full">
                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
        );
    }

    if (keywords.length === 0) {
        return (
            <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center h-full flex flex-col items-center justify-center">
                <Cloud className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nenhum tópico identificado ainda.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 backdrop-blur-sm p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Nuvem de Assuntos
                <span className="ml-auto text-[10px] font-normal text-slate-600 normal-case tracking-normal">
                    {keywords.length} termos • Top 50
                </span>
            </h3>

            <div ref={containerRef} className="flex-1 relative min-h-[200px]">
                <canvas ref={canvasRef} className="w-full h-full" />

                {/* Tooltip */}
                {tooltip && (
                    <div
                        className="absolute z-10 pointer-events-none px-3 py-1.5 bg-slate-800/95 border border-slate-600 rounded-lg shadow-xl backdrop-blur-sm"
                        style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
                    >
                        <span className="text-white text-sm font-semibold">{tooltip.text}</span>
                        <span className="text-slate-400 text-xs ml-2">{tooltip.count}×</span>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Positivo
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> Neutro
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Negativo
                </span>
            </div>
        </div>
    );
};
