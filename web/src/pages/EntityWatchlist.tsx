import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Save, X, Edit2, Search, Upload, Download, FileSpreadsheet, Check, AlertTriangle, ChevronLeft, ChevronRight, Hash, Tag, BookUser } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MonitoredEntity {
    id: string;
    seq_id?: number;
    name: string;
    aliases: string[];
    description: string;
    type: 'person' | 'organization' | 'place' | 'other';
    monitoring_status: 'active' | 'standby';
    created_at: string;
}

interface SystemKeyword {
    id: string;
    keyword: string;
    source: 'manual' | 'auto';
    created_at: string;
}

interface ParsedEntity {
    name: string;
    type: 'person' | 'organization' | 'place' | 'other';
    description: string;
    aliases: string[];
    status: 'new' | 'duplicate';
}

const TYPE_MAP: Record<string, 'person' | 'organization' | 'place' | 'other'> = {
    'pessoa': 'person', 'person': 'person',
    'organização': 'organization', 'organizacao': 'organization', 'organization': 'organization',
    'lugar': 'place', 'place': 'place',
    'outro': 'other', 'other': 'other',
};

const PAGE_SIZE = 20;

export const EntityWatchlist: React.FC = () => {
    const [entities, setEntities] = useState<MonitoredEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEntity, setCurrentEntity] = useState<Partial<MonitoredEntity>>({
        type: 'person', aliases: [], monitoring_status: 'standby'
    });
    const [aliasInput, setAliasInput] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [entityPage, setEntityPage] = useState(0);

    const [keywords, setKeywords] = useState<SystemKeyword[]>([]);
    const [keywordsLoading, setKeywordsLoading] = useState(true);
    const [newKeyword, setNewKeyword] = useState('');
    const [keywordSearch, setKeywordSearch] = useState('');
    const [keywordPage, setKeywordPage] = useState(0);

    const [showImport, setShowImport] = useState(false);
    const [importPreview, setImportPreview] = useState<ParsedEntity[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showKeywordImport, setShowKeywordImport] = useState(false);
    const [keywordImportPreview, setKeywordImportPreview] = useState<{ keyword: string; status: 'new' | 'duplicate' }[]>([]);
    const [keywordImportLoading, setKeywordImportLoading] = useState(false);
    const keywordFileInputRef = useRef<HTMLInputElement>(null);

    const fetchEntities = async () => {
        setLoading(true);
        const { data } = await supabase.from('monitored_entities').select('*').order('name');
        if (data) setEntities(data);
        setLoading(false);
    };

    const fetchKeywords = async () => {
        setKeywordsLoading(true);
        const { data } = await supabase.from('system_keywords').select('*').order('keyword');
        if (data) setKeywords(data);
        setKeywordsLoading(false);
    };

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                setIsAdmin(profile?.role === 'admin');
            }
        };
        getUser();
        fetchEntities();
        fetchKeywords();
    }, []);

    // ===== ENTITY CRUD =====
    const handleSave = async () => {
        if (!currentEntity.name || !userId) return;
        const payload = {
            name: currentEntity.name,
            description: currentEntity.description,
            type: currentEntity.type,
            aliases: currentEntity.aliases,
            monitoring_status: currentEntity.monitoring_status || 'standby',
            user_id: userId
        };
        let result;
        if (currentEntity.id) {
            result = await supabase.from('monitored_entities').update(payload).eq('id', currentEntity.id);
        } else {
            result = await supabase.from('monitored_entities').insert([payload]);
        }
        if (result.error) { alert(`Erro: ${result.error.message}`); return; }
        setIsEditing(false);
        setCurrentEntity({ type: 'person', aliases: [], monitoring_status: 'standby' });
        fetchEntities();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Remover esta entidade?')) {
            await supabase.from('monitored_entities').delete().eq('id', id);
            fetchEntities();
        }
    };

    const addAlias = () => {
        if (aliasInput.trim()) {
            setCurrentEntity(prev => ({ ...prev, aliases: [...(prev.aliases || []), aliasInput.trim()] }));
            setAliasInput('');
        }
    };
    const removeAlias = (index: number) => {
        setCurrentEntity(prev => ({ ...prev, aliases: prev.aliases?.filter((_, i) => i !== index) }));
    };

    // ===== KEYWORD CRUD =====
    const handleAddKeyword = async () => {
        if (!newKeyword.trim()) return;
        const { error } = await supabase.from('system_keywords').insert({ keyword: newKeyword.trim(), source: 'manual', created_by: userId });
        if (error) { alert(error.code === '23505' ? 'Keyword já existe.' : 'Erro: ' + error.message); return; }
        setNewKeyword('');
        fetchKeywords();
    };
    const handleDeleteKeyword = async (id: string) => {
        await supabase.from('system_keywords').delete().eq('id', id);
        fetchKeywords();
    };

    // ===== ENTITY IMPORT =====
    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { nome: 'João da Silva', tipo: 'pessoa', descricao: 'Prefeito de X', apelidos: 'Joãozinho;O Prefeito' },
            { nome: 'Partido ABC', tipo: 'organização', descricao: 'Partido político', apelidos: 'PABC' },
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
        ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 45 }, { wch: 30 }];
        XLSX.writeFile(wb, 'modelo_entidades.xlsx');
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
            if (!('nome' in rows[0] || 'name' in rows[0] || 'Nome' in rows[0])) { setImportError('Coluna "nome" não encontrada.'); return; }
            const existingNames = new Set(entities.map(e => e.name.toLowerCase().trim()));
            const parsed: ParsedEntity[] = rows.map(row => ({
                name: String(row.nome || row.name || row.Nome || '').trim(),
                type: TYPE_MAP[(row.tipo || row.type || 'pessoa').toString().toLowerCase().trim()] || 'other',
                description: String(row.descricao || row.description || '').trim(),
                aliases: String(row.apelidos || row.aliases || '').split(';').map((a: string) => a.trim()).filter(Boolean),
                status: existingNames.has(String(row.nome || row.name || row.Nome || '').trim().toLowerCase()) ? 'duplicate' as const : 'new' as const
            })).filter(p => p.name.length > 0);
            setImportPreview(parsed);
            setShowImport(true);
        } catch (err: any) { setImportError(`Erro: ${err.message}`); }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const confirmImport = async () => {
        if (!userId) return;
        setImportLoading(true);
        try {
            const newOnes = importPreview.filter(p => p.status === 'new');
            if (newOnes.length === 0) { setImportError('Nenhuma nova.'); setImportLoading(false); return; }
            const { error } = await supabase.from('monitored_entities').insert(newOnes.map(e => ({ name: e.name, type: e.type, description: e.description, aliases: e.aliases, user_id: userId })));
            if (error) throw error;
            setShowImport(false); setImportPreview([]); fetchEntities();
        } catch (err: any) { setImportError(`Erro: ${err.message}`); }
        finally { setImportLoading(false); }
    };

    // ===== KEYWORD IMPORT =====
    const downloadKeywordTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([{ termo: 'eleições 2026' }, { termo: 'saúde pública' }]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Keywords');
        ws['!cols'] = [{ wch: 40 }];
        XLSX.writeFile(wb, 'modelo_keywords.xlsx');
    };

    const handleKeywordFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            const existingKws = new Set(keywords.map(k => k.keyword.toLowerCase()));
            const parsed = rows.map(row => {
                const kw = String(row.termo || row.keyword || row.Termo || '').trim();
                return { keyword: kw, status: existingKws.has(kw.toLowerCase()) ? 'duplicate' as const : 'new' as const };
            }).filter(p => p.keyword.length > 0);
            setKeywordImportPreview(parsed);
            setShowKeywordImport(true);
        } catch (err: any) { alert('Erro: ' + err.message); }
        if (keywordFileInputRef.current) keywordFileInputRef.current.value = '';
    };

    const confirmKeywordImport = async () => {
        setKeywordImportLoading(true);
        try {
            const newKws = keywordImportPreview.filter(k => k.status === 'new');
            if (newKws.length === 0) { alert('Nenhuma nova.'); setKeywordImportLoading(false); return; }
            const { error } = await supabase.from('system_keywords').insert(newKws.map(k => ({ keyword: k.keyword, source: 'manual', created_by: userId })));
            if (error) throw error;
            setShowKeywordImport(false); setKeywordImportPreview([]); fetchKeywords();
        } catch (err: any) { alert('Erro: ' + err.message); }
        finally { setKeywordImportLoading(false); }
    };

    // ===== FILTERS & PAGINATION =====
    const filteredEntities = entities.filter(e => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.aliases?.some(a => a.toLowerCase().includes(q));
    });
    const totalEntityPages = Math.ceil(filteredEntities.length / PAGE_SIZE);
    const pagedEntities = filteredEntities.slice(entityPage * PAGE_SIZE, (entityPage + 1) * PAGE_SIZE);

    const filteredKeywords = keywords.filter(k => {
        if (!keywordSearch) return true;
        return k.keyword.toLowerCase().includes(keywordSearch.toLowerCase());
    });
    const totalKeywordPages = Math.ceil(filteredKeywords.length / PAGE_SIZE);
    const pagedKeywords = filteredKeywords.slice(keywordPage * PAGE_SIZE, (keywordPage + 1) * PAGE_SIZE);

    const typeLabel = (t: string) => {
        switch (t) { case 'person': return 'Pessoa'; case 'organization': return 'Organização'; case 'place': return 'Lugar'; default: return 'Outro'; }
    };
    const typeColor = (t: string) => {
        switch (t) { case 'person': return 'bg-blue-500/20 text-blue-400'; case 'organization': return 'bg-purple-500/20 text-purple-400'; case 'place': return 'bg-emerald-500/20 text-emerald-400'; default: return 'bg-slate-500/20 text-slate-400'; }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ===== HEADER ===== */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <BookUser className="w-6 h-6 text-indigo-400" />
                        Entidades &amp; Termos Cadastrados
                    </h1>
                    <p className="text-slate-400 text-sm">Gerencie o dicionário de pessoas, organizações e palavras-chave disponíveis para ativações.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-slate-400 hover:text-white">
                        <Download className="w-4 h-4 mr-1.5" /> Modelo
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-1.5" /> Importar
                    </Button>
                    <Button onClick={() => { setIsEditing(true); setCurrentEntity({ type: 'person', aliases: [], monitoring_status: 'standby' }); }}>
                        <Plus className="w-4 h-4 mr-2" /> Nova Entidade
                    </Button>
                </div>
            </div>

            {/* Import Error */}
            {importError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-sm text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {importError}
                    <button className="ml-auto text-xs text-red-400/60 hover:text-red-300" onClick={() => setImportError(null)}>✕</button>
                </div>
            )}

            {/* Entity Import Preview */}
            {showImport && importPreview.length > 0 && (
                <Card className="bg-slate-900/80 border-indigo-500/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileSpreadsheet className="w-5 h-5 text-indigo-400" /> Preview — {importPreview.filter(p => p.status === 'new').length} nova(s), {importPreview.filter(p => p.status === 'duplicate').length} duplicada(s)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-60 overflow-y-auto mb-3 rounded border border-slate-800">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800/50 sticky top-0"><tr>
                                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Nome</th>
                                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Tipo</th>
                                    <th className="text-center px-3 py-2 text-slate-400 font-medium">Status</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-800">
                                    {importPreview.map((row, idx) => (
                                        <tr key={idx} className={row.status === 'duplicate' ? 'opacity-50' : ''}>
                                            <td className="px-3 py-2 text-white">{row.name}</td>
                                            <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${typeColor(row.type)}`}>{typeLabel(row.type)}</span></td>
                                            <td className="px-3 py-2 text-center text-xs">{row.status === 'new' ? <span className="text-emerald-400">Nova</span> : <span className="text-yellow-400">Duplicada</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setShowImport(false); setImportPreview([]); }}>Cancelar</Button>
                            <Button size="sm" onClick={confirmImport} disabled={importLoading || importPreview.filter(p => p.status === 'new').length === 0}>
                                {importLoading ? 'Importando...' : <><Check className="w-4 h-4 mr-1" /> Importar {importPreview.filter(p => p.status === 'new').length}</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Edit / Create Form */}
            {isEditing && (
                <Card className="bg-slate-900/50 border-indigo-500/30">
                    <CardHeader><CardTitle>{currentEntity.id ? 'Editar Entidade' : 'Nova Entidade'}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400">Nome</label>
                                <input className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" value={currentEntity.name || ''} onChange={e => setCurrentEntity({ ...currentEntity, name: e.target.value })} placeholder="Ex: João da Silva" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400">Tipo</label>
                                <select className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" value={currentEntity.type} onChange={e => setCurrentEntity({ ...currentEntity, type: e.target.value as any })}>
                                    <option value="person">Pessoa</option>
                                    <option value="organization">Organização</option>
                                    <option value="place">Lugar</option>
                                    <option value="other">Outro</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400">Descrição</label>
                            <textarea className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white h-20" value={currentEntity.description || ''} onChange={e => setCurrentEntity({ ...currentEntity, description: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400">Apelidos</label>
                            <div className="flex gap-2">
                                <input className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-white" value={aliasInput} onChange={e => setAliasInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAlias()} />
                                <Button size="sm" variant="secondary" onClick={addAlias}>Adicionar</Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {currentEntity.aliases?.map((alias, i) => (
                                    <span key={i} className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-sm flex items-center gap-1">
                                        {alias} <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => removeAlias(i)} />
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" placeholder="Buscar entidades..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setEntityPage(0); }} />
            </div>

            {/* ===== ENTITY TABLE ===== */}
            <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Nome</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Tipo</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">Descrição</th>
                            <th className="text-right px-4 py-3 text-slate-400 font-medium w-20">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Carregando...</td></tr>
                        ) : pagedEntities.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{searchQuery ? 'Nenhum resultado.' : 'Nenhuma entidade cadastrada.'}</td></tr>
                        ) : pagedEntities.map(entity => (
                            <tr key={entity.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${typeColor(entity.type)}`}>
                                            {entity.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                {isAdmin && entity.seq_id && (
                                                    <span className="text-[10px] font-mono text-slate-600">#{entity.seq_id}</span>
                                                )}
                                                <span className="text-white font-medium">{entity.name}</span>
                                            </div>
                                            {entity.aliases?.length > 0 && <p className="text-[11px] text-slate-600 truncate max-w-[200px]">{entity.aliases.join(', ')}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor(entity.type)}`}>{typeLabel(entity.type)}</span>
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell">
                                    <span className="text-slate-500 text-xs truncate block max-w-[250px]">{entity.description || '—'}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setCurrentEntity(entity); setIsEditing(true); }}>
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => handleDelete(entity.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {totalEntityPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
                        <span>{filteredEntities.length} entidade(s) — Pág. {entityPage + 1}/{totalEntityPages}</span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2" disabled={entityPage === 0} onClick={() => setEntityPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" disabled={entityPage >= totalEntityPages - 1} onClick={() => setEntityPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* ===== KEYWORDS SECTION ===== */}
            {/* ═══════════════════════════════════════ */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-white">Termos / Palavras-chave</h2>
                        <span className="text-[10px] bg-slate-500/15 text-slate-400 px-2 py-0.5 rounded-full">{keywords.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={downloadKeywordTemplate} className="text-slate-400 hover:text-white">
                            <Download className="w-4 h-4 mr-1.5" /> Modelo
                        </Button>
                        <input ref={keywordFileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleKeywordFileSelect} className="hidden" />
                        <Button variant="secondary" size="sm" onClick={() => keywordFileInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-1.5" /> Importar
                        </Button>
                    </div>
                </div>

                {/* Keyword Import Preview */}
                {showKeywordImport && keywordImportPreview.length > 0 && (
                    <Card className="bg-slate-900/80 border-amber-500/30">
                        <CardContent className="p-4">
                            <p className="text-sm text-slate-300 mb-3">{keywordImportPreview.filter(k => k.status === 'new').length} nova(s) · {keywordImportPreview.filter(k => k.status === 'duplicate').length} duplicada(s)</p>
                            <div className="flex flex-wrap gap-1.5 p-3 max-h-40 overflow-y-auto rounded border border-slate-800 mb-3">
                                {keywordImportPreview.map((k, i) => (
                                    <span key={i} className={`text-xs px-2 py-1 rounded ${k.status === 'new' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 line-through'}`}>{k.keyword}</span>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => { setShowKeywordImport(false); setKeywordImportPreview([]); }}>Cancelar</Button>
                                <Button size="sm" onClick={confirmKeywordImport} disabled={keywordImportLoading}>
                                    {keywordImportLoading ? 'Importando...' : <><Check className="w-4 h-4 mr-1" /> Importar</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Add Keyword */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40" placeholder="Adicionar nova keyword..." value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddKeyword()} />
                    </div>
                    <Button onClick={handleAddKeyword} disabled={!newKeyword.trim()}>
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                </div>

                {/* Keyword search */}
                {keywords.length > 10 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40" placeholder="Filtrar keywords..." value={keywordSearch} onChange={e => { setKeywordSearch(e.target.value); setKeywordPage(0); }} />
                    </div>
                )}

                {/* Keywords Table */}
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-slate-400 font-medium">Termo</th>
                                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Origem</th>
                                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Data</th>
                                <th className="text-right px-4 py-3 text-slate-400 font-medium w-20">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {keywordsLoading ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Carregando...</td></tr>
                            ) : pagedKeywords.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{keywordSearch ? 'Nenhum resultado.' : 'Nenhuma keyword cadastrada.'}</td></tr>
                            ) : pagedKeywords.map(kw => (
                                <tr key={kw.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2.5 text-white font-medium">{kw.keyword}</td>
                                    <td className="px-4 py-2.5 hidden sm:table-cell">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${kw.source === 'auto' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-slate-500/15 text-slate-400'}`}>
                                            {kw.source === 'auto' ? 'AUTO' : 'MANUAL'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-500 text-xs hidden md:table-cell">{new Date(kw.created_at).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => handleDeleteKeyword(kw.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalKeywordPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
                            <span>{filteredKeywords.length} keyword(s) — Pág. {keywordPage + 1}/{totalKeywordPages}</span>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 px-2" disabled={keywordPage === 0} onClick={() => setKeywordPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2" disabled={keywordPage >= totalKeywordPages - 1} onClick={() => setKeywordPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
