import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    Plus, Pencil, Trash2, Save, X, FileText, GripVertical,
    Loader2, AlertCircle, Lightbulb
} from 'lucide-react';

interface ScenarioContext {
    id: string;
    title: string;
    content: string;
    category: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface ScenarioBaseBuilderProps {
    activationId: string;
    activationName: string;
}

const CATEGORIES = [
    { value: 'narrative', label: 'Narrativa', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { value: 'hypothesis', label: 'Hipótese', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { value: 'context', label: 'Contexto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { value: 'general', label: 'Geral', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
];

export const ScenarioBaseBuilder: React.FC<ScenarioBaseBuilderProps> = ({ activationId, activationName }) => {
    const [contexts, setContexts] = useState<ScenarioContext[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formCategory, setFormCategory] = useState('general');

    const fetchContexts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('scenario_contexts')
            .select('*')
            .eq('activation_id', activationId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (!error && data) setContexts(data);
        setLoading(false);
    }, [activationId]);

    useEffect(() => {
        fetchContexts();
    }, [fetchContexts]);

    const resetForm = () => {
        setFormTitle('');
        setFormContent('');
        setFormCategory('general');
        setEditingId(null);
        setShowForm(false);
    };

    const handleCreate = async () => {
        if (!formTitle.trim() || !formContent.trim()) return;
        setSaving(true);

        const { error } = await supabase.from('scenario_contexts').insert({
            activation_id: activationId,
            title: formTitle.trim(),
            content: formContent.trim(),
            category: formCategory,
            sort_order: contexts.length,
        });

        if (!error) {
            resetForm();
            fetchContexts();
        }
        setSaving(false);
    };

    const handleUpdate = async () => {
        if (!editingId || !formTitle.trim() || !formContent.trim()) return;
        setSaving(true);

        const { error } = await supabase
            .from('scenario_contexts')
            .update({
                title: formTitle.trim(),
                content: formContent.trim(),
                category: formCategory,
            })
            .eq('id', editingId);

        if (!error) {
            resetForm();
            fetchContexts();
        }
        setSaving(false);
    };

    const startEdit = (ctx: ScenarioContext) => {
        setEditingId(ctx.id);
        setFormTitle(ctx.title);
        setFormContent(ctx.content);
        setFormCategory(ctx.category);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('scenario_contexts')
            .delete()
            .eq('id', id);

        if (!error) {
            setDeleteConfirm(null);
            fetchContexts();
        }
    };

    const getCategoryStyle = (cat: string) => {
        return CATEGORIES.find(c => c.value === cat)?.color || CATEGORIES[3].color;
    };

    const getCategoryLabel = (cat: string) => {
        return CATEGORIES.find(c => c.value === cat)?.label || 'Geral';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando cenários...
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-orange-400" />
                        Cenário Base
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-xl">
                        Cadastre inputs manuais de contexto que servirão de referência para a análise crítica
                        gerada pelo agrupamento de informações desta ativação.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-orange-500/10 text-orange-400 px-4 py-2 rounded-lg hover:bg-orange-500/20 transition text-sm font-medium flex items-center gap-2 border border-orange-500/20 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Novo Input
                    </button>
                )}
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-white">
                        {editingId ? 'Editar Input de Cenário' : 'Novo Input de Cenário'}
                    </h4>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Título</label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            placeholder="Ex: Contexto político local, Histórico do adversário..."
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Categoria</label>
                        <div className="flex gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setFormCategory(cat.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${formCategory === cat.value
                                            ? cat.color + ' ring-1 ring-offset-1 ring-offset-slate-900'
                                            : 'text-slate-500 bg-slate-800 border-slate-700 hover:text-slate-300'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Conteúdo</label>
                        <textarea
                            value={formContent}
                            onChange={e => setFormContent(e.target.value)}
                            placeholder="Descreva o contexto, narrativa ou hipótese que deve ser considerado na análise crítica..."
                            rows={6}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-y"
                        />
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
                        >
                            <X className="w-4 h-4 inline mr-1" /> Cancelar
                        </button>
                        <button
                            onClick={editingId ? handleUpdate : handleCreate}
                            disabled={!formTitle.trim() || !formContent.trim() || saving}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {editingId ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                </div>
            )}

            {/* List of Contexts */}
            {contexts.length === 0 && !showForm ? (
                <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-800 border-dashed">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum input de cenário cadastrado</p>
                    <p className="text-slate-600 text-sm mt-1">
                        Adicione contextos que servirão de base para a análise crítica.
                    </p>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="mt-4 text-orange-400 text-sm hover:text-orange-300 transition underline underline-offset-2"
                    >
                        Criar primeiro input
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {contexts.map((ctx, i) => (
                        <div
                            key={ctx.id}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition group"
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-slate-700 mt-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition">
                                    <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-slate-600 font-mono">#{i + 1}</span>
                                        <h4 className="text-sm text-white font-semibold">{ctx.title}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getCategoryStyle(ctx.category)}`}>
                                            {getCategoryLabel(ctx.category)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">
                                        {ctx.content}
                                    </p>
                                    <p className="text-[10px] text-slate-600 mt-2">
                                        Atualizado em {new Date(ctx.updated_at).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                    <button
                                        onClick={() => startEdit(ctx)}
                                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                        title="Editar"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    {deleteConfirm === ctx.id ? (
                                        <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2">
                                            <span className="text-xs text-red-400">Excluir?</span>
                                            <button
                                                onClick={() => handleDelete(ctx.id)}
                                                className="p-1 text-red-400 hover:text-red-300"
                                            >
                                                <AlertCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="p-1 text-slate-400 hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(ctx.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
