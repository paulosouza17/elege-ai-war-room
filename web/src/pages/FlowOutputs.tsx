import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUserActivations } from '../hooks/useUserActivations';
import {
    Clock,
    RefreshCw,
    Sparkles,
    FileText,
    ArrowRight,
    Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeedEntry {
    id: string;
    title: string;
    category: 'positive' | 'negative' | 'neutral';
    content: string;
    source: string;
    input_type: string;
    created_at: string;
    demand_id: string | null;
    activation_id: string | null;
    meta: {
        flowNodeId?: string;
        sourceNodes?: string[];
        template?: string;
        [key: string]: any;
    };
}

export const FlowOutputs: React.FC = () => {
    const [entries, setEntries] = useState<FeedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, flow_automation, manual
    const { activationIds, loading: activationsLoading } = useUserActivations();

    useEffect(() => {
        if (!activationsLoading) fetchEntries();
    }, [filter, activationIds, activationsLoading]);

    const fetchEntries = async () => {
        if (activationIds.length === 0 && !activationsLoading) {
            setEntries([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        let query = supabase
            .from('intelligence_feed')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        // Filter by user's accessible activation IDs
        if (activationIds.length === 1) {
            query = query.eq('activation_id', activationIds[0]);
        } else if (activationIds.length > 1) {
            query = query.in('activation_id', activationIds);
        }

        if (filter === 'flow_automation') {
            // Only entries from flows (have flowNodeId in meta)
            query = query.not('meta->flowNodeId', 'is', null);
        } else if (filter === 'manual') {
            query = query.is('meta->flowNodeId', null);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching feed entries:', error);
        } else {
            setEntries(data as FeedEntry[]);
        }
        setLoading(false);
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'positive':
                return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'negative':
                return 'text-red-500 bg-red-500/10 border-red-500/20';
            default:
                return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-950">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="p-8 pb-4 flex justify-between items-center border-b border-slate-800 bg-slate-950/50 backdrop-blur z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-primary" />
                            Saída de Flows
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Resultados processados de automações ({entries.length} entradas)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => fetchEntries()} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-md border border-slate-800 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                {/* Filters */}
                <div className="px-8 py-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'Todas', icon: <Filter className="w-4 h-4" /> },
                        { id: 'flow_automation', label: 'De Flows', icon: <Sparkles className="w-4 h-4" /> },
                        { id: 'manual', label: 'Manuais', icon: <FileText className="w-4 h-4" /> }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === f.id
                                ? 'bg-primary/20 text-primary border border-primary/20'
                                : 'text-slate-400 border border-transparent hover:bg-slate-900 hover:text-white'
                                }`}
                        >
                            {f.icon}
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-3 pb-24">
                    {entries.length === 0 && !loading && (
                        <div className="text-center py-20 opacity-50">
                            <div className="bg-slate-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-white font-medium text-lg">Nenhuma saída ainda</h3>
                            <p className="text-slate-500">Execute flows para ver os resultados aqui.</p>
                        </div>
                    )}

                    {entries.map((entry) => (
                        <article
                            key={entry.id}
                            className="relative bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary/30 hover:bg-slate-900 transition-all group"
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-medium text-slate-400">
                                            {entry.meta?.flowNodeId ? (
                                                <>
                                                    <Sparkles className="w-3 h-3" />
                                                    Flow Automation
                                                </>
                                            ) : (
                                                <>
                                                    <FileText className="w-3 h-3" />
                                                    {entry.source || 'Manual'}
                                                </>
                                            )}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </div>

                                    <h3 className="text-slate-200 font-semibold leading-relaxed">
                                        {entry.title}
                                    </h3>

                                    {entry.content && (
                                        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                                            {typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content)}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 pt-1">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getCategoryColor(entry.category)}`}>
                                            {entry.category}
                                        </span>
                                        {entry.meta?.flowNodeId && (
                                            <span className="text-xs text-slate-600 font-mono">
                                                Node: {entry.meta.flowNodeId}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {entry.meta?.flowNodeId && (
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-primary/20 bg-primary/10">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                            </div>

                            {/* Metadata footer */}
                            {entry.meta && Object.keys(entry.meta).length > 0 && (
                                <details className="mt-4 text-xs">
                                    <summary className="text-slate-500 cursor-pointer hover:text-slate-400 flex items-center gap-2">
                                        Ver metadados <ArrowRight className="w-3 h-3" />
                                    </summary>
                                    <pre className="mt-2 p-3 bg-slate-950 rounded border border-slate-800 text-slate-400 overflow-x-auto">
                                        {JSON.stringify(entry.meta, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
};
