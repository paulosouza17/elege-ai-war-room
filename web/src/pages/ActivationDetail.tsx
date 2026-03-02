import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText, Activity, Download, CheckCircle, Clock, AlertCircle, Brain, BarChart3, FolderOpen, Share2, Copy, Trash2, Loader2, X, Link as LinkIcon, Lightbulb, Edit2, Monitor, Lock, Unlock } from 'lucide-react';
import { FileUploadCard } from '../components/FileUploadCard';
import { ProcessingResultModal } from '../components/ProcessingResultModal';
import { ActivationSummary } from '../components/ActivationSummary';
import { ScenarioBaseBuilder } from '../components/ScenarioBaseBuilder';

interface Activation {
    id: string;
    name: string;
    description: string;
    status: string;
}

interface ActivationFile {
    id: string;
    original_name: string;
    file_type: string;
    file_size: number;
    status: 'pending' | 'processing' | 'processed' | 'error';
    uploaded_at: string;
    file_url: string;
}

export const ActivationDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activation, setActivation] = useState<Activation | null>(null);
    const [files, setFiles] = useState<ActivationFile[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'files'>('overview');
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedFile, setSelectedFile] = useState<ActivationFile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Report Links State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportPassword, setReportPassword] = useState('');
    const [reportMaxViews, setReportMaxViews] = useState(3);
    const [reportLinks, setReportLinks] = useState<any[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportCopied, setReportCopied] = useState<string | null>(null);

    // Dashboard Sharing State
    const [showDashboardModal, setShowDashboardModal] = useState(false);
    const [dashboardEnabled, setDashboardEnabled] = useState(false);
    const [dashboardToken, setDashboardToken] = useState<string | null>(null);
    const [dashboardHasPassword, setDashboardHasPassword] = useState(false);
    const [dashboardPassword, setDashboardPassword] = useState('');
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardCopied, setDashboardCopied] = useState(false);

    const handleViewContext = (file: ActivationFile) => {
        setSelectedFile(file);
        setIsModalOpen(true);
    };

    useEffect(() => {
        fetchActivation();
        fetchFiles();

        // Realtime Subscription
        const channel = supabase
            .channel('activation-files-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'activation_files',
                    filter: `activation_id=eq.${id}`
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    fetchFiles();
                }
            )
            .subscribe();

        // Fallback Polling (Every 5s) - Ensures UI updates even if Realtime fails
        const interval = setInterval(fetchFiles, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [id]);

    const fetchActivation = async () => {
        const { data, error } = await supabase.from('activations').select('*').eq('id', id).single();
        if (data) setActivation(data);
        setLoading(false);
    };

    const fetchFiles = async () => {
        const { data, error } = await supabase
            .from('activation_files')
            .select('*')
            .eq('activation_id', id)
            .order('uploaded_at', { ascending: false });

        if (data) setFiles(data);
    };

    const fetchReportLinks = async () => {
        try {
            const res = await fetch(`/api/v1/activations/${id}/report/links`);
            const data = await res.json();
            if (data.success) setReportLinks(data.links);
        } catch (err) {
            console.error('Failed to fetch report links:', err);
        }
    };

    const createReportLink = async () => {
        if (!reportPassword || reportPassword.length < 4) return;
        setReportLoading(true);
        try {
            const res = await fetch(`/api/v1/activations/${id}/report/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: reportPassword, max_views: reportMaxViews }),
            });
            const data = await res.json();
            if (data.success) {
                setReportPassword('');
                fetchReportLinks();
            }
        } catch (err) {
            console.error('Failed to create report link:', err);
        } finally {
            setReportLoading(false);
        }
    };

    const revokeReportLink = async (linkId: string) => {
        try {
            await fetch(`/api/v1/activations/${id}/report/links/${linkId}`, { method: 'DELETE' });
            fetchReportLinks();
        } catch (err) {
            console.error('Failed to revoke link:', err);
        }
    };

    const copyReportLink = (token: string) => {
        const url = `${window.location.origin}/report/${token}`;
        navigator.clipboard.writeText(url);
        setReportCopied(token);
        setTimeout(() => setReportCopied(null), 2000);
    };

    // Dashboard Sharing Functions
    const fetchDashboardStatus = async () => {
        try {
            const res = await fetch(`/api/v1/activations/${id}/public-dashboard/status`);
            const data = await res.json();
            if (data.success) {
                setDashboardEnabled(data.enabled);
                setDashboardToken(data.token);
                setDashboardHasPassword(data.has_password);
            }
        } catch (err) {
            console.error('Dashboard status error:', err);
        }
    };

    const toggleDashboardSharing = async (enabled: boolean) => {
        setDashboardLoading(true);
        try {
            const body: any = { enabled };
            if (enabled && dashboardPassword) {
                body.password = dashboardPassword;
            } else if (enabled && !dashboardPassword) {
                body.password = null;
            }
            const res = await fetch(`/api/v1/activations/${id}/public-dashboard/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                setDashboardEnabled(data.dashboard.enabled);
                setDashboardToken(data.dashboard.token);
                setDashboardHasPassword(data.dashboard.has_password);
            }
        } catch (err) {
            console.error('Dashboard toggle error:', err);
        } finally {
            setDashboardLoading(false);
        }
    };

    const updateDashboardPassword = async () => {
        setDashboardLoading(true);
        try {
            const res = await fetch(`/api/v1/activations/${id}/public-dashboard/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: true, password: dashboardPassword || null }),
            });
            const data = await res.json();
            if (data.success) {
                setDashboardHasPassword(data.dashboard.has_password);
                setDashboardPassword('');
            }
        } catch (err) {
            console.error('Password update error:', err);
        } finally {
            setDashboardLoading(false);
        }
    };

    const copyDashboardLink = () => {
        if (!dashboardToken) return;
        navigator.clipboard.writeText(`${window.location.origin}/dashboard/${dashboardToken}`);
        setDashboardCopied(true);
        setTimeout(() => setDashboardCopied(false), 2000);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'processed': return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-emerald-500/10 text-emerald-500"><CheckCircle className="w-3 h-3" /> Processado</span>;
            case 'pending': return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-amber-500/10 text-amber-500"><Clock className="w-3 h-3" /> Pendente</span>;
            case 'processing': return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-500"><Activity className="w-3 h-3 animate-pulse" /> Processando</span>;
            case 'error': return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-red-500/10 text-red-500"><AlertCircle className="w-3 h-3" /> Erro</span>;
            default: return null;
        }
    };

    if (loading) return <div className="p-8 text-slate-400">Carregando detalhes...</div>;
    if (!activation) return <div className="p-8 text-red-400">Ativação não encontrada.</div>;

    return (
        <div className="p-8 space-y-6">
            <header className="flex items-center gap-4">
                <Link to="/activations" className="p-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{activation.name}</h1>
                    <p className="text-slate-400 text-sm">{activation.status}</p>
                </div>
                {(activation.status === 'pending' || activation.status === 'active') && (
                    <button
                        onClick={() => navigate(`/activations/${id}/edit`)}
                        className="ml-auto bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition text-sm font-medium flex items-center gap-2 border border-slate-700"
                    >
                        <Edit2 className="w-4 h-4" /> Editar Ativação
                    </button>
                )}
                <button
                    onClick={() => { setShowDashboardModal(true); fetchDashboardStatus(); }}
                    className={`${activation.status === 'pending' || activation.status === 'active' ? '' : 'ml-auto'} bg-teal-500/10 text-teal-400 px-4 py-2 rounded-lg hover:bg-teal-500/20 transition text-sm font-medium flex items-center gap-2 border border-teal-500/20`}
                >
                    <Monitor className="w-4 h-4" /> Dashboard Público
                </button>
                <button
                    onClick={() => { setShowReportModal(true); fetchReportLinks(); }}
                    className="bg-orange-500/10 text-orange-400 px-4 py-2 rounded-lg hover:bg-orange-500/20 transition text-sm font-medium flex items-center gap-2 border border-orange-500/20"
                >
                    <Share2 className="w-4 h-4" /> Gerar Relatório
                </button>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Resumo
                </button>
                <button
                    onClick={() => setActiveTab('files')}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'files' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    <FolderOpen className="w-4 h-4" />
                    Arquivos & Documentos
                </button>
                {/* FUTURO: Tab Cenário Base desativada temporariamente */}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && id && (
                    <ActivationSummary activationId={id} activationName={activation.name} />
                )}

                {activeTab === 'files' && (
                    <div className="space-y-6">
                        {/* Contextual Upload Card */}
                        <div className="bg-slate-900/50 rounded-lg p-1">
                            <h3 className="text-sm font-medium text-slate-400 mb-2 px-2">Novo Arquivo para "{activation.name}"</h3>
                            <FileUploadCard
                                preSelectedActivationId={id}
                                onUploadSuccess={() => {
                                    fetchFiles(); // Refresh list after upload
                                }}
                            />
                        </div>

                        <div className="flex justify-between items-center mt-8">
                            <h3 className="text-lg font-medium text-white">Histórico de Arquivos</h3>
                        </div>

                        {files.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-lg border border-slate-800">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Nenhum arquivo vinculado a esta ativação.</p>
                            </div>
                        ) : (
                            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Arquivo</th>
                                            <th className="px-6 py-3">Data Envio</th>
                                            <th className="px-6 py-3">Tamanho</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {files.map(file => (
                                            <tr key={file.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-slate-500" />
                                                        <span className="text-slate-200 font-medium">{file.original_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">
                                                    {new Date(file.uploaded_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">
                                                    {(file.file_size / 1024).toFixed(1)} KB
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(file.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    {file.status === 'processed' && (
                                                        <button
                                                            onClick={() => handleViewContext(file)}
                                                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                            title="Visualizar Contexto (IA)"
                                                        >
                                                            <Brain className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <a
                                                        href={file.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* FUTURO: Cenário Base desativado temporariamente
                {activeTab === 'scenario' && id && (
                    <ScenarioBaseBuilder activationId={id} activationName={activation.name} />
                )}
                */}
            </div>

            {/* Analysis Result Modal */}
            <ProcessingResultModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                file={selectedFile}
            />

            {/* Report Link Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <LinkIcon className="w-5 h-5 text-orange-400" /> Relatório Público
                            </h2>
                            <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Create New Link */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-slate-300">Criar Novo Link</h3>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Senha de acesso</label>
                                    <input
                                        type="text"
                                        value={reportPassword}
                                        onChange={e => setReportPassword(e.target.value)}
                                        placeholder="Mínimo 4 caracteres"
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Limite de visualizações</label>
                                    <select
                                        value={reportMaxViews}
                                        onChange={e => setReportMaxViews(Number(e.target.value))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    >
                                        <option value={1}>1 acesso</option>
                                        <option value={2}>2 acessos</option>
                                        <option value={3}>3 acessos</option>
                                        <option value={5}>5 acessos</option>
                                        <option value={10}>10 acessos</option>
                                    </select>
                                </div>
                                <button
                                    onClick={createReportLink}
                                    disabled={!reportPassword || reportPassword.length < 4 || reportLoading}
                                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-lg font-medium text-sm hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                    Gerar Link
                                </button>
                            </div>

                            {/* Existing Links */}
                            {reportLinks.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-slate-300 mb-2">Links Ativos ({reportLinks.length})</h3>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {reportLinks.map(link => (
                                            <div key={link.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 flex items-center gap-3">
                                                <LinkIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-400 truncate font-mono">/report/{link.token.substring(0, 16)}...</p>
                                                    <p className="text-[10px] text-slate-500">{link.current_views}/{link.max_views} acessos</p>
                                                </div>
                                                <button
                                                    onClick={() => copyReportLink(link.token)}
                                                    className="p-1.5 text-slate-400 hover:text-white rounded transition"
                                                    title="Copiar link"
                                                >
                                                    {reportCopied === link.token ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => revokeReportLink(link.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded transition"
                                                    title="Revogar link"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Sharing Modal */}
            {showDashboardModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDashboardModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-teal-400" /> Dashboard Público
                            </h2>
                            <button onClick={() => setShowDashboardModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <p className="text-sm text-slate-400">Compartilhe uma visão pública em tempo real dos KPIs desta ativação. Tela cheia, apenas dados, sem menus.</p>

                            {/* Toggle */}
                            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                                <div>
                                    <p className="text-sm font-medium text-white">Compartilhamento</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{dashboardEnabled ? 'Link ativo e acessível' : 'Dashboard desativado'}</p>
                                </div>
                                <button
                                    onClick={() => toggleDashboardSharing(!dashboardEnabled)}
                                    disabled={dashboardLoading}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${dashboardEnabled ? 'bg-teal-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dashboardEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            {dashboardEnabled && (
                                <>
                                    {/* Link */}
                                    <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Link de Acesso</p>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-teal-400 bg-slate-900 px-3 py-2 rounded-lg flex-1 truncate font-mono border border-slate-800">
                                                {window.location.origin}/dashboard/{dashboardToken?.substring(0, 20)}...
                                            </code>
                                            <button
                                                onClick={copyDashboardLink}
                                                className="p-2 bg-teal-600/20 hover:bg-teal-600 text-teal-400 hover:text-white rounded-lg transition-all"
                                            >
                                                {dashboardCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            {dashboardHasPassword ? (
                                                <Lock className="w-4 h-4 text-amber-400" />
                                            ) : (
                                                <Unlock className="w-4 h-4 text-slate-500" />
                                            )}
                                            <p className="text-sm text-slate-300">
                                                {dashboardHasPassword ? 'Protegido por senha' : 'Sem proteção por senha'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={dashboardPassword}
                                                onChange={e => setDashboardPassword(e.target.value)}
                                                placeholder={dashboardHasPassword ? 'Nova senha (min 4)' : 'Definir senha (opcional)'}
                                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                            />
                                            <button
                                                onClick={updateDashboardPassword}
                                                disabled={dashboardLoading}
                                                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-2"
                                            >
                                                {dashboardLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                                {dashboardPassword ? 'Definir' : 'Remover Senha'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
