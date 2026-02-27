import React, { useEffect, useState } from 'react';
import { Bot, Key, Save, Trash2, Plus, BrainCircuit } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AIConfig {
    id: string;
    provider: 'openai' | 'gemini';
    model: string;
    api_key: string;
    is_active: boolean;
}

export const AISettings: React.FC = () => {
    const [configs, setConfigs] = useState<AIConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
    const [model, setModel] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [testing, setTesting] = useState(false);

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            const response = await fetch('http://localhost:3000/api/v1/ai/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, apiKey, model })
            });
            const data = await response.json();

            if (data.success) {
                alert('✅ Conexão bem-sucedida! A IA respondeu corretamente.');
            } else {
                alert(`❌ Falha na conexão: ${data.message}`);
            }
        } catch (error: any) {
            alert(`❌ Erro ao testar: ${error.message}`);
        } finally {
            setTesting(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        // Assuming we have a logged in user with a client_id link or just fetching all for admin
        // For MVP, we fetch all. In production, filter by org/client.
        const { data, error } = await supabase.from('ai_configs').select('*');
        if (error) console.error('Error fetching configs:', error);
        else setConfigs(data as AIConfig[]);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mock Client ID for demo
        const demoClientId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

        const { error } = await supabase.from('ai_configs').insert({
            client_id: demoClientId,
            provider,
            model,
            api_key: apiKey,
            is_active: true
        });

        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            setShowForm(false);
            setProvider('openai');
            setModel('');
            setApiKey('');
            fetchConfigs();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta configuração?')) return;
        const { error } = await supabase.from('ai_configs').delete().eq('id', id);
        if (error) alert('Erro ao deletar');
        else fetchConfigs();
    };

    return (
        <div className="p-8 space-y-6">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BrainCircuit className="w-8 h-8 text-secondary" />
                        Modelos de IA
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Gerencie os provedores e chaves de API para geração de insights.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/50 px-4 py-2 rounded-md transition-colors"
                >
                    <Plus className="w-4 h-4" /> Adicionar Modelo
                </button>
            </header>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configs.map(config => (
                    <div key={config.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 relative group hover:border-secondary/50 transition-colors">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDelete(config.id)} className="text-red-400 hover:text-red-300 p-1">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-full ${config.provider === 'openai' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                <Bot className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white capitalize">{config.provider}</h3>
                                <div className="text-xs text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded mt-1 inline-block">
                                    {config.model}
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-slate-500 flex items-center gap-2">
                            <Key className="w-3 h-3" />
                            <span className="font-mono">••••••••••••••••</span>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${config.is_active ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                            <span className="text-xs text-slate-400">{config.is_active ? 'Ativo' : 'Inativo'}</span>
                        </div>
                    </div>
                ))}

                {configs.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        Nenhum modelo configurado. Adicione um para começar a usar a IA.
                    </div>
                )}
            </div>

            {/* Modal / Inline Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleSave} className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-6">Novo Modelo de IA</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Provedor</label>
                                <select
                                    value={provider}
                                    onChange={(e: any) => setProvider(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-secondary"
                                >
                                    <option value="openai">OpenAI</option>
                                    <option value="gemini">Google Gemini</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Modelo</label>
                                <select
                                    value={model}
                                    onChange={e => setModel(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-secondary"
                                    required
                                >
                                    <option value="" disabled>Selecione um modelo</option>
                                    {provider === 'openai' ? (
                                        <>
                                            <optgroup label="Flagship (Mais inteligentes)">
                                                <option value="gpt-4o">GPT-4o</option>
                                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                            </optgroup>
                                            <optgroup label="Reasoning (Raciocínio Avançado)">
                                                <option value="o1-preview">o1-preview</option>
                                                <option value="o1-mini">o1-mini</option>
                                            </optgroup>
                                            <optgroup label="Fast & Efficient (Econômicos)">
                                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                            </optgroup>
                                        </>
                                    ) : (
                                        <>
                                            <optgroup label="Google 2.0 Series (New)">
                                                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
                                            </optgroup>
                                            <optgroup label="Google 2.5 Series (Preview)">
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                            </optgroup>
                                            <optgroup label="Legacy">
                                                <option value="gemini-pro">Gemini 1.0 Pro</option>
                                            </optgroup>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white outline-none focus:border-secondary"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between gap-3">
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testing || !apiKey || !provider}
                                className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${testing ? 'bg-slate-700 text-slate-400' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/50'}`}
                            >
                                {testing ? 'Testando...' : <><BrainCircuit className="w-4 h-4" /> Testar Conexão</>}
                            </button>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Salvar Configuração
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
