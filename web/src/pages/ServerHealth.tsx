import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Server, Activity, Clock, AlertTriangle, CheckCircle, XCircle,
    Play, Pause, RotateCcw, Skull, RefreshCw, Cpu, HardDrive, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ServiceStatus {
    name: string;
    label: string;
    running: boolean;
    startedAt: string | null;
    lastTickAt: string | null;
    tickCount: number;
    errors: number;
    intervalMs: number;
}

interface ServerStatus {
    success: boolean;
    uptime: number;
    memoryMB: number;
    timestamp: string;
    services: ServiceStatus[];
}

export const ServerHealth: React.FC = () => {
    const [status, setStatus] = useState<ServerStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [killResult, setKillResult] = useState<{ killed: number; ids: string[] } | null>(null);
    const [stuckCount, setStuckCount] = useState<number | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    const getAuthHeaders = async () => {
        const { data } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session?.access_token}`,
        };
    };

    const fetchStatus = useCallback(async () => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${backendUrl}/api/admin/services/status`, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStatus(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Falha ao conectar com o servidor');
        } finally {
            setLoading(false);
        }
    }, [backendUrl]);

    const fetchStuckCount = useCallback(async () => {
        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from('flow_executions')
                .select('id', { count: 'exact', head: true })
                .or('status.eq.running,status.eq.pending')
                .lt('started_at', tenMinutesAgo);
            setStuckCount(count || 0);
        } catch { setStuckCount(null); }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchStuckCount();
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchStatus();
            fetchStuckCount();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus, fetchStuckCount, autoRefresh]);

    const serviceAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
        setActionLoading(`${name}-${action}`);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${backendUrl}/api/admin/services/${name}/${action}`, {
                method: 'POST',
                headers,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await fetchStatus();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const killStuck = async () => {
        setActionLoading('kill-stuck');
        setKillResult(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${backendUrl}/api/admin/executions/kill-stuck`, {
                method: 'POST',
                headers,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setKillResult(data);
            fetchStuckCount();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (d > 0) return `${d}d ${h}h ${m}m`;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s}s`;
    };

    const formatTime = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('pt-BR');
    };

    const getServiceIcon = (name: string) => {
        switch (name) {
            case 'scheduler': return <Clock className="w-5 h-5" />;
            case 'watchdog': return <AlertTriangle className="w-5 h-5" />;
            case 'ingestion-worker': return <Zap className="w-5 h-5" />;
            default: return <Server className="w-5 h-5" />;
        }
    };

    const allRunning = status?.services?.every(s => s.running) ?? false;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Server className="w-8 h-8 text-primary" />
                        Servidor
                        <span className={`ml-2 w-3 h-3 rounded-full ${allRunning && !error ? 'bg-emerald-500 animate-pulse' : error ? 'bg-red-500' : 'bg-amber-500'}`} />
                    </h1>
                    <p className="text-slate-400 mt-1">Monitoramento e controle dos serviços do backend.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-all ${autoRefresh
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                    >
                        <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                        {autoRefresh ? 'Auto 5s' : 'Parado'}
                    </button>
                    <Button variant="outline" size="sm" onClick={fetchStatus}>
                        <RefreshCw className="w-4 h-4 mr-1.5" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                        <span className="text-red-300 font-medium text-sm">Erro de conexão</span>
                        <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* System Overview */}
            {status && (
                <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-slate-900/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Cpu className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Uptime</p>
                                <p className="text-lg font-bold text-white">{formatUptime(status.uptime)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <HardDrive className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Memória RSS</p>
                                <p className="text-lg font-bold text-white">{status.memoryMB} MB</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${allRunning ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                <Activity className={`w-5 h-5 ${allRunning ? 'text-emerald-400' : 'text-amber-400'}`} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Serviços</p>
                                <p className="text-lg font-bold text-white">
                                    {status.services.filter(s => s.running).length}/{status.services.length} ativos
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Service Cards */}
            {loading ? (
                <div className="text-center py-16 text-slate-500 animate-pulse">Conectando ao servidor...</div>
            ) : status ? (
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Serviços</h2>
                    {status.services.map((svc) => (
                        <Card key={svc.name} className={`transition-all ${svc.running ? 'border-slate-700/60' : 'border-red-900/30 bg-red-950/5'}`}>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    {/* Left: Info */}
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${svc.running ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {getServiceIcon(svc.name)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-semibold">{svc.label}</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${svc.running
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-red-500/15 text-red-400 border border-red-500/20'
                                                    }`}>
                                                    {svc.running ? (
                                                        <><CheckCircle className="w-2.5 h-2.5" /> Online</>
                                                    ) : (
                                                        <><XCircle className="w-2.5 h-2.5" /> Offline</>
                                                    )}
                                                </span>
                                                {svc.errors > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                        ⚠ {svc.errors} erros
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1.5 text-[11px] text-slate-500">
                                                {svc.running && svc.startedAt && (
                                                    <span>Iniciado: {formatTime(svc.startedAt)}</span>
                                                )}
                                                {svc.lastTickAt && (
                                                    <span>Último tick: {formatTime(svc.lastTickAt)}</span>
                                                )}
                                                <span>Ciclos: {svc.tickCount}</span>
                                                {svc.intervalMs > 0 && (
                                                    <span className="text-slate-600">Intervalo: {svc.intervalMs / 1000}s</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2">
                                        {svc.name !== 'ingestion-worker' ? (
                                            <>
                                                {!svc.running ? (
                                                    <button
                                                        onClick={() => serviceAction(svc.name, 'start')}
                                                        disabled={actionLoading === `${svc.name}-start`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded text-xs font-medium transition-all disabled:opacity-50"
                                                    >
                                                        <Play className="w-3.5 h-3.5" />
                                                        Iniciar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => serviceAction(svc.name, 'stop')}
                                                        disabled={actionLoading === `${svc.name}-stop`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 rounded text-xs font-medium transition-all disabled:opacity-50"
                                                    >
                                                        <Pause className="w-3.5 h-3.5" />
                                                        Pausar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => serviceAction(svc.name, 'restart')}
                                                    disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary rounded text-xs font-medium transition-all disabled:opacity-50"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Reiniciar
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-slate-600 bg-slate-800 px-3 py-1.5 rounded border border-slate-700">
                                                Auto-gerenciado (BullMQ)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}

            {/* Stuck Processes */}
            <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Processos Travados</h2>
                <Card className={stuckCount && stuckCount > 0 ? 'border-red-900/30 bg-red-950/5' : ''}>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stuckCount && stuckCount > 0 ? 'bg-red-500/10' : 'bg-slate-800'}`}>
                                    <Skull className={`w-5 h-5 ${stuckCount && stuckCount > 0 ? 'text-red-400' : 'text-slate-600'}`} />
                                </div>
                                <div>
                                    <span className="text-white font-semibold">
                                        {stuckCount === null ? '...' : stuckCount === 0 ? 'Nenhum processo travado' : `${stuckCount} processo(s) travado(s)`}
                                    </span>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Execuções com status running/pending há mais de 10 minutos
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={killStuck}
                                disabled={actionLoading === 'kill-stuck' || stuckCount === 0}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <Skull className="w-4 h-4" />
                                Matar Travados
                            </button>
                        </div>

                        {/* Kill Result */}
                        {killResult && (
                            <div className={`mt-3 p-3 rounded text-xs ${killResult.killed > 0 ? 'bg-emerald-950/30 border border-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                                {killResult.killed > 0
                                    ? `✅ ${killResult.killed} execução(ões) cancelada(s): ${killResult.ids.join(', ')}`
                                    : 'Nenhum processo travado encontrado.'}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
