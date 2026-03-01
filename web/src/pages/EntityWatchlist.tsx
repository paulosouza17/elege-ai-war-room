import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Save, X, Edit2, Search, Upload, Download, FileSpreadsheet, Check, AlertTriangle, ChevronLeft, ChevronRight, Hash, Tag, BookUser, Instagram, Tv, Radio, Music2, Loader2, Globe, ExternalLink, Power, Zap, Link2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ActivationInfo { id: string; name: string; }
interface ParsedChannel { title: string; url: string; username: string; status: 'new' | 'duplicate'; }

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

interface ElegeChannel {
    id: number;
    code: string;
    title: string;
    url: string;
    username: string | null;
    provider: string | null;
    kind: string;
    country_id: number;
    follower_count: number;
    description: string | null;
    is_enabled: boolean;
    is_valid: boolean;
    created_at: string;
    updated_at: string;
}

const TYPE_MAP: Record<string, 'person' | 'organization' | 'place' | 'other'> = {
    'pessoa': 'person', 'person': 'person',
    'organização': 'organization', 'organizacao': 'organization', 'organization': 'organization',
    'lugar': 'place', 'place': 'place',
    'outro': 'other', 'other': 'other',
};

const PAGE_SIZE = 20;

type WatchlistTab = 'pessoas' | 'keywords' | 'instagram' | 'tiktok' | 'tvs' | 'radios';

const TAB_CONFIG: { id: WatchlistTab; label: string; icon: React.ReactNode; color: string; borderColor: string }[] = [
    { id: 'pessoas', label: 'Pessoas', icon: <BookUser className="w-4 h-4" />, color: 'text-indigo-400', borderColor: 'border-indigo-400' },
    { id: 'keywords', label: 'Palavras-chave', icon: <Tag className="w-4 h-4" />, color: 'text-amber-400', borderColor: 'border-amber-400' },
    { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'text-pink-400', borderColor: 'border-pink-400' },
    { id: 'tiktok', label: 'TikTok', icon: <Music2 className="w-4 h-4" />, color: 'text-cyan-400', borderColor: 'border-cyan-400' },
    { id: 'tvs', label: 'TVs', icon: <Tv className="w-4 h-4" />, color: 'text-amber-400', borderColor: 'border-amber-400' },
    { id: 'radios', label: 'Rádios', icon: <Radio className="w-4 h-4" />, color: 'text-teal-400', borderColor: 'border-teal-400' },
];

