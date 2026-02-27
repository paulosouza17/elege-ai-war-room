import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Siren, Save, RefreshCw, AlertTriangle } from 'lucide-react';

interface CrisisParameter {
    id: string;
    category: string;
    parameter_key: string;
    value: any;
    description: string;
}

export const CrisisParameters: React.FC = () => {
    const [parameters, setParameters] = useState<CrisisParameter[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchParameters();
    }, []);

    const fetchParameters = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('crisis_parameters')
                .select('*')
                .order('category', { ascending: true });

            if (error) {
                // If table doesn't exist yet (migration not run), we might get code 42P01
                if (error.code === '42P01') {
                    setError('Tabela de parâmetros não encontrada. Por favor, execute a migração SQL.');
                } else {
                    throw error;
                }
            } else {
                setParameters(data || []);
            }
        } catch (err: any) {
            console.error('Error fetching parameters:', err);
            setError(err.message || 'Erro desconhecido ao carregar parâmetros.');
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (id: string, newValue: string) => {
        setParameters(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, value: newValue };
            }
            return p;
        }));
    };

    const handleSave = async (id: string, newValue: any) => {
        setSaving(true);
        try {
            // Try to parse if it's JSON/Number, but for simplicity store as text in state and let DB cast or UI handle
            // The DB column is JSONB. So we need to ensure valid JSON if it's an object/array,
            // or just a raw value if it's a primitive.
            // For the inputs we have (thresholds), they are numbers mostly.

            let valueToSave = newValue;
            if (!isNaN(Number(newValue))) {
                valueToSave = Number(newValue);
            }

            const { error } = await supabase
                .from('crisis_parameters')
                .update({ value: valueToSave })
                .eq('id', id);

            if (error) throw error;

            // Show success (could be a toast, for now just no error)
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-slate-500 text-center py-8">Carregando parâmetros...</div>;

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Configuração Necessária</h3>
                <p className="text-slate-300 mb-4">{error}</p>
                <button
                    onClick={fetchParameters}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white flex items-center gap-2 mx-auto"
                >
                    <RefreshCw className="w-4 h-4" /> Tentar Novamente
                </button>
            </div>
        );
    }

    // Group by category
    const groupedParams = parameters.reduce((acc, param) => {
        if (!acc[param.category]) acc[param.category] = [];
        acc[param.category].push(param);
        return acc;
    }, {} as Record<string, CrisisParameter[]>);

    return (
        <div className="space-y-6">
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Siren className="w-6 h-6 text-red-500" />
                    Calibração de Crise
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                    Ajuste os limiares que disparam alertas de crise e "spikes" no sistema de inteligência.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(groupedParams).map(([category, params]) => (
                    <div key={category} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-slate-300 capitalize mb-4 border-b border-slate-800 pb-2">
                            {category === 'response' ? 'Resposta' :
                                category === 'volume' ? 'Volume & Velocidade' :
                                    category === 'sentiment' ? 'Sentimento' : category}
                        </h3>

                        <div className="space-y-4">
                            {params.map(param => (
                                <div key={param.id}>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        {param.parameter_key.replace(/_/g, ' ')}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={param.value}
                                                onChange={(e) => handleValueChange(param.id, e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleSave(param.id, param.value)}
                                            disabled={saving}
                                            className="px-3 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-white transition-colors"
                                            title="Salvar"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                        {param.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
