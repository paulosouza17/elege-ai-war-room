import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Save, X, Edit2, Search, Tv, Radio, Globe, Instagram, Video, ExternalLink, Download, Upload, FileSpreadsheet, Check, AlertTriangle, CheckSquare, Square, Loader2, Thermometer, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AudienceData {
    monthly_visits?: number;
    trend?: 'up' | 'down' | 'stable';
    projection?: number;
    source?: string;
    updated_at?: string;
}

interface MediaOutlet {
    id: string;
    seq_id?: number;
    name: string;
    type: 'tv' | 'radio' | 'portal' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'twitter' | 'other';
    url: string;
    logo_url: string;
    description: string;
    city: string;
    political_relevance: number | null;
    audience_data: AudienceData | null;
    created_at: string;
}

const TYPE_OPTIONS = [
    { value: 'tv', label: 'TV', icon: Tv },
    { value: 'radio', label: 'Rádio', icon: Radio },
    { value: 'portal', label: 'Portal de Notícias', icon: Globe },
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'tiktok', label: 'TikTok', icon: Video },
    { value: 'youtube', label: 'YouTube', icon: Video },
    { value: 'facebook', label: 'Facebook', icon: Globe },
    { value: 'twitter', label: 'X (Twitter)', icon: Globe },
    { value: 'other', label: 'Outro', icon: Globe },
];

const typeLabel = (t: string) => TYPE_OPTIONS.find(o => o.value === t)?.label || t;
const typeColor = (t: string): string => {
    const colors: Record<string, string> = {
        tv: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        radio: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        portal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        tiktok: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
        facebook: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        twitter: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    };
    return colors[t] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
};

const TYPE_MAP: Record<string, string> = {
    'tv': 'tv', 'televisão': 'tv', 'televisao': 'tv',
    'rádio': 'radio', 'radio': 'radio',
    'portal': 'portal', 'portal de notícias': 'portal', 'site': 'portal', 'jornal': 'portal',
    'instagram': 'instagram', 'insta': 'instagram',
    'tiktok': 'tiktok', 'tik tok': 'tiktok',
    'youtube': 'youtube', 'yt': 'youtube',
    'facebook': 'facebook', 'fb': 'facebook',
    'twitter': 'twitter', 'x': 'twitter',
};

interface ParsedOutlet {
    name: string;
    type: string;
    url: string;
    logo_url: string;
    description: string;
    city: string;
    status: 'new' | 'duplicate';
}

