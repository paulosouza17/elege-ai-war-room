import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Zap, ArrowLeft, Save, PlusCircle, Trash2, Users, BookUser, Search, MessageSquareText, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';

interface RegisteredEntity {
    id: string;
    name: string;
    type: string;
    aliases: string[];
    description: string;
}

export const ActivationWizard: React.FC = () => {
    const navigate = useNavigate();
    const { id: editId } = useParams<{ id?: string }>();
    const isEditMode = Boolean(editId);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '', // Briefing
        category: 'Política / Eleitoral',
        priority: 'Normal',
        keywords: [] as string[],
        people: [] as string[],
        sources: [] as string[],
        flow_id: '',
        analysis_instructions: '',

        newKeyword: '',
        newPerson: ''
    });
    const [flows, setFlows] = useState<any[]>([]);

    // Entity autocomplete
    const [registeredEntities, setRegisteredEntities] = useState<RegisteredEntity[]>([]);
    const [entitySuggestions, setEntitySuggestions] = useState<RegisteredEntity[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Keyword autocomplete
    const [systemKeywords, setSystemKeywords] = useState<string[]>([]);
    const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
    const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
    const keywordSuggestionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchFlows();
        fetchEntities();
        fetchSystemKeywords();
        if (editId) loadActivation(editId);

        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
            if (keywordSuggestionsRef.current && !keywordSuggestionsRef.current.contains(e.target as Node)) {
                setShowKeywordSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editId]);

    const fetchFlows = async () => {
        try {
            const { data, error } = await supabase
                .from('flows')
                .select('id, name')
                .eq('active', true);

            if (error) throw error;
            setFlows(data || []);
        } catch (error) {
            console.error('Error fetching flows:', error);
        }
    };

    const fetchEntities = async () => {
        try {
            const { data } = await supabase
                .from('monitored_entities')
                .select('id, name, type, aliases, description')
                .order('name');
            setRegisteredEntities(data || []);
        } catch (error) {
            console.error('Error fetching entities:', error);
        }
    };

    const fetchSystemKeywords = async () => {
        try {
            const { data } = await supabase
                .from('system_keywords')
                .select('keyword')
                .order('keyword');
            if (data) {
                setSystemKeywords(data.map(row => row.keyword));
            }
        } catch (error) {
            console.error('Error fetching system keywords:', error);
        }
    };

    const loadActivation = async (id: string) => {
        try {
            const { data, error } = await supabase.from('activations').select('*').eq('id', id).single();
            if (error) throw error;
            if (data) {
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    category: data.category || 'Política / Eleitoral',
                    priority: data.priority || 'Normal',
                    keywords: data.keywords || [],
                    people: data.people_of_interest || [],
                    sources: data.sources_config?.selected || [],
                    flow_id: data.flow_id || '',
                    analysis_instructions: data.analysis_instructions || '',

                    newKeyword: '',
                    newPerson: ''
                });
            }
        } catch (error) {
            console.error('Error loading activation:', error);
        }
    };

    const handleAddKeyword = (kw?: string) => {
        const keyword = (kw || formData.newKeyword).trim();
        if (keyword && !formData.keywords.includes(keyword)) {
            setFormData(prev => ({
                ...prev,
                keywords: [...prev.keywords, keyword],
                newKeyword: ''
            }));
        }
        setShowKeywordSuggestions(false);
    };

    const handleKeywordInputChange = (value: string) => {
        setFormData(prev => ({ ...prev, newKeyword: value }));
        if (value.trim().length > 0) {
            const q = value.toLowerCase();
            const matches = systemKeywords
                .filter(kw => !formData.keywords.includes(kw) && kw.toLowerCase().includes(q))
                .slice(0, 8);
            setKeywordSuggestions(matches);
            setShowKeywordSuggestions(matches.length > 0);
        } else {
            setShowKeywordSuggestions(false);
        }
    };

    const handleAddPerson = () => {
        if (formData.newPerson.trim()) {
            const name = formData.newPerson.trim();
            if (!formData.people.includes(name)) {
                setFormData(prev => ({
                    ...prev,
                    people: [...prev.people, name],
                    newPerson: ''
                }));
            }
            setShowSuggestions(false);
        }
    };

    const handleSelectEntity = (entity: RegisteredEntity) => {
        if (!formData.people.includes(entity.name)) {
            setFormData(prev => ({
                ...prev,
                people: [...prev.people, entity.name],
                newPerson: ''
            }));
        }
        setShowSuggestions(false);
    };

    const handlePersonInputChange = (value: string) => {
        setFormData(prev => ({ ...prev, newPerson: value }));
        if (value.trim().length > 0) {
            const q = value.toLowerCase();
            const matches = registeredEntities.filter(e =>
                !formData.people.includes(e.name) && (
                    e.name.toLowerCase().includes(q) ||
                    e.aliases?.some(a => a.toLowerCase().includes(q))
                )
            ).slice(0, 8);
            setEntitySuggestions(matches);
            setShowSuggestions(matches.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleRemovePerson = (person: string) => {
        setFormData(prev => ({
            ...prev,
            people: prev.people.filter(p => p !== person)
        }));
    };

    const handleRemoveKeyword = (kw: string) => {
        setFormData(prev => ({
            ...prev,
            keywords: prev.keywords.filter(k => k !== kw)
        }));
    };

    const handleSave = async () => {
        if (!formData.name) {
            alert('Por favor, informe o nome da ativação.');
            return;
        }
        if (formData.keywords.length < 3) {
            alert('Adicione pelo menos 3 palavras-chave.');
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const activationData = {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                priority: formData.priority.toLowerCase(),
                keywords: formData.keywords,
                people_of_interest: formData.people,
                sources_config: { selected: formData.sources },
                flow_id: formData.flow_id || null,
                analysis_instructions: formData.analysis_instructions || null,
                ...(isEditMode ? {} : {
                    status: 'pending',
                    created_by: user.id,
                    insight_preview: {
                        estimated_volume: 'Calculando...',
                        complexity_score: 50,
                        recommended_sources: ['Twitter', 'News']
                    }
                })
            };

            let result;
            if (isEditMode && editId) {
                result = await supabase.from('activations').update(activationData).eq('id', editId).select();
            } else {
                result = await supabase.from('activations').insert(activationData).select();
            }

            if (result.error) throw result.error;

            alert(isEditMode ? 'Ativação atualizada!' : 'Ativação criada com sucesso!');
            navigate(isEditMode ? `/activations/${editId}` : '/activations');
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate('/activations')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Lista
            </Button>

            <div className="space-y-2 mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Zap className="w-8 h-8 text-primary" />
                    {isEditMode ? 'Editar Ativação' : 'Nova Ativação de Monitoramento'}
                </h1>
                <p className="text-slate-400">
                    {isEditMode ? 'Atualize os parâmetros desta ativação.' : 'Defina o perímetro de um novo assunto para que o sistema inicie a coleta e análise.'}
                </p>
            </div>

            <Card className="border-t-4 border-t-primary">
                <CardHeader>
                    <CardTitle>1. Definição do Assunto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-secondary">Nome da Ativação</label>
                        <Input
                            placeholder="Ex: Campanha de Multivacinação 2026"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-secondary">Briefing / Justificativa</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                            placeholder="Descreva o objetivo desta ativação e o que o Admin deve considerar ao aprovar..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-secondary">Categoria</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>Política / Eleitoral</option>
                                <option>Gestão de Crise</option>
                                <option>Saúde Pública</option>
                                <option>Obras / Infraestrutura</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-secondary">Prioridade Inicial</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option>Normal</option>
                                <option>Alta</option>
                                <option>Crítica (War Room)</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-secondary">Fluxo Automático (Opcional)</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            value={formData.flow_id}
                            onChange={(e) => setFormData({ ...formData, flow_id: e.target.value })}
                        >
                            <option value="">Nenhum fluxo associado</option>
                            {flows.map(flow => (
                                <option key={flow.id} value={flow.id}>{flow.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Selecione um fluxo para execução automática quando a ativação for criada.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Perímetro de Coleta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Palavras-chave */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-white flex justify-between">
                            Palavras-chave (Obrigatório)
                            <span className="text-xs text-slate-500">Mínimo 3</span>
                        </label>
                        <p className="text-xs text-slate-500 -mt-2">
                            Digite para buscar palavras-chave existentes ou adicione novas.
                        </p>
                        <div className="relative" ref={keywordSuggestionsRef}>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Buscar keyword existente ou digitar nova..."
                                    className="flex-1"
                                    value={formData.newKeyword}
                                    onChange={(e) => handleKeywordInputChange(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                                    onFocus={() => {
                                        if (formData.newKeyword.trim().length > 0 && keywordSuggestions.length > 0) {
                                            setShowKeywordSuggestions(true);
                                        }
                                    }}
                                />
                                <Button variant="secondary" size="sm" onClick={() => handleAddKeyword()} className="px-2">
                                    <PlusCircle className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Keyword autocomplete dropdown */}
                            {showKeywordSuggestions && keywordSuggestions.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-12 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                    <div className="px-3 py-1.5 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-800/50 flex items-center gap-1.5">
                                        <Search className="w-3 h-3" /> Keywords do Sistema
                                    </div>
                                    {keywordSuggestions.map(kw => (
                                        <button
                                            key={kw}
                                            className="w-full px-3 py-2 text-left hover:bg-indigo-500/10 transition-colors text-sm text-slate-300 border-b border-slate-800/50 last:border-0"
                                            onClick={() => handleAddKeyword(kw)}
                                        >
                                            {kw}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded border border-slate-700/50 min-h-[50px]">
                            {formData.keywords.map(kw => (
                                <span key={kw} className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-600">
                                    {kw}
                                    <Trash2 className="w-3 h-3 hover:text-danger cursor-pointer ml-1" onClick={() => handleRemoveKeyword(kw)} />
                                </span>
                            ))}
                            {formData.keywords.length === 0 && <span className="text-xs text-slate-600 italic">Nenhuma palavra-chave adicionada.</span>}
                        </div>
                    </div>

                    {/* Pessoas de Interesse - com autocomplete */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-400" />
                            Pessoas de Interesse (Opcional)
                        </label>
                        <p className="text-xs text-slate-500 -mt-2">
                            Digite para buscar nas entidades cadastradas ou adicione manualmente.
                        </p>
                        <div className="relative" ref={suggestionsRef}>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Buscar entidade cadastrada ou digitar nome..."
                                    className="flex-1"
                                    value={formData.newPerson}
                                    onChange={(e) => handlePersonInputChange(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                                    onFocus={() => {
                                        if (formData.newPerson.trim().length > 0 && entitySuggestions.length > 0) {
                                            setShowSuggestions(true);
                                        }
                                    }}
                                />
                                <Button variant="secondary" size="sm" className="px-2" onClick={handleAddPerson}>
                                    <PlusCircle className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Autocomplete dropdown */}
                            {showSuggestions && entitySuggestions.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-12 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                    <div className="px-3 py-1.5 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-800/50 flex items-center gap-1.5">
                                        <BookUser className="w-3 h-3" /> Entidades Cadastradas
                                    </div>
                                    {entitySuggestions.map(entity => (
                                        <button
                                            key={entity.id}
                                            className="w-full px-3 py-2.5 text-left hover:bg-indigo-500/10 transition-colors flex items-center gap-3 border-b border-slate-800/50 last:border-0"
                                            onClick={() => handleSelectEntity(entity)}
                                        >
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${entity.type === 'person' ? 'bg-blue-500/20 text-blue-400' :
                                                entity.type === 'organization' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {entity.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium truncate">{entity.name}</p>
                                                {entity.description && (
                                                    <p className="text-[11px] text-slate-500 truncate">{entity.description}</p>
                                                )}
                                            </div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${entity.type === 'person' ? 'bg-blue-500/10 text-blue-400' :
                                                entity.type === 'organization' ? 'bg-purple-500/10 text-purple-400' :
                                                    'bg-slate-500/10 text-slate-400'
                                                }`}>
                                                {entity.type === 'person' ? 'Pessoa' : entity.type === 'organization' ? 'Org' : entity.type}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded border border-slate-700/50 min-h-[50px]">
                            {formData.people.map(person => {
                                const isRegistered = registeredEntities.some(e => e.name === person);
                                return (
                                    <span key={person} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${isRegistered
                                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                                        : 'bg-slate-800 text-slate-200 border-slate-600'
                                        }`}>
                                        {isRegistered && <BookUser className="w-3 h-3 mr-0.5" />}
                                        {person}
                                        <Trash2 className="w-3 h-3 hover:text-danger cursor-pointer ml-1" onClick={() => handleRemovePerson(person)} />
                                    </span>
                                );
                            })}
                            {formData.people.length === 0 && <span className="text-xs text-slate-600 italic">Nenhuma pessoa adicionada.</span>}
                        </div>
                    </div>

                    {/* Instruções de Análise */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                        <label className="text-sm font-medium text-white flex items-center gap-2">
                            <MessageSquareText className="w-4 h-4 text-amber-400" />
                            Instruções de Análise (Opcional)
                        </label>
                        <p className="text-xs text-slate-500 -mt-2">
                            Direcione como a IA deve analisar os conteúdos encontrados. Clique em uma sugestão ou escreva seu próprio prompt.
                        </p>
                        <textarea
                            className="flex min-h-[90px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-y"
                            placeholder="Ex: Analise o impacto na imagem do candidato sob a perspectiva eleitoral..."
                            value={formData.analysis_instructions}
                            onChange={(e) => setFormData({ ...formData, analysis_instructions: e.target.value })}
                        />
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Sugestões de prompt
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { label: '🗳️ Eleitoral', prompt: 'Analise o impacto deste conteúdo na percepção pública do candidato monitorado. Avalie como a narrativa pode influenciar a intenção de voto, imagem partidária e posicionamento frente aos concorrentes. Classifique se o conteúdo fortalece ou enfraquece a posição eleitoral.' },
                                    { label: '🛡️ Gestão de Crise', prompt: 'Avalie o potencial de crise deste conteúdo. Identifique riscos reputacionais, possíveis desdobramentos negativos e urgência de resposta. Sugira o tom adequado de posicionamento: proativo, reativo ou silêncio estratégico.' },
                                    { label: '📊 Narrativa e Opinião', prompt: 'Analise a narrativa construída neste conteúdo. Identifique o enquadramento editorial (framing), vieses implícitos, e como a narrativa pode moldar a opinião pública sobre os atores envolvidos. Compare com narrativas alternativas possíveis.' },
                                    { label: '🤝 Relações Institucionais', prompt: 'Avalie o impacto deste conteúdo nas relações institucionais e alianças políticas. Identifique movimentações de apoio, oposição ou neutralidade entre os atores citados. Analise implicações para governabilidade e articulação política.' },
                                    { label: '📰 Inteligência de Mídia', prompt: 'Analise o alcance e relevância editorial deste conteúdo. Avalie a credibilidade da fonte, o posicionamento editorial do veículo, e o potencial de repercussão em outras mídias. Identifique se há indícios de pauta coordenada ou cobertura orgânica.' },
                                    { label: '🐦 Twitter / Redes Sociais', prompt: 'Classifique comentários de redes sociais com foco no TOM, INTENÇÃO e EMOJIS. Emojis de bandeira (🇧🇷), expressões como "Presidente", "mito", "melhor", 💪, ❤️, 👏 indicam apoio (positive). Termos como "acusado", "rachadinha", "não vale nada", "lixo", "vagabundo" e emojis 🤡, 💩, 🤮 indicam ataque (negative). DETECTE SARCASMO e IRONIA: "Parabéns, destruiu tudo! 🤡" é NEGATIVO apesar do "parabéns". Xingamentos e gírias ofensivas direcionadas ao alvo são sempre NEGATIVOS. NÃO classifique como neutro textos com carga emocional, emojis, ironia ou opiniões implícitas.' }
                                ].map(suggestion => (
                                    <button
                                        key={suggestion.label}
                                        type="button"
                                        className={`text-xs px-2.5 py-1.5 rounded-md border transition-all duration-200 ${formData.analysis_instructions === suggestion.prompt
                                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600'
                                            }`}
                                        onClick={() => setFormData({ ...formData, analysis_instructions: suggestion.prompt })}
                                    >
                                        {suggestion.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Mídias Monitoradas */}
                    <div className="pt-4 border-t border-slate-800">
                        <h4 className="text-sm font-medium text-white mb-3">Mídias Monitoradas</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <label className="flex items-center gap-2 p-3 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 bg-slate-900"
                                    checked={formData.sources.includes('tvs')}
                                    onChange={(e) => {
                                        const sources = e.target.checked
                                            ? [...formData.sources, 'tvs']
                                            : formData.sources.filter(s => s !== 'tvs');
                                        setFormData({ ...formData, sources });
                                    }}
                                />
                                <span className="text-sm text-slate-300">TVs*</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 bg-slate-900"
                                    checked={formData.sources.includes('radios')}
                                    onChange={(e) => {
                                        const sources = e.target.checked
                                            ? [...formData.sources, 'radios']
                                            : formData.sources.filter(s => s !== 'radios');
                                        setFormData({ ...formData, sources });
                                    }}
                                />
                                <span className="text-sm text-slate-300">Rádios*</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 bg-slate-900"
                                    checked={formData.sources.includes('portais')}
                                    onChange={(e) => {
                                        const sources = e.target.checked
                                            ? [...formData.sources, 'portais']
                                            : formData.sources.filter(s => s !== 'portais');
                                        setFormData({ ...formData, sources });
                                    }}
                                />
                                <span className="text-sm text-slate-300">Portais de Notícias</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 bg-slate-900"
                                    checked={formData.sources.includes('redes-sociais')}
                                    onChange={(e) => {
                                        const sources = e.target.checked
                                            ? [...formData.sources, 'redes-sociais']
                                            : formData.sources.filter(s => s !== 'redes-sociais');
                                        setFormData({ ...formData, sources });
                                    }}
                                />
                                <span className="text-sm text-slate-300">Redes Sociais</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-slate-700 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-600 bg-slate-900"
                                    checked={formData.sources.includes('pessoas')}
                                    onChange={(e) => {
                                        const sources = e.target.checked
                                            ? [...formData.sources, 'pessoas']
                                            : formData.sources.filter(s => s !== 'pessoas');
                                        setFormData({ ...formData, sources });
                                    }}
                                />
                                <span className="text-sm text-slate-300">Pessoas</span>
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">* TVs e Rádios: sob consulta e disponibilidade</p>
                    </div>


                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => navigate('/activations')}>Cancelar</Button>
                <Button variant="primary" size="lg" onClick={handleSave} disabled={loading}>
                    {loading ? <Zap className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {loading ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Solicitar Aprovação'}
                </Button>
            </div>
        </div >
    );
};