export const EntityWatchlist: React.FC = () => {
    const [activeTab, setActiveTab] = useState<WatchlistTab>('pessoas');

    // ===== ENTITY STATE =====
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

    // ===== KEYWORD STATE =====
    const [keywords, setKeywords] = useState<SystemKeyword[]>([]);
    const [keywordsLoading, setKeywordsLoading] = useState(true);
    const [newKeyword, setNewKeyword] = useState('');
    const [keywordSearch, setKeywordSearch] = useState('');
    const [keywordPage, setKeywordPage] = useState(0);

    // ===== IMPORT STATE =====
    const [showImport, setShowImport] = useState(false);
    const [importPreview, setImportPreview] = useState<ParsedEntity[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showKeywordImport, setShowKeywordImport] = useState(false);
    const [keywordImportPreview, setKeywordImportPreview] = useState<{ keyword: string; status: 'new' | 'duplicate' }[]>([]);
    const [keywordImportLoading, setKeywordImportLoading] = useState(false);
    const keywordFileInputRef = useRef<HTMLInputElement>(null);

    // ===== CHANNEL STATE (Elege.AI) =====
    const [channels, setChannels] = useState<ElegeChannel[]>([]);
    const [channelsLoading, setChannelsLoading] = useState(false);
    const [channelForm, setChannelForm] = useState({ title: '', url: '', username: '' });
    const [channelCreating, setChannelCreating] = useState(false);
    const [channelError, setChannelError] = useState<string | null>(null);

    // ===== ACTIVATION STATE =====
    const [activations, setActivations] = useState<ActivationInfo[]>([]);
    const [selectedActivations, setSelectedActivations] = useState<string[]>([]);

    // ===== CHANNEL IMPORT STATE =====
    const [showChannelImport, setShowChannelImport] = useState(false);
    const [channelImportPreview, setChannelImportPreview] = useState<ParsedChannel[]>([]);
    const [channelImportLoading, setChannelImportLoading] = useState(false);
    const [channelImportError, setChannelImportError] = useState<string | null>(null);
    const channelFileInputRef = useRef<HTMLInputElement>(null);
    const [channelActivationsMap, setChannelActivationsMap] = useState<Record<number, string[]>>({});

    // ===== INLINE ACTIVATION EDITING =====
    const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
    const [editingActivations, setEditingActivations] = useState<string[]>([]);
    const [savingActivations, setSavingActivations] = useState(false);
    const activationPopoverRef = useRef<HTMLDivElement>(null);

    // ===== BULK SELECTION =====
    const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
    const [bulkActivations, setBulkActivations] = useState<string[]>([]);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);

    // ===== FETCH FUNCTIONS =====
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

    const fetchChannels = async (kind?: string) => {
        setChannelsLoading(true);
        try {
            const backendUrl = import.meta.env.VITE_API_URL || '';
            const kindParam = kind || activeTab;
            let apiKind = kindParam;
            if (kindParam === 'tvs') apiKind = 'tv,youtube';
            if (kindParam === 'radios') apiKind = 'radio';
            const res = await fetch(`${backendUrl}/api/elege/channels?kind=${apiKind}`);
            const data = await res.json();
            setChannels(data.channels || []);
        } catch (e: any) {
            console.error('Failed to fetch channels:', e);
            setChannels([]);
        }
        setChannelsLoading(false);
    };

    const fetchActivations = async () => {
        const { data } = await supabase.from('activations').select('id, name').eq('status', 'active').order('name');
        if (data) setActivations(data);
    };

    const fetchChannelActivations = async (channelIds: number[]) => {
        if (channelIds.length === 0) return;
        const { data } = await supabase.from('channel_activations').select('elege_channel_id, activation_id').in('elege_channel_id', channelIds);
        if (data) {
            const map: Record<number, string[]> = {};
            data.forEach((r: any) => {
                if (!map[r.elege_channel_id]) map[r.elege_channel_id] = [];
                map[r.elege_channel_id].push(r.activation_id);
            });
            setChannelActivationsMap(map);
        }
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
        fetchActivations();
    }, []);

    // Fetch channels when switching to a channel tab
    useEffect(() => {
        if (['instagram', 'tiktok', 'tvs', 'radios'].includes(activeTab)) {
            fetchChannels();
        }
    }, [activeTab]);

    // Fetch activation mappings when channels load
    useEffect(() => {
        if (channels.length > 0) {
            fetchChannelActivations(channels.map(c => c.id));
        }
    }, [channels]);

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

    // ===== CHANNEL CRUD (Instagram/TikTok) =====
    const extractUsername = (url: string, kind: string): string => {
        try {
            if (kind === 'instagram') {
                const match = url.match(/instagram\.com\/([^/?#]+)/);
                return match ? match[1] : '';
            }
            if (kind === 'tiktok') {
                const match = url.match(/tiktok\.com\/@?([^/?#]+)/);
                return match ? match[1].replace('@', '') : '';
            }
        } catch { }
        return '';
    };

    const handleCreateChannel = async () => {
        if (!channelForm.title.trim()) return;
        setChannelCreating(true);
        setChannelError(null);
        try {
            const kind = activeTab;
            const username = channelForm.username || extractUsername(channelForm.url, kind);
            const backendUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${backendUrl}/api/elege/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: channelForm.title.trim(), kind, url: channelForm.url.trim(), username: username || null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
            // Save activation mappings
            const channelId = data.channel?.id;
            if (channelId && selectedActivations.length > 0) {
                await fetch(`${backendUrl}/api/elege/channels/${channelId}/activations`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activation_ids: selectedActivations, channel_kind: kind, channel_title: channelForm.title.trim() }),
                });
            }
            setChannelForm({ title: '', url: '', username: '' });
            setSelectedActivations([]);
            fetchChannels();
        } catch (err: any) { setChannelError(err.message); }
        setChannelCreating(false);
    };

    const handleDeleteChannel = async (channelId: number) => {
        if (!confirm('Remover este canal do monitoramento?')) return;
        try {
            const backendUrl = import.meta.env.VITE_API_URL || '';
            await fetch(`${backendUrl}/api/elege/channels/${channelId}`, { method: 'DELETE' });
            await supabase.from('channel_activations').delete().eq('elege_channel_id', channelId);
            fetchChannels();
        } catch (err: any) { alert('Erro ao remover: ' + err.message); }
    };

    // ===== CHANNEL IMPORT (XLS) =====
    const downloadChannelTemplate = (kind: string) => {
        const label = kind === 'instagram' ? 'Instagram' : 'TikTok';
        const example = kind === 'instagram' ? 'https://instagram.com/usuario' : 'https://tiktok.com/@usuario';
        const ws = XLSX.utils.json_to_sheet([
            { titulo: `Perfil ${label} 1`, url: example, username: 'usuario1' },
            { titulo: `Perfil ${label} 2`, url: `${example}2`, username: 'usuario2' },
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Canais');
        ws['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 20 }];
        XLSX.writeFile(wb, `modelo_canais_${kind}.xlsx`);
    };

    const handleChannelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setChannelImportError(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (rows.length === 0) { setChannelImportError('Arquivo vazio.'); return; }
            const existingTitles = new Set(channels.map(c => c.title.toLowerCase()));
            const kind = activeTab;
            const parsed: ParsedChannel[] = rows.map(row => {
                const title = String(row.titulo || row.title || row.nome || '').trim();
                const url = String(row.url || row.URL || '').trim();
                const username = String(row.username || row.usuario || '').trim() || extractUsername(url, kind);
                return { title, url, username, status: existingTitles.has(title.toLowerCase()) ? 'duplicate' as const : 'new' as const };
            }).filter(p => p.title.length > 0);
            setChannelImportPreview(parsed);
            setShowChannelImport(true);
        } catch (err: any) { setChannelImportError(`Erro: ${err.message}`); }
        if (channelFileInputRef.current) channelFileInputRef.current.value = '';
    };

    const confirmChannelImport = async () => {
        setChannelImportLoading(true);
        setChannelImportError(null);
        try {
            const newOnes = channelImportPreview.filter(p => p.status === 'new');
            if (newOnes.length === 0) { setChannelImportError('Nenhum canal novo.'); setChannelImportLoading(false); return; }
            const kind = activeTab;
            const backendUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${backendUrl}/api/elege/channels/batch`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channels: newOnes.map(c => ({ title: c.title, kind, url: c.url, username: c.username })), activation_ids: selectedActivations }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(JSON.stringify(data.error));
            const failed = data.results?.filter((r: any) => !r.success) || [];
            if (failed.length > 0) setChannelImportError(`${data.created} criado(s), ${failed.length} falha(s): ${failed.map((f: any) => f.title).join(', ')}`);
            setShowChannelImport(false); setChannelImportPreview([]); setSelectedActivations([]); fetchChannels();
        } catch (err: any) { setChannelImportError(`Erro: ${err.message}`); }
        finally { setChannelImportLoading(false); }
    };

    const toggleActivation = (id: string) => {
        setSelectedActivations(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    };

    const activationName = (id: string) => activations.find(a => a.id === id)?.name || id.slice(0, 8);

    // ===== INLINE ACTIVATION EDITING HANDLERS =====
    const openActivationEditor = (channelId: number) => {
        setEditingChannelId(channelId);
        setEditingActivations(channelActivationsMap[channelId] || []);
    };

    const closeActivationEditor = () => {
        setEditingChannelId(null);
        setEditingActivations([]);
    };

    const toggleEditingActivation = (activationId: string) => {
        setEditingActivations(prev =>
            prev.includes(activationId) ? prev.filter(a => a !== activationId) : [...prev, activationId]
        );
    };

    const saveChannelActivations = async (channelId: number) => {
        setSavingActivations(true);
        try {
            const channel = channels.find(c => c.id === channelId);
            const backendUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${backendUrl}/api/elege/channels/${channelId}/activations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activation_ids: editingActivations,
                    channel_kind: channel?.kind || activeTab,
                    channel_title: channel?.title || '',
                }),
            });
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
            }
            // Update local map
            setChannelActivationsMap(prev => ({ ...prev, [channelId]: [...editingActivations] }));
            closeActivationEditor();
        } catch (err: any) {
            alert('Erro ao vincular ativações: ' + err.message);
        } finally {
            setSavingActivations(false);
        }
    };

    // ===== BULK SELECTION HANDLERS =====
    const toggleBulkSelect = (channelId: number) => {
        setBulkSelected(prev => {
            const next = new Set(prev);
            if (next.has(channelId)) next.delete(channelId);
            else next.add(channelId);
            return next;
        });
    };

    const toggleBulkSelectAll = () => {
        if (bulkSelected.size === channels.length) {
            setBulkSelected(new Set());
        } else {
            setBulkSelected(new Set(channels.map(c => c.id)));
        }
    };

    const toggleBulkActivation = (activationId: string) => {
        setBulkActivations(prev =>
            prev.includes(activationId) ? prev.filter(a => a !== activationId) : [...prev, activationId]
        );
    };

    const saveBulkActivations = async () => {
        if (bulkSelected.size === 0 || bulkActivations.length === 0) return;
        setBulkSaving(true);
        setBulkError(null);
        const backendUrl = import.meta.env.VITE_API_URL || '';
        let successCount = 0;
        let failCount = 0;

        for (const channelId of Array.from(bulkSelected)) {
            try {
                const channel = channels.find(c => c.id === channelId);
                const res = await fetch(`${backendUrl}/api/elege/channels/${channelId}/activations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        activation_ids: bulkActivations,
                        channel_kind: channel?.kind || activeTab,
                        channel_title: channel?.title || '',
                    }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setChannelActivationsMap(prev => ({ ...prev, [channelId]: [...bulkActivations] }));
                successCount++;
            } catch {
                failCount++;
            }
        }

        if (failCount > 0) {
            setBulkError(`${successCount} vinculado(s), ${failCount} falha(s). Verifique se o backend está rodando.`);
        } else {
            setBulkSelected(new Set());
            setBulkActivations([]);
        }
        setBulkSaving(false);
    };

    // Clear bulk selection when tab changes
    useEffect(() => {
        setBulkSelected(new Set());
        setBulkActivations([]);
        setBulkError(null);
    }, [activeTab]);

    // Close popover on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (activationPopoverRef.current && !activationPopoverRef.current.contains(e.target as Node)) {
                closeActivationEditor();
            }
        };
        if (editingChannelId !== null) {
            document.addEventListener('mousedown', handleClick);
        }
        return () => document.removeEventListener('mousedown', handleClick);
    }, [editingChannelId]);

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

    const kindIcon = (kind: string) => {
        switch (kind) {
            case 'tv': return <Tv className="w-4 h-4 text-amber-400" />;
            case 'youtube': return <Tv className="w-4 h-4 text-red-400" />;
            case 'radio': return <Radio className="w-4 h-4 text-teal-400" />;
            case 'instagram': return <Instagram className="w-4 h-4 text-pink-400" />;
            case 'tiktok': return <Music2 className="w-4 h-4 text-cyan-400" />;
            default: return <Globe className="w-4 h-4 text-slate-400" />;
        }
    };

    // ===== RENDER HELPERS =====
    const renderPessoasTab = () => (
        <>
            {/* Header Actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full font-medium">{entities.length} entidades</span>
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

            {importError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-sm text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {importError}
                    <button className="ml-auto text-xs text-red-400/60 hover:text-red-300" onClick={() => setImportError(null)}>✕</button>
                </div>
            )}

            {/* Import Preview */}
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

            {/* Edit Form */}
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

            {/* Entity Table */}
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
                                                {isAdmin && entity.seq_id && <span className="text-[10px] font-mono text-slate-600">#{entity.seq_id}</span>}
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
        </>
    );

    const renderKeywordsTab = () => (
        <>
            <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-medium">{keywords.length} termos</span>
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

            {keywords.length > 10 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40" placeholder="Filtrar keywords..." value={keywordSearch} onChange={e => { setKeywordSearch(e.target.value); setKeywordPage(0); }} />
                </div>
            )}

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
        </>
    );

    const renderChannelTab = (kind: 'instagram' | 'tiktok', canCreate: boolean) => {
        const colorMap = {
            instagram: { gradient: 'from-pink-950/40 via-slate-900 to-slate-900', border: 'border-pink-500/30', ring: 'focus:ring-pink-500/40', badge: 'bg-pink-500/15 text-pink-400' },
            tiktok: { gradient: 'from-cyan-950/40 via-slate-900 to-slate-900', border: 'border-cyan-500/30', ring: 'focus:ring-cyan-500/40', badge: 'bg-cyan-500/15 text-cyan-400' },
        };
        const c = colorMap[kind];
        const placeholder = kind === 'instagram' ? 'https://instagram.com/usuario' : 'https://tiktok.com/@usuario';
        const label = kind === 'instagram' ? 'Instagram' : 'TikTok';

        return (
            <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`text-[10px] ${c.badge} px-2 py-0.5 rounded-full font-medium`}>{channels.length} canais</span>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => downloadChannelTemplate(kind)} className="text-slate-400 hover:text-white">
                            <Download className="w-4 h-4 mr-1.5" /> Modelo XLS
                        </Button>
                        <input ref={channelFileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleChannelFileSelect} className="hidden" />
                        <Button variant="secondary" size="sm" onClick={() => channelFileInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-1.5" /> Importar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => fetchChannels()} className="text-slate-400 hover:text-white">
                            <Loader2 className={`w-3.5 h-3.5 ${channelsLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Activation Selector — shared for create & import & BULK */}
                {canCreate && activations.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="w-3 h-3" /> Vincular a Ativações {bulkSelected.size > 0 && <span className="text-indigo-400">({bulkSelected.size} canais selecionados)</span>}
                        </label>
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-lg max-h-28 overflow-y-auto">
                            {activations.map(a => (
                                <button key={a.id} onClick={() => {
                                    if (bulkSelected.size > 0) {
                                        toggleBulkActivation(a.id);
                                    } else {
                                        toggleActivation(a.id);
                                    }
                                }}
                                    className={`text-xs px-2.5 py-1 rounded-full transition-all ${(bulkSelected.size > 0 ? bulkActivations : selectedActivations).includes(a.id)
                                        ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600'}`}>
                                    {a.name}
                                </button>
                            ))}
                        </div>
                        {/* Bulk action bar */}
                        {bulkSelected.size > 0 && (
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-indigo-400 flex-1">
                                    {bulkActivations.length > 0
                                        ? `${bulkActivations.length} ativação(ões) × ${bulkSelected.size} canais`
                                        : `Selecione ativações acima para vincular aos ${bulkSelected.size} canais`
                                    }
                                </p>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setBulkSelected(new Set()); setBulkActivations([]); setBulkError(null); }}>
                                    <X className="w-3 h-3 mr-1" /> Limpar
                                </Button>
                                <Button size="sm" className="h-7 text-xs" onClick={saveBulkActivations} disabled={bulkSaving || bulkActivations.length === 0}>
                                    {bulkSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Link2 className="w-3.5 h-3.5 mr-1" /> Vincular {bulkSelected.size} Canais</>}
                                </Button>
                            </div>
                        )}
                        {bulkError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-300 flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {bulkError}
                                <button className="ml-auto text-red-400/60 hover:text-red-300" onClick={() => setBulkError(null)}>✕</button>
                            </div>
                        )}
                        {bulkSelected.size === 0 && selectedActivations.length > 0 && (
                            <p className="text-[10px] text-indigo-400">{selectedActivations.length} ativação(ões) selecionada(s) — para novos canais/import</p>
                        )}
                    </div>
                )}

                {/* Channel Import Preview */}
                {showChannelImport && channelImportPreview.length > 0 && (
                    <Card className={`bg-slate-900/80 ${c.border}`}>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileSpreadsheet className="w-5 h-5" /> Preview — {channelImportPreview.filter(p => p.status === 'new').length} novo(s), {channelImportPreview.filter(p => p.status === 'duplicate').length} duplicado(s)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-48 overflow-y-auto mb-3 rounded border border-slate-800">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-800/50 sticky top-0"><tr>
                                        <th className="text-left px-3 py-2 text-slate-400 font-medium">Título</th>
                                        <th className="text-left px-3 py-2 text-slate-400 font-medium hidden sm:table-cell">URL</th>
                                        <th className="text-center px-3 py-2 text-slate-400 font-medium">Status</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {channelImportPreview.map((row, idx) => (
                                            <tr key={idx} className={row.status === 'duplicate' ? 'opacity-50' : ''}>
                                                <td className="px-3 py-2 text-white">{row.title}</td>
                                                <td className="px-3 py-2 text-slate-500 text-xs hidden sm:table-cell truncate max-w-[200px]">{row.url || '—'}</td>
                                                <td className="px-3 py-2 text-center text-xs">{row.status === 'new' ? <span className="text-emerald-400">Novo</span> : <span className="text-yellow-400">Duplicado</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {channelImportError && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-300 mb-3">{channelImportError}</div>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => { setShowChannelImport(false); setChannelImportPreview([]); }}>Cancelar</Button>
                                <Button size="sm" onClick={confirmChannelImport} disabled={channelImportLoading || channelImportPreview.filter(p => p.status === 'new').length === 0}>
                                    {channelImportLoading ? 'Importando...' : <><Check className="w-4 h-4 mr-1" /> Importar {channelImportPreview.filter(p => p.status === 'new').length}</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Create Form */}
                {canCreate && (
                    <div className={`bg-gradient-to-r ${c.gradient} rounded-xl border ${c.border} p-4 space-y-3`}>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Cadastrar Perfil {label}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Nome / Título</label>
                                <input className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 ${c.ring} focus:outline-none focus:ring-2`}
                                    placeholder={`Ex: @usuario_${kind}`} value={channelForm.title} onChange={e => setChannelForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider">URL do Perfil</label>
                                <input className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 ${c.ring} focus:outline-none focus:ring-2`}
                                    placeholder={placeholder} value={channelForm.url}
                                    onChange={e => { const url = e.target.value; setChannelForm(f => ({ ...f, url, username: extractUsername(url, kind) || f.username })); }} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Username</label>
                                <input className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600" placeholder="@usuario"
                                    value={channelForm.username} onChange={e => setChannelForm(f => ({ ...f, username: e.target.value }))} />
                            </div>
                            <div className="space-y-1 flex items-end">
                                <Button onClick={handleCreateChannel} disabled={channelCreating || !channelForm.title.trim()} className="w-full">
                                    {channelCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Criar</>}
                                </Button>
                            </div>
                        </div>
                        {channelError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-300 flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {channelError}
                                <button className="ml-auto text-red-400/60 hover:text-red-300" onClick={() => setChannelError(null)}>✕</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Channel List */}
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                            <tr>
                                {canCreate && (
                                    <th className="px-3 py-3 w-10">
                                        <button
                                            onClick={toggleBulkSelectAll}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${bulkSelected.size === channels.length && channels.length > 0
                                                    ? 'bg-indigo-500 border-indigo-400'
                                                    : 'border-slate-600 hover:border-slate-400'
                                                }`}
                                        >
                                            {bulkSelected.size === channels.length && channels.length > 0 && <Check className="w-3 h-3 text-white" />}
                                        </button>
                                    </th>
                                )}
                                <th className="text-left px-4 py-3 text-slate-400 font-medium">Canal</th>
                                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">URL</th>
                                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Ativações</th>
                                <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                                {canCreate && <th className="text-right px-4 py-3 text-slate-400 font-medium w-20">Ação</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {channelsLoading ? (
                                <tr><td colSpan={canCreate ? 6 : 4} className="px-4 py-8 text-center text-slate-500">
                                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando canais da Elege.AI...
                                </td></tr>
                            ) : channels.length === 0 ? (
                                <tr><td colSpan={canCreate ? 6 : 4} className="px-4 py-8 text-center text-slate-500">Nenhum canal {label} cadastrado.</td></tr>
                            ) : channels.map(ch => (
                                <tr key={ch.id} className={`hover:bg-slate-800/30 transition-colors ${bulkSelected.has(ch.id) ? 'bg-indigo-500/5' : ''}`}>
                                    {canCreate && (
                                        <td className="px-3 py-3">
                                            <button
                                                onClick={() => toggleBulkSelect(ch.id)}
                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${bulkSelected.has(ch.id)
                                                        ? 'bg-indigo-500 border-indigo-400'
                                                        : 'border-slate-600 hover:border-slate-400'
                                                    }`}
                                            >
                                                {bulkSelected.has(ch.id) && <Check className="w-3 h-3 text-white" />}
                                            </button>
                                        </td>
                                    )}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            {kindIcon(ch.kind)}
                                            <div>
                                                <span className="text-white font-medium">{ch.title}</span>
                                                {ch.username && <p className="text-[11px] text-slate-500">@{ch.username}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        {ch.url ? (
                                            <a href={ch.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 truncate max-w-[200px]">
                                                {ch.url} <ExternalLink className="w-3 h-3 shrink-0" />
                                            </a>
                                        ) : <span className="text-xs text-slate-600">—</span>}
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <div className="relative">
                                            <button
                                                onClick={() => editingChannelId === ch.id ? closeActivationEditor() : openActivationEditor(ch.id)}
                                                className="flex flex-wrap gap-1 items-center group cursor-pointer min-w-[60px] rounded-md px-1.5 py-1 -mx-1.5 -my-1 hover:bg-slate-800/50 transition-colors"
                                                title="Clique para editar ativações vinculadas"
                                            >
                                                {(channelActivationsMap[ch.id] || []).length > 0 ? (
                                                    (channelActivationsMap[ch.id] || []).map(aid => (
                                                        <span key={aid} className="text-[9px] bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded-full">{activationName(aid)}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                                        <Link2 className="w-3 h-3" /> Vincular
                                                    </span>
                                                )}
                                                <Edit2 className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                                            </button>

                                            {/* Inline Activation Popover */}
                                            {editingChannelId === ch.id && (
                                                <div ref={activationPopoverRef} className="absolute z-50 top-full left-0 mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="px-3 py-2 bg-slate-800/70 border-b border-slate-700/50 flex items-center justify-between">
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
                                                            <Zap className="w-3 h-3" /> Vincular a Ativações
                                                        </span>
                                                        <span className="text-[10px] text-indigo-400 font-medium">{editingActivations.length} selecionada(s)</span>
                                                    </div>
                                                    <div className="p-2 max-h-40 overflow-y-auto space-y-0.5">
                                                        {activations.length === 0 ? (
                                                            <p className="text-xs text-slate-500 text-center py-3">Nenhuma ativação ativa.</p>
                                                        ) : activations.map(a => (
                                                            <button
                                                                key={a.id}
                                                                onClick={() => toggleEditingActivation(a.id)}
                                                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all ${editingActivations.includes(a.id)
                                                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                                                                    }`}
                                                            >
                                                                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${editingActivations.includes(a.id)
                                                                    ? 'bg-indigo-500 border-indigo-400'
                                                                    : 'border-slate-600'
                                                                    }`}>
                                                                    {editingActivations.includes(a.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                                                </span>
                                                                <span className="truncate">{a.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="px-3 py-2 border-t border-slate-700/50 flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={closeActivationEditor}>Cancelar</Button>
                                                        <Button size="sm" className="h-7 text-xs" onClick={() => saveChannelActivations(ch.id)} disabled={savingActivations}>
                                                            {savingActivations ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" /> Salvar</>}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${ch.is_enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                            <span className={`text-[10px] font-medium ${ch.is_enabled ? 'text-emerald-400' : 'text-slate-500'}`}>{ch.is_enabled ? 'Ativo' : 'Inativo'}</span>
                                        </div>
                                    </td>
                                    {canCreate && (
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => handleDeleteChannel(ch.id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderMediaTab = (kind: 'tvs' | 'radios') => {
        const label = kind === 'tvs' ? 'TV' : 'Rádio';
        const badgeClass = kind === 'tvs' ? 'bg-amber-500/15 text-amber-400' : 'bg-teal-500/15 text-teal-400';
        return (
            <>
                <div className="flex items-center justify-between">
                    <span className={`text-[10px] ${badgeClass} px-2 py-0.5 rounded-full font-medium`}>{channels.length} canais</span>
                    <Button variant="ghost" size="sm" onClick={() => fetchChannels()} className="text-slate-400 hover:text-white">
                        <Loader2 className={`w-3.5 h-3.5 mr-1.5 ${channelsLoading ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                </div>

                <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2">
                    <Power className="w-4 h-4 text-slate-500 shrink-0" />
                    Canais de {label} são gerenciados diretamente na plataforma Elege.AI. Esta lista é somente leitura.
                </div>

                <div className="rounded-lg border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-slate-400 font-medium">Canal</th>
                                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Tipo</th>
                                <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">URL</th>
                                <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {channelsLoading ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando canais...
                                </td></tr>
                            ) : channels.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nenhum canal {label} cadastrado na Elege.AI.</td></tr>
                            ) : channels.map(ch => (
                                <tr key={ch.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            {kindIcon(ch.kind)}
                                            <span className="text-white font-medium">{ch.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${ch.kind === 'youtube' ? 'bg-red-500/15 text-red-400' : ch.kind === 'tv' ? 'bg-amber-500/15 text-amber-400' : 'bg-teal-500/15 text-teal-400'}`}>
                                            {ch.kind}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        <span className="text-xs text-slate-500 truncate block max-w-[250px]">{ch.url || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${ch.is_enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                            <span className={`text-[10px] font-medium ${ch.is_enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                {ch.is_enabled ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    <BookUser className="w-6 h-6 text-indigo-400" />
                    Alvos Monitorados
                </h1>
                <p className="text-slate-400 text-sm">Gerencie pessoas, termos e canais de monitoramento.</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto no-scrollbar">
                {TAB_CONFIG.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                            ? `${tab.color} ${tab.borderColor} bg-slate-800/30`
                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/20'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.id === 'pessoas' && <span className="text-[10px] bg-slate-700/50 px-1.5 rounded-full ml-1">{entities.length}</span>}
                        {tab.id === 'keywords' && <span className="text-[10px] bg-slate-700/50 px-1.5 rounded-full ml-1">{keywords.length}</span>}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                {activeTab === 'pessoas' && renderPessoasTab()}
                {activeTab === 'keywords' && renderKeywordsTab()}
                {activeTab === 'instagram' && renderChannelTab('instagram', true)}
                {activeTab === 'tiktok' && renderChannelTab('tiktok', true)}
                {activeTab === 'tvs' && renderMediaTab('tvs')}
                {activeTab === 'radios' && renderMediaTab('radios')}
            </div>
        </div>
    );
};
