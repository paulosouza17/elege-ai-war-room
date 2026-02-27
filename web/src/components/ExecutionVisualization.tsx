import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, ChevronDown, Bug, History, Terminal, Copy, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ExecutionLog {
    nodeId: string;
    nodeType?: string;
    nodeLabel?: string;
    status: 'running' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    output?: any;
    error?: string;
    duration?: number;
}

interface FlowExecution {
    id: string;
    flow_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    current_node_id: string | null;
    nodes_executed: string[];
    execution_log: ExecutionLog[];
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
}

interface ExecutionPanelProps {
    execution: FlowExecution | null;
    onClose: () => void;
    onExecutionChange?: (execution: FlowExecution) => void;
    focusNodeId?: string | null;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ execution, onClose, onExecutionChange, focusNodeId }) => {
    const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [executionHistory, setExecutionHistory] = useState<FlowExecution[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    // Auto-focus on a specific node when focusNodeId changes
    useEffect(() => {
        if (!focusNodeId || !execution) return;
        const logs = Array.isArray(execution.execution_log) ? execution.execution_log : [];
        const nodeLogs = logs.filter((l: any) => l.nodeId === focusNodeId);
        if (nodeLogs.length > 0) {
            const finalEntry = nodeLogs.find((l: any) => l.status === 'completed' || l.status === 'failed');
            setSelectedLog(finalEntry || nodeLogs[nodeLogs.length - 1]);
        }
    }, [focusNodeId, execution]);

    if (!execution) return null;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running':
                return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-slate-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            running: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            completed: 'bg-green-500/10 text-green-400 border-green-500/20',
            failed: 'bg-red-500/10 text-red-400 border-red-500/20',
            pending: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${classes[status] || 'bg-slate-700 text-slate-400'}`}>
                {status}
            </span>
        );
    };

    const formatDuration = (ms?: number) => {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatTimestamp = (ts?: string) => {
        if (!ts) return '';
        const d = new Date(ts);
        return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
    };

    const toggleKey = (key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const loadHistory = async () => {
        if (showHistory && executionHistory.length > 0) {
            setShowHistory(false);
            return;
        }
        setLoadingHistory(true);
        setShowHistory(true);
        const { data } = await supabase
            .from('flow_executions')
            .select('*')
            .eq('flow_id', execution.flow_id)
            .order('started_at', { ascending: false })
            .limit(20);
        setExecutionHistory(data || []);
        setLoadingHistory(false);
    };

    const logs = Array.isArray(execution.execution_log) ? execution.execution_log : [];

    const groupedLogs = logs.reduce((acc, log) => {
        if (!acc[log.nodeId]) acc[log.nodeId] = [];
        acc[log.nodeId].push(log);
        return acc;
    }, {} as Record<string, ExecutionLog[]>);

    const nodeLogEntries = Object.entries(groupedLogs).map(([nodeId, nodeLogs]) => {
        // Prefer completed/failed entry over running — fixes "awaiting output" for finished nodes
        const finalEntry = nodeLogs.find(l => l.status === 'completed' || l.status === 'failed');
        const latest = finalEntry || nodeLogs[nodeLogs.length - 1];
        return { nodeId, logs: nodeLogs, latest };
    });

    // Render a value with smart formatting
    const renderValue = (value: any, key: string, depth = 0): React.ReactNode => {
        if (value === null || value === undefined) {
            return <span className="text-slate-500 italic text-xs">null</span>;
        }
        if (typeof value === 'boolean') {
            return (
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${value ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {String(value)}
                </span>
            );
        }
        if (typeof value === 'number') {
            return <span className="text-xs font-mono text-amber-400">{value}</span>;
        }
        if (typeof value === 'string') {
            if (value.length > 200) {
                const isExpanded = expandedKeys.has(key);
                return (
                    <div>
                        <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">
                            {isExpanded ? value : value.substring(0, 200) + '...'}
                        </p>
                        <button
                            onClick={() => toggleKey(key)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 mt-1"
                        >
                            {isExpanded ? '▲ Recolher' : `▼ Ver tudo (${value.length} chars)`}
                        </button>
                    </div>
                );
            }
            if (value.startsWith('http')) {
                return (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline font-mono break-all">
                        {value}
                    </a>
                );
            }
            return <span className="text-xs text-slate-300 font-mono break-all">{value}</span>;
        }
        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="text-xs text-slate-500 italic">[] (vazio)</span>;
            return (
                <div className="space-y-1">
                    <span className="text-[10px] text-slate-500">[{value.length} itens]</span>
                    {value.slice(0, 10).map((item, i) => (
                        <div key={i} className="ml-2 pl-2 border-l border-slate-700/50">
                            {renderValue(item, `${key}[${i}]`, depth + 1)}
                        </div>
                    ))}
                    {value.length > 10 && <span className="text-[10px] text-slate-500 ml-2">...e mais {value.length - 10} itens</span>}
                </div>
            );
        }
        if (typeof value === 'object') {
            const entries = Object.entries(value);
            return (
                <div className="space-y-1.5">
                    {entries.map(([k, v]) => (
                        <div key={k} className="ml-2 pl-2 border-l border-slate-700/50">
                            <span className="text-[10px] font-bold text-cyan-400/80">{k}:</span>
                            <div className="mt-0.5">{renderValue(v, `${key}.${k}`, depth + 1)}</div>
                        </div>
                    ))}
                </div>
            );
        }
        return <span className="text-xs text-slate-300 font-mono">{String(value)}</span>;
    };

    // Debug detail view for a single node
    if (selectedLog) {
        return (
            <div className="fixed right-0 top-0 bottom-0 w-[440px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col z-50">
                {/* Debug Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={() => setSelectedLog(null)}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Voltar
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white text-lg"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <Bug className="w-4 h-4 text-amber-400" />
                        <h4 className="font-bold text-white text-sm">
                            {selectedLog.nodeLabel || selectedLog.nodeId}
                        </h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">{selectedLog.nodeId}</span>
                        {selectedLog.nodeType && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{selectedLog.nodeType}</span>
                        )}
                        {selectedLog.duration && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                ⏱️ {formatDuration(selectedLog.duration)}
                            </span>
                        )}
                        {getStatusBadge(selectedLog.status)}
                    </div>
                </div>

                {/* Debug Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                    {selectedLog.error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <p className="text-xs font-bold text-red-400 mb-1">⚠️ Erro</p>
                            <p className="text-xs text-red-300 font-mono whitespace-pre-wrap">{selectedLog.error}</p>
                        </div>
                    )}

                    {selectedLog.output ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5" />
                                    Output Data
                                </p>
                                <button
                                    onClick={() => copyToClipboard(JSON.stringify(selectedLog.output, null, 2), 'all')}
                                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                                    title="Copiar JSON completo"
                                >
                                    {copiedKey === 'all' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    {copiedKey === 'all' ? 'Copiado!' : 'Copiar JSON'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {Object.entries(selectedLog.output).map(([key, value]) => (
                                    <div key={key} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-[10px] font-bold text-cyan-400 uppercase">{key}</p>
                                            <button
                                                onClick={() => copyToClipboard(
                                                    typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
                                                    key
                                                )}
                                                className="text-slate-600 hover:text-slate-400 transition-colors"
                                                title={`Copiar ${key}`}
                                            >
                                                {copiedKey === key ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                        {renderValue(value, key)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-8">
                            <p className="text-sm">
                                {selectedLog.status === 'running'
                                    ? '⏳ Nó em execução, aguardando output...'
                                    : selectedLog.status === 'completed'
                                        ? '✅ Nó completou mas sem dados de output.'
                                        : `📭 Nenhum dado de output disponível (status: ${selectedLog.status}).`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col z-50">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Bug className="w-5 h-5 text-amber-400" />
                        Debug de Execução
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                    {getStatusBadge(execution.status)}
                    {execution.started_at && (
                        <span className="text-slate-500 text-xs">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTimestamp(execution.started_at)}
                        </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 text-[10px] font-mono">
                        {logs.length} logs
                    </span>
                </div>
                <p className="text-[10px] text-slate-600 font-mono mt-1 truncate">ID: {execution.id}</p>

                {/* Execution History Toggle */}
                <button
                    onClick={loadHistory}
                    className="flex items-center gap-1.5 mt-3 w-full px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-md text-xs text-slate-400 hover:text-slate-200 transition-all"
                >
                    <History className="w-3.5 h-3.5" />
                    Histórico de Execuções
                    {showHistory ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
                </button>

                {/* Execution History Dropdown */}
                {showHistory && (
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1 bg-slate-950/50 rounded-md border border-slate-800 p-2">
                        {loadingHistory ? (
                            <div className="text-center py-3">
                                <Activity className="w-4 h-4 mx-auto animate-spin text-slate-500" />
                            </div>
                        ) : executionHistory.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-2">Nenhuma execução encontrada.</p>
                        ) : executionHistory.map(ex => (
                            <button
                                key={ex.id}
                                onClick={() => {
                                    if (onExecutionChange) onExecutionChange(ex);
                                    setShowHistory(false);
                                    setSelectedLog(null);
                                }}
                                className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors text-xs ${ex.id === execution.id ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                            >
                                {getStatusIcon(ex.status)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-slate-300 font-mono truncate text-[10px]">{ex.id.substring(0, 8)}...</p>
                                    <p className="text-slate-500 text-[10px]">{formatTimestamp(ex.started_at)}</p>
                                </div>
                                <span className="text-[10px] text-slate-600">
                                    {(Array.isArray(ex.execution_log) ? ex.execution_log : []).length} logs
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Node Timeline with Debug Buttons */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {nodeLogEntries.map(({ nodeId, latest }) => (
                    <div
                        key={nodeId}
                        className={`rounded-lg border transition-all ${execution.current_node_id === nodeId && execution.status === 'running'
                            ? 'bg-yellow-500/5 border-yellow-500/30'
                            : latest.status === 'failed'
                                ? 'bg-red-500/5 border-red-800/50'
                                : latest.status === 'completed'
                                    ? 'bg-slate-800 border-green-600/30'
                                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                            }`}
                    >
                        <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getStatusIcon(latest.status)}
                                        <span className="font-mono text-[10px] text-slate-500">
                                            {nodeId}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-white truncate">
                                        {latest.nodeLabel || latest.nodeType || 'Node'}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        {latest.duration && (
                                            <span className="text-[10px] text-slate-500">
                                                ⏱️ {formatDuration(latest.duration)}
                                            </span>
                                        )}
                                        {latest.output && (
                                            <span className="text-[10px] text-slate-500">
                                                📦 {Object.keys(latest.output).length} keys
                                            </span>
                                        )}
                                    </div>
                                    {latest.error && (
                                        <p className="text-[10px] text-red-400 mt-1 truncate">
                                            ⚠️ {latest.error}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Debug Button */}
                        <button
                            onClick={() => setSelectedLog(latest)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-slate-700/50 text-[10px] font-medium text-slate-500 hover:text-amber-400 hover:bg-amber-400/5 transition-all rounded-b-lg"
                        >
                            <Bug className="w-3 h-3" />
                            Ver Debug
                        </button>
                    </div>
                ))}

                {nodeLogEntries.length === 0 && (
                    <div className="text-center text-slate-500 py-8">
                        <Bug className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm mb-2">
                            {execution.status === 'pending'
                                ? '⏳ Aguardando worker processar...'
                                : execution.status === 'running'
                                    ? '🔄 Executando (aguardando logs)...'
                                    : execution.status === 'completed'
                                        ? '✅ Execução completou mas sem logs.'
                                        : `Status: ${execution.status}`}
                        </p>
                        <p className="text-[10px] font-mono text-slate-600">
                            execution_log type: {typeof execution.execution_log} | isArray: {String(Array.isArray(execution.execution_log))}
                        </p>
                        {execution.error_message && (
                            <p className="text-xs text-red-400 mt-2">❌ {execution.error_message}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Overlay component (unchanged)
interface ExecutionOverlayProps {
    execution: FlowExecution | null;
    nodes: any[];
}

export const ExecutionOverlay: React.FC<ExecutionOverlayProps> = ({ execution, nodes }) => {
    if (!execution) return null;

    const executionLog = Array.isArray(execution.execution_log) ? execution.execution_log : [];
    const completedNodes = executionLog
        .filter(l => l.status === 'completed')
        .map(l => l.nodeId);
    const failedNodes = executionLog
        .filter(l => l.status === 'failed')
        .map(l => l.nodeId);

    return (
        <div className="absolute inset-0 pointer-events-none z-40">
            {nodes.map(node => {
                const isCurrentNode = execution.current_node_id === node.id;
                const isCompleted = completedNodes.includes(node.id);
                const isFailed = failedNodes.includes(node.id);

                if (!isCurrentNode && !isCompleted && !isFailed) return null;

                return (
                    <div
                        key={node.id}
                        className="absolute"
                        style={{
                            left: node.position.x - 4,
                            top: node.position.y - 4,
                            width: 210,
                            height: 70,
                        }}
                    >
                        <div
                            className={`w-full h-full rounded-xl border-2 ${isCurrentNode
                                ? 'border-yellow-400 animate-pulse shadow-lg shadow-yellow-400/20'
                                : isCompleted
                                    ? 'border-green-500/50'
                                    : 'border-red-500/50'
                                }`}
                        />
                    </div>
                );
            })}
        </div>
    );
};
