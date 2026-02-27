import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { History, Search, Filter, Clock, CheckCircle, XCircle, AlertCircle, Activity, Bug, StopCircle, Skull, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ExecutionPanel } from '@/components/ExecutionVisualization';
import { usePermission } from '@/hooks/usePermission';

export const FlowExecutionHistory: React.FC = () => {
    const PAGE_SIZE = 20;
    const [executions, setExecutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [live, setLive] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Debug panel state
    const [debugExecution, setDebugExecution] = useState<any | null>(null);
    const [showDebugPanel, setShowDebugPanel] = useState(false);
    const [killingStuck, setKillingStuck] = useState(false);
    const [killResult, setKillResult] = useState<{ killed: number } | null>(null);
    const { role } = usePermission();
    const isAdmin = role === 'admin';

    useEffect(() => {
        fetchExecutions();

        const channel = supabase
            .channel('flow-executions-monitor')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'flow_executions'
                },
                () => {
                    fetchExecutions();
                }
            )
            .subscribe((status, err) => {
                console.log(`[Realtime] Flow Monitor Status: ${status}`, err);
                if (status === 'SUBSCRIBED') {
                    setLive(true);
                } else {
                    setLive(false);
                }
            });

        // Log Channel
        const logChannel = supabase
            .channel('worker-logs')
            .on('broadcast', { event: 'log' }, (payload) => {
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${payload.payload.message}`, ...prev].slice(0, 50));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(logChannel);
        };
    }, []);

    const fetchExecutions = async (append = false) => {
        try {
            if (append) setLoadingMore(true);
            else setLoading(true);

            const from = append ? executions.length : 0;
            const to = from + PAGE_SIZE - 1;

            const { data, error, count } = await supabase
                .from('flow_executions')
                .select(`
                    *,
                    flows (name)
                `, { count: 'exact' })
                .is('parent_execution_id', null)
                .order('started_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const newData = data || [];
            if (append) {
                setExecutions(prev => [...prev, ...newData]);
            } else {
                setExecutions(newData);
            }
            const total = count ?? 0;
            setTotalCount(total);
            setHasMore(from + newData.length < total);
        } catch (error) {
            console.error('Error fetching executions:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-success" />;
            case 'running':
                return <Clock className="w-4 h-4 text-warning animate-spin" />;
            case 'pending':
                return <AlertCircle className="w-4 h-4 text-slate-500" />;
            case 'cancelled':
                return <StopCircle className="w-4 h-4 text-orange-400" />;
            default:
                return <XCircle className="w-4 h-4 text-danger" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            completed: 'bg-success/20 text-success',
            running: 'bg-warning/20 text-warning',
            pending: 'bg-slate-700 text-slate-400',
            failed: 'bg-red-500/20 text-red-400',
            cancelled: 'bg-orange-500/20 text-orange-400',
        };
        return variants[status] || 'bg-slate-700';
    };

    const filteredExecutions = executions.filter(ex =>
        ex.flows?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.error_message?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRetry = async (execution: any) => {
        try {
            await supabase
                .from('flow_executions')
                .update({
                    status: 'pending',
                    started_at: null,
                    completed_at: null,
                    error_message: null,
                    execution_log: null
                })
                .eq('id', execution.id);

            setExecutions(prev => prev.map(ex =>
                ex.id === execution.id ? { ...ex, status: 'pending', error_message: null } : ex
            ));
        } catch (error) {
            console.error("Failed to retry:", error);
        }
    };

    const handleCancel = async (execution: any) => {
        if (!confirm('Deseja cancelar esta execução?')) return;
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            const response = await fetch(`${backendUrl}/api/executions/${execution.id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                setExecutions(prev => prev.map(ex =>
                    ex.id === execution.id ? { ...ex, status: 'cancelled' } : ex
                ));
            }
        } catch (error) {
            console.error('Failed to cancel execution:', error);
        }
    };

    const handleOpenDebug = (execution: any) => {
        setDebugExecution(execution);
        setShowDebugPanel(true);
    };

    const getExecutionName = (execution: any) => {
        let name = execution.flows?.name || 'Fluxo sem nome';
        let context: any = {};

        try {
            context = typeof execution.context === 'string'
                ? JSON.parse(execution.context)
                : execution.context || {};
        } catch (e) { }

        if (context.original_name) {
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-white">{context.original_name}</span>
                    <span className="text-xs text-slate-500">{name} • {context.file_type || 'Arquivo'}</span>
                </div>
            );
        }

        return <span className="text-white font-medium">{name}</span>;
    };

    const getLogCount = (execution: any) => {
        const log = Array.isArray(execution.execution_log) ? execution.execution_log : [];
        return log.length;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <History className="w-8 h-8 text-primary" />
                        Histórico de Execuções
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-slate-400">Acompanhe todas as execuções de fluxos e automações.</p>
                    </div>
                </div>
                {isAdmin && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                        disabled={killingStuck}
                        onClick={async () => {
                            if (!confirm('Cancelar todos os processos travados (running/pending > 10min)?')) return;
                            setKillingStuck(true);
                            setKillResult(null);
                            try {
                                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
                                const { data: session } = await supabase.auth.getSession();
                                const res = await fetch(`${backendUrl}/api/admin/executions/kill-stuck`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session.session?.access_token}`,
                                    },
                                });
                                const data = await res.json();
                                setKillResult(data);
                                fetchExecutions();
                            } catch (err) {
                                console.error('Kill stuck failed:', err);
                            } finally {
                                setKillingStuck(false);
                            }
                        }}
                    >
                        <Skull className="w-4 h-4 mr-1.5" />
                        {killingStuck ? 'Matando...' : 'Matar Travados'}
                    </Button>
                )}
            </div>

            {/* Kill Result Banner */}
            {killResult && (
                <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${killResult.killed > 0 ? 'bg-emerald-950/30 border border-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    <span>{killResult.killed > 0 ? `✅ ${killResult.killed} execução(ões) cancelada(s)` : 'Nenhum processo travado encontrado.'}</span>
                    <button onClick={() => setKillResult(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
                </div>
            )}

            {/* LIVE TERMINAL - Always Visible */}
            <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs h-48 overflow-y-auto flex flex-col-reverse relative shadow-inner">
                <div className="absolute top-2 right-2 flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded backdrop-blur-sm">
                    <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider">{live ? 'CONECTADO' : 'DESCONECTADO'}</span>
                </div>

                {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2 select-none">
                        <Activity className="w-8 h-8 opacity-20" />
                        <span>Aguardando logs do worker...</span>
                        {!live && <span className="text-red-500/40 text-[10px] uppercase tracking-widest">Backend Offline ou Bloqueado</span>}
                    </div>
                )}

                {logs.map((log, i) => (
                    <div key={i} className="text-emerald-400/90 border-b border-slate-900/50 py-0.5 leading-relaxed font-light tracking-wide">
                        <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log.replace(/^\[.*?\]\s*/, '')}
                    </div>
                ))}

                <div className="text-slate-600 border-b border-slate-800 pb-2 mb-2 font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]">
                    <Activity className="w-3 h-3" /> Terminal do Worker
                </div>
            </div>

            <div className="flex gap-4 items-center bg-surface p-4 rounded-lg border border-slate-700/60">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nome do arquivo, fluxo ou erro..."
                        className="pl-10 bg-slate-900 border-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500 animate-pulse">Carregando histórico...</div>
            ) : filteredExecutions.length === 0 ? (
                <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                    <p>Nenhuma execução encontrada.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredExecutions.map((execution) => (
                        <Card key={execution.id} className={`transition-all hover:border-primary/50 ${execution.status === 'failed' ? 'border-red-900/30 bg-red-950/5' : ''}`}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">

                                        {/* Header: Icon + Name + Badge */}
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">{getStatusIcon(execution.status)}</div>

                                            <div className="flex-1">
                                                {getExecutionName(execution)}
                                                {execution.resume_context && (
                                                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                        🔀 Child
                                                        {execution.resume_context?.loopItem?.name && (
                                                            <span className="text-cyan-300 font-medium">{execution.resume_context.loopItem.name}</span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            <Badge className={getStatusBadge(execution.status)}>
                                                {execution.status.toUpperCase()}
                                            </Badge>
                                        </div>

                                        {/* Failure Reason Box */}
                                        {execution.status === 'failed' && execution.error_message && (
                                            <div className="bg-red-950/30 border border-red-900/50 rounded p-3 text-xs text-red-300 font-mono">
                                                <div className="font-bold flex items-center gap-2 mb-1">
                                                    <AlertCircle className="w-3 h-3" /> Falha na Execução
                                                </div>
                                                {execution.error_message}
                                            </div>
                                        )}

                                        {/* Metadata Footer */}
                                        <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-800/50 pt-2 mt-2">
                                            {execution.flows && (
                                                <span title="Nome do Fluxo">Fluxo: <strong className="text-slate-400">{execution.flows.name}</strong></span>
                                            )}
                                            <span title="ID da Execução">ID: <code className="text-slate-600 bg-slate-900 px-1 rounded">{execution.id.slice(0, 8)}</code></span>

                                            {/* Log count indicator */}
                                            <span className="text-slate-600">
                                                📦 {getLogCount(execution)} nós
                                            </span>

                                            {/* Child executions count - check via separate query would be expensive */}
                                            {execution.execution_log?.some((l: any) => l.output?.message?.includes?.('PARALLEL')) && (
                                                <span className="text-cyan-500 text-[10px] font-medium">
                                                    ⚡ Paralelo (filhas spawned)
                                                </span>
                                            )}

                                            {/* Debug Button */}
                                            <button
                                                onClick={() => handleOpenDebug(execution)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 rounded text-xs font-medium transition-all ml-auto"
                                                title="Ver debug detalhado dos nós"
                                            >
                                                <Bug className="w-3 h-3" />
                                                Debug
                                            </button>

                                            {(execution.status === 'running' || execution.status === 'pending') && (
                                                <button
                                                    onClick={() => handleCancel(execution)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded text-xs font-medium transition-all"
                                                    title="Cancelar execução travada"
                                                >
                                                    <StopCircle className="w-3 h-3" />
                                                    Cancelar
                                                </button>
                                            )}

                                            {(execution.status === 'failed' || execution.status === 'cancelled') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs hover:bg-slate-800 hover:text-white"
                                                    onClick={() => handleRetry(execution)}
                                                >
                                                    <Activity className="w-3 h-3 mr-1.5" />
                                                    Tentar Novamente
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side: Timestamps */}
                                    <div className="text-right space-y-1 min-w-[120px]">
                                        <div className="flex items-center justify-end gap-2 text-xs text-slate-500" title="Início">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(execution.started_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                        {execution.completed_at && (
                                            <div className="text-xs text-slate-600" title="Conclusão">
                                                {new Date(execution.completed_at).toLocaleTimeString('pt-BR')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Load More */}
            {hasMore && (
                <div className="flex items-center justify-center py-4">
                    <button
                        onClick={() => fetchExecutions(true)}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-all disabled:opacity-50"
                    >
                        {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {loadingMore ? 'Carregando...' : `Carregar mais (${totalCount - executions.length} restantes)`}
                    </button>
                </div>
            )}
            {!hasMore && executions.length > 0 && totalCount > PAGE_SIZE && (
                <p className="text-center text-xs text-slate-600 py-3">
                    Todas as {totalCount} execuções carregadas
                </p>
            )}

            {/* Debug Panel Overlay */}
            {showDebugPanel && debugExecution && (
                <ExecutionPanel
                    execution={debugExecution}
                    onClose={() => {
                        setShowDebugPanel(false);
                        setDebugExecution(null);
                    }}
                    onExecutionChange={(ex) => setDebugExecution(ex)}
                />
            )}
        </div>
    );
};
