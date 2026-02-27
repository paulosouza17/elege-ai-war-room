import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, Hash, Users, AlertTriangle, Search } from 'lucide-react';
import { useUserActivations } from '@/hooks/useUserActivations';

interface AlvoItem {
    name: string;
    type: 'person' | 'keyword';
    activations: string[];
}

export const AlvosMonitorados: React.FC = () => {
    const [alvos, setAlvos] = useState<AlvoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasApproved, setHasApproved] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { activationIds, loading: activationsLoading } = useUserActivations();

    // Re-fetch when activations resolve
    useEffect(() => {
        if (activationsLoading) return;
        fetchAlvos();
    }, [activationIds, activationsLoading]);

    const fetchAlvos = async () => {
        if (activationsLoading) return;

        // No activations = no access
        if (activationIds.length === 0) {
            setHasApproved(false);
            setAlvos([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data } = await supabase
                .from('activations')
                .select('id, name, keywords, people_of_interest, status')
                .eq('status', 'active')
                .in('id', activationIds);

            const allActivations = data || [];

            if (allActivations.length === 0) {
                setHasApproved(false);
                setAlvos([]);
                setLoading(false);
                return;
            }

            setHasApproved(true);

            const peopleMap = new Map<string, Set<string>>();
            const keywordMap = new Map<string, Set<string>>();

            allActivations.forEach(activation => {
                const activationLabel = activation.name || 'Ativação';
                (activation.people_of_interest || []).forEach((p: string) => {
                    const key = p.toLowerCase();
                    if (!peopleMap.has(key)) peopleMap.set(key, new Set());
                    peopleMap.get(key)!.add(activationLabel);
                });
                (activation.keywords || []).forEach((kw: string) => {
                    const key = kw.toLowerCase();
                    if (!keywordMap.has(key)) keywordMap.set(key, new Set());
                    keywordMap.get(key)!.add(activationLabel);
                });
            });

            const items: AlvoItem[] = [];
            peopleMap.forEach((activationNames, key) => {
                const originalName = allActivations.flatMap(a => a.people_of_interest || []).find((p: string) => p.toLowerCase() === key) || key;
                items.push({ name: originalName, type: 'person', activations: Array.from(activationNames) });
            });
            keywordMap.forEach((activationNames, key) => {
                const originalKw = allActivations.flatMap(a => a.keywords || []).find((kw: string) => kw.toLowerCase() === key) || key;
                items.push({ name: originalKw, type: 'keyword', activations: Array.from(activationNames) });
            });

            items.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
            setAlvos(items);
        } catch (error) {
            console.error('[AlvosMonitorados] Error fetching alvos:', error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = alvos.filter(a => {
        if (!searchQuery) return true;
        return a.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const people = filtered.filter(a => a.type === 'person');
    const keywords = filtered.filter(a => a.type === 'keyword');

    if (loading || activationsLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500">
                Carregando alvos monitorados...
            </div>
        );
    }

    if (!hasApproved) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Target className="w-6 h-6 text-red-400" />
                        Alvos Monitorados
                    </h1>
                    <p className="text-slate-400 mt-1">Pessoas e termos vinculados às suas ativações aprovadas.</p>
                </div>
                <div className="border border-dashed border-slate-700 rounded-xl p-12 text-center">
                    <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-400 mb-1">Nenhuma ativação aprovada</h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                        Seus alvos monitorados aparecerão aqui quando uma ativação sua for aprovada pelo administrador. Crie uma ativação em <strong className="text-slate-400">Ativações → Nova Ativação</strong>.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Target className="w-6 h-6 text-red-400" />
                    Alvos Monitorados
                </h1>
                <p className="text-slate-400 mt-1">
                    Pessoas e termos vinculados às suas ativações aprovadas. Total: <strong className="text-white">{alvos.length}</strong> alvo(s).
                </p>
            </div>

            {alvos.length > 5 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        placeholder="Buscar alvos..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            )}

            {people.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        Pessoas / Entidades ({people.length})
                    </h2>
                    <div className="rounded-lg border border-red-500/20 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-red-500/5">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-red-400/70 font-medium text-xs">Nome</th>
                                    <th className="text-left px-4 py-2.5 text-red-400/70 font-medium text-xs">Ativação(ões)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-500/10">
                                {people.map(person => (
                                    <tr key={person.name} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] bg-blue-500/20 text-blue-400 ring-2 ring-red-500/30 shrink-0">
                                                    {person.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-white font-medium">{person.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {person.activations.map(act => (
                                                    <span key={act} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{act}</span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {keywords.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Hash className="w-4 h-4 text-amber-400" />
                        Palavras-chave ({keywords.length})
                    </h2>
                    <div className="rounded-lg border border-red-500/20 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-red-500/5">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-red-400/70 font-medium text-xs">Termo</th>
                                    <th className="text-left px-4 py-2.5 text-red-400/70 font-medium text-xs">Ativação(ões)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-500/10">
                                {keywords.map(kw => (
                                    <tr key={kw.name} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-3.5 h-3.5 text-amber-400/50 shrink-0" />
                                                <span className="text-white font-medium">{kw.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {kw.activations.map(act => (
                                                    <span key={act} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{act}</span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {filtered.length === 0 && searchQuery && (
                <div className="py-8 text-center text-slate-500 text-sm">Nenhum alvo encontrado para "{searchQuery}".</div>
            )}
        </div>
    );
};