export default function MediaOutlets() {
    const [outlets, setOutlets] = useState<MediaOutlet[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const [logoMode, setLogoMode] = useState<'url' | 'upload'>('url');

    // Import state
    const [showImport, setShowImport] = useState(false);
    const [importPreview, setImportPreview] = useState<ParsedOutlet[]>([]);
    const [importError, setImportError] = useState<string | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Bulk select state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState('portal');
    const [formUrl, setFormUrl] = useState('');
    const [formLogo, setFormLogo] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formRelevance, setFormRelevance] = useState<number | null>(null);

    useEffect(() => {
        fetchOutlets();
    }, []);

    const fetchOutlets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('media_outlets')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) setOutlets(data);
        setLoading(false);
    };

    const resetForm = () => {
        setFormName('');
        setFormType('portal');
        setFormUrl('');
        setFormLogo('');
        setFormDescription('');
        setFormCity('');
        setFormRelevance(null);
        setEditing(null);
        setShowForm(false);
        setLogoMode('url');
    };

    const handleEdit = (outlet: MediaOutlet) => {
        setFormName(outlet.name);
        setFormType(outlet.type);
        setFormUrl(outlet.url || '');
        setFormLogo(outlet.logo_url || '');
        setFormDescription(outlet.description || '');
        setFormCity(outlet.city || '');
        setFormRelevance(outlet.political_relevance);
        setEditing(outlet.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formName.trim()) return alert('Nome é obrigatório.');

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const payload = {
            name: formName.trim(),
            type: formType,
            url: formUrl.trim() || null,
            logo_url: formLogo.trim() || null,
            description: formDescription.trim() || null,
            city: formCity.trim() || null,
            political_relevance: formRelevance,
            user_id: user.id,
            updated_at: new Date().toISOString(),
        };

        if (editing) {
            const { error } = await supabase
                .from('media_outlets')
                .update(payload)
                .eq('id', editing);
            if (error) return alert('Erro ao atualizar: ' + error.message);
        } else {
            const { error } = await supabase
                .from('media_outlets')
                .insert(payload);
            if (error) return alert('Erro ao cadastrar: ' + error.message);
        }

        resetForm();
        fetchOutlets();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este veículo?')) return;
        await supabase.from('media_outlets').delete().eq('id', id);
        fetchOutlets();
    };

    // Bulk select helpers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllFiltered = () => {
        const allFilteredIds = filtered.map(o => o.id);
        const allSelected = allFilteredIds.every(id => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allFilteredIds));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        if (!confirm(`Excluir ${count} veículo${count > 1 ? 's' : ''} permanentemente?\n\nEsta ação não pode ser desfeita.`)) return;

        setBulkDeleting(true);
        const ids = Array.from(selectedIds);
        const { error } = await supabase.from('media_outlets').delete().in('id', ids);
        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            setSelectedIds(new Set());
            fetchOutlets();
        }
        setBulkDeleting(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop();
        const fileName = `logos/${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from('media-logos')
            .upload(fileName, file, { upsert: true });

        if (error) {
            alert('Erro no upload: ' + error.message);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('media-logos')
            .getPublicUrl(fileName);

        setFormLogo(urlData.publicUrl);
        setLogoMode('url');
    };

    // ===== IMPORT =====
    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { nome: 'Folha de S.Paulo', tipo: 'portal', url: 'https://folha.uol.com.br', logo_url: '', descricao: 'Jornal de grande circulação', cidade: 'São Paulo - SP' },
            { nome: 'TV Globo', tipo: 'tv', url: 'https://globo.com', logo_url: '', descricao: 'Maior emissora de TV do Brasil', cidade: 'Rio de Janeiro - RJ' },
            { nome: 'CBN', tipo: 'radio', url: 'https://cbn.globo.com', logo_url: '', descricao: 'Rádio all news', cidade: 'São Paulo - SP' },
            { nome: '@candidato_oficial', tipo: 'instagram', url: 'https://instagram.com/candidato_oficial', logo_url: '', descricao: 'Perfil oficial', cidade: 'Brasília - DF' },
            { nome: '@candidato_tiktok', tipo: 'tiktok', url: 'https://tiktok.com/@candidato', logo_url: '', descricao: 'Perfil TikTok', cidade: 'Brasília - DF' },
            { nome: 'Canal Oficial', tipo: 'youtube', url: 'https://youtube.com/@canal_oficial', logo_url: '', descricao: 'Canal YouTube', cidade: '' },
            { nome: 'Página Facebook', tipo: 'facebook', url: 'https://facebook.com/pagina', logo_url: '', descricao: 'Página institucional', cidade: '' },
            { nome: '@perfil_x', tipo: 'twitter', url: 'https://x.com/perfil_x', logo_url: '', descricao: 'Perfil no X (Twitter)', cidade: '' },
            { nome: 'Assessoria Local', tipo: 'other', url: '', logo_url: '', descricao: 'Contato de assessoria', cidade: 'Curitiba - PR' },
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
        ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 40 }, { wch: 35 }, { wch: 20 }];
        XLSX.writeFile(wb, 'modelo_veiculos_midia.xlsx');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportError(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
            if (rows.length === 0) { setImportError('Arquivo vazio.'); return; }
            if (!('nome' in rows[0] || 'name' in rows[0] || 'Nome' in rows[0])) {
                setImportError('Coluna "nome" não encontrada. Baixe o modelo para referência.');
                return;
            }
            const existingNames = new Set(outlets.map(o => o.name.toLowerCase().trim()));
            const parsed: ParsedOutlet[] = rows.map(row => {
                const rawType = (row.tipo || row.type || 'portal').toString().toLowerCase().trim();
                return {
                    name: String(row.nome || row.name || row.Nome || '').trim(),
                    type: TYPE_MAP[rawType] || 'other',
                    url: String(row.url || row.URL || '').trim(),
                    logo_url: String(row.logo_url || row.logo || '').trim(),
                    description: String(row.descricao || row.description || '').trim(),
                    city: String(row.cidade || row.city || '').trim(),
                    status: existingNames.has(String(row.nome || row.name || row.Nome || '').trim().toLowerCase()) ? 'duplicate' as const : 'new' as const,
                };
            }).filter(p => p.name.length > 0);
            setImportPreview(parsed);
            setShowImport(true);
        } catch (err: any) {
            setImportError(`Erro ao ler arquivo: ${err.message}`);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const confirmImport = async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;
        setImportLoading(true);
        try {
            const newOnes = importPreview.filter(p => p.status === 'new');
            if (newOnes.length === 0) { setImportError('Nenhum novo veículo para importar.'); setImportLoading(false); return; }
            const { error } = await supabase.from('media_outlets').insert(
                newOnes.map(o => ({
                    name: o.name,
                    type: o.type,
                    url: o.url || null,
                    logo_url: o.logo_url || null,
                    description: o.description || null,
                    city: o.city || null,
                    user_id: user.id,
                }))
            );
            if (error) throw error;
            setShowImport(false);
            setImportPreview([]);
            fetchOutlets();
        } catch (err: any) {
            setImportError(`Erro na importação: ${err.message}`);
        } finally {
            setImportLoading(false);
        }
    };

    // Filter
    const filtered = outlets.filter(o => {
        const matchesSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.city?.toLowerCase().includes(search.toLowerCase());
        const matchesType = !filterType || o.type === filterType;
        return matchesSearch && matchesType;
    });

    // Stats
    const typeCounts = outlets.reduce((acc, o) => {
        acc[o.type] = (acc[o.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Veículos de Mídia</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Cadastro de TVs, rádios, portais de notícias e perfis sociais
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={downloadTemplate}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 text-sm flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Modelo
                    </button>
                    <label className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 text-sm flex items-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" /> Importar
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                    </label>
                    <Button onClick={() => { resetForm(); setShowForm(true); }}>
                        <Plus className="w-4 h-4 mr-2" /> Novo Veículo
                    </Button>
                </div>
            </div>

            {/* Import Error */}
            {importError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {importError}
                    <button onClick={() => setImportError(null)} className="ml-auto text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Import Preview */}
            {showImport && importPreview.length > 0 && (
                <Card className="border-amber-500/30 bg-slate-900">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                            Pré-visualização da Importação
                            <span className="text-sm font-normal text-slate-400">({importPreview.length} registros)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-64 overflow-auto rounded border border-slate-700">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-slate-400">Status</th>
                                        <th className="px-3 py-2 text-left text-slate-400">Nome</th>
                                        <th className="px-3 py-2 text-left text-slate-400">Tipo</th>
                                        <th className="px-3 py-2 text-left text-slate-400">URL</th>
                                        <th className="px-3 py-2 text-left text-slate-400">Cidade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importPreview.map((item, i) => (
                                        <tr key={i} className={`border-t border-slate-800 ${item.status === 'duplicate' ? 'opacity-50' : ''}`}>
                                            <td className="px-3 py-2">
                                                {item.status === 'new' ? (
                                                    <span className="text-emerald-400 flex items-center gap-1 text-xs"><Check className="w-3 h-3" /> Novo</span>
                                                ) : (
                                                    <span className="text-amber-400 flex items-center gap-1 text-xs"><AlertTriangle className="w-3 h-3" /> Duplicado</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-white">{item.name}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${typeColor(item.type)}`}>
                                                    {typeLabel(item.type)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-400 truncate max-w-[200px]">{item.url || '-'}</td>
                                            <td className="px-3 py-2 text-slate-400">{item.city || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-slate-500">
                                <span className="text-emerald-400 font-medium">{importPreview.filter(p => p.status === 'new').length}</span> novos ·
                                <span className="text-amber-400 font-medium"> {importPreview.filter(p => p.status === 'duplicate').length}</span> duplicados (ignorados)
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { setShowImport(false); setImportPreview([]); }}>
                                    <X className="w-4 h-4 mr-1" /> Cancelar
                                </Button>
                                <Button onClick={confirmImport} disabled={importLoading}>
                                    {importLoading ? 'Importando...' : (<><Check className="w-4 h-4 mr-1" /> Confirmar Importação</>)}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {TYPE_OPTIONS.filter(t => typeCounts[t.value]).map(t => (
                    <div
                        key={t.value}
                        onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${filterType === t.value
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                            }`}
                    >
                        <t.icon className="w-4 h-4 text-slate-400 mb-1" />
                        <p className="text-xl font-bold text-white">{typeCounts[t.value]}</p>
                        <p className="text-xs text-slate-500">{t.label}</p>
                    </div>
                ))}
                <div className="p-3 rounded-lg border bg-slate-800/50 border-slate-700">
                    <Globe className="w-4 h-4 text-slate-400 mb-1" />
                    <p className="text-xl font-bold text-white">{outlets.length}</p>
                    <p className="text-xs text-slate-500">Total</p>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou cidade..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm"
                    />
                </div>
                {filterType && (
                    <button
                        onClick={() => setFilterType('')}
                        className="px-3 py-2 bg-primary/20 text-primary rounded-lg text-sm flex items-center gap-1 hover:bg-primary/30"
                    >
                        <X className="w-3 h-3" /> {typeLabel(filterType)}
                    </button>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={selectAllFiltered}
                            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                        >
                            {filtered.every(o => selectedIds.has(o.id)) ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            {filtered.every(o => selectedIds.has(o.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                        </button>
                        <span className="text-sm text-slate-400">
                            <span className="text-white font-medium">{selectedIds.size}</span> selecionado{selectedIds.size > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={bulkDeleting}
                            className="px-3 py-1.5 text-sm text-red-400 hover:text-white bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/30 flex items-center gap-2 disabled:opacity-50"
                        >
                            {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            {bulkDeleting ? 'Excluindo...' : `Excluir ${selectedIds.size}`}
                        </button>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <Card className="border-primary/30 bg-slate-900">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                            {editing ? 'Editar Veículo' : 'Novo Veículo'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 font-medium">Nome *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Ex: Folha de S.Paulo"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 font-medium">Tipo *</label>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-primary/50"
                                >
                                    {TYPE_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* URL */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 font-medium">URL</label>
                                <input
                                    type="url"
                                    value={formUrl}
                                    onChange={(e) => setFormUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-xs text-slate-400 mb-1 font-medium">Cidade</label>
                                <input
                                    type="text"
                                    value={formCity}
                                    onChange={(e) => setFormCity(e.target.value)}
                                    placeholder="Ex: São Paulo - SP"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>

                        {/* Logo */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1 font-medium">Logo</label>
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={() => setLogoMode('url')}
                                    className={`px-3 py-1 rounded text-xs ${logoMode === 'url' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'}`}
                                >
                                    URL
                                </button>
                                <button
                                    onClick={() => setLogoMode('upload')}
                                    className={`px-3 py-1 rounded text-xs ${logoMode === 'upload' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'}`}
                                >
                                    Upload
                                </button>
                            </div>
                            {logoMode === 'url' ? (
                                <input
                                    type="url"
                                    value={formLogo}
                                    onChange={(e) => setFormLogo(e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-primary/50"
                                />
                            ) : (
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary/20 file:text-primary"
                                />
                            )}
                            {formLogo && (
                                <div className="mt-2 flex items-center gap-3">
                                    <img src={formLogo} alt="Logo preview" className="w-10 h-10 rounded object-cover bg-slate-800 border border-slate-700" />
                                    <span className="text-xs text-slate-500 truncate flex-1">{formLogo}</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1 font-medium">Descrição</label>
                            <textarea
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Breve descrição do veículo..."
                                rows={2}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-primary/50 resize-none"
                            />
                        </div>

                        {/* Political Relevance */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1 font-medium">
                                <Thermometer className="w-3.5 h-3.5 inline mr-1" />
                                Relevância Política (0-10)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={10}
                                    step={1}
                                    value={formRelevance ?? 0}
                                    onChange={(e) => setFormRelevance(Number(e.target.value))}
                                    className="flex-1 accent-primary h-2"
                                />
                                <span className={`text-lg font-bold min-w-[2rem] text-center ${formRelevance === null ? 'text-slate-600' :
                                        (formRelevance ?? 0) >= 8 ? 'text-red-400' :
                                            (formRelevance ?? 0) >= 5 ? 'text-amber-400' :
                                                'text-emerald-400'
                                    }`}>
                                    {formRelevance ?? '—'}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1">Preenchido automaticamente por IA ou manualmente. 0 = irrelevante, 10 = crucial.</p>
                        </div>

                        {/* Audience Data (read-only preview if exists) */}
                        {editing && outlets.find(o => o.id === editing)?.audience_data && (() => {
                            const ad = outlets.find(o => o.id === editing)!.audience_data!;
                            const trendIcon = ad.trend === 'up' ? '📈' : ad.trend === 'down' ? '📉' : '➡️';
                            return (
                                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                                    <label className="block text-xs text-slate-400 mb-2 font-medium">
                                        <Users className="w-3.5 h-3.5 inline mr-1" />
                                        Audiência Mensal
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="text-lg font-bold text-white">
                                                {ad.monthly_visits ? (ad.monthly_visits >= 1000000 ? `${(ad.monthly_visits / 1000000).toFixed(1)}M` : ad.monthly_visits >= 1000 ? `${(ad.monthly_visits / 1000).toFixed(0)}K` : ad.monthly_visits.toLocaleString()) : '—'}
                                            </span>
                                            <span className="text-xs text-slate-500 ml-1">visitas/mês</span>
                                        </div>
                                        <span className="text-sm">{trendIcon}</span>
                                        {ad.projection && (
                                            <div className="text-xs text-slate-400">
                                                Projeção: <span className="text-white font-medium">
                                                    {ad.projection >= 1000000 ? `${(ad.projection / 1000000).toFixed(1)}M` : ad.projection >= 1000 ? `${(ad.projection / 1000).toFixed(0)}K` : ad.projection.toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {ad.source && <p className="text-[10px] text-slate-600 mt-1">Fonte: {ad.source} · Atualizado: {ad.updated_at ? new Date(ad.updated_at).toLocaleDateString('pt-BR') : '—'}</p>}
                                </div>
                            );
                        })()}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={resetForm}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button onClick={handleSave}>
                                <Save className="w-4 h-4 mr-1" /> {editing ? 'Atualizar' : 'Cadastrar'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List */}
            {loading ? (
                <div className="text-center text-slate-500 py-12">Carregando...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{search || filterType ? 'Nenhum veículo encontrado com os filtros.' : 'Nenhum veículo cadastrado ainda.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(outlet => (
                        <Card
                            key={outlet.id}
                            className={`bg-slate-900/50 border-slate-700 hover:border-slate-600 transition-all group cursor-pointer ${selectedIds.has(outlet.id) ? 'ring-2 ring-primary/50 border-primary/40' : ''
                                }`}
                            onClick={() => toggleSelect(outlet.id)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    {/* Checkbox */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(outlet.id); }}
                                        className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedIds.has(outlet.id)
                                            ? 'bg-primary border-primary text-white'
                                            : 'border-slate-600 text-transparent group-hover:border-slate-500'
                                            }`}
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                    {/* Logo */}
                                    {outlet.logo_url ? (
                                        <img
                                            src={outlet.logo_url}
                                            alt={outlet.name}
                                            className="w-12 h-12 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                                            {(() => {
                                                const TypeIcon = TYPE_OPTIONS.find(t => t.value === outlet.type)?.icon || Globe;
                                                return <TypeIcon className="w-5 h-5 text-slate-500" />;
                                            })()}
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {outlet.seq_id && (
                                                <span className="text-[10px] font-mono text-slate-500">#{outlet.seq_id}</span>
                                            )}
                                            <h3 className="font-semibold text-white truncate">{outlet.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${typeColor(outlet.type)}`}>
                                                {typeLabel(outlet.type)}
                                            </span>
                                            {outlet.city && (
                                                <span className="text-xs text-slate-500">{outlet.city}</span>
                                            )}
                                        </div>
                                        {outlet.description && (
                                            <p className="text-xs text-slate-400 line-clamp-2">{outlet.description}</p>
                                        )}
                                        {/* Relevance + Audience mini indicators */}
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {outlet.political_relevance !== null && outlet.political_relevance !== undefined && (
                                                <div className="flex items-center gap-1" title={`Relevância Política: ${outlet.political_relevance}/10`}>
                                                    <Thermometer className="w-3 h-3 text-slate-500" />
                                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${outlet.political_relevance >= 8 ? 'bg-red-500' :
                                                                    outlet.political_relevance >= 5 ? 'bg-amber-500' :
                                                                        'bg-emerald-500'
                                                                }`}
                                                            style={{ width: `${outlet.political_relevance * 10}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] font-mono ${outlet.political_relevance >= 8 ? 'text-red-400' :
                                                            outlet.political_relevance >= 5 ? 'text-amber-400' :
                                                                'text-emerald-400'
                                                        }`}>{outlet.political_relevance}</span>
                                                </div>
                                            )}
                                            {outlet.audience_data?.monthly_visits && (
                                                <div className="flex items-center gap-1" title={`Audiência: ${outlet.audience_data.monthly_visits.toLocaleString()} visitas/mês`}>
                                                    <Users className="w-3 h-3 text-slate-500" />
                                                    <span className="text-[10px] text-slate-400">
                                                        {outlet.audience_data.monthly_visits >= 1000000
                                                            ? `${(outlet.audience_data.monthly_visits / 1000000).toFixed(1)}M`
                                                            : outlet.audience_data.monthly_visits >= 1000
                                                                ? `${(outlet.audience_data.monthly_visits / 1000).toFixed(0)}K`
                                                                : outlet.audience_data.monthly_visits}
                                                    </span>
                                                    <span className="text-[10px]">
                                                        {outlet.audience_data.trend === 'up' ? '📈' : outlet.audience_data.trend === 'down' ? '📉' : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                                    {outlet.url ? (
                                        <a
                                            href={outlet.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-3 h-3" /> Abrir
                                        </a>
                                    ) : (
                                        <span />
                                    )}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleEdit(outlet)}
                                            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(outlet.id)}
                                            className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
