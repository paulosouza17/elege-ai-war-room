import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { BrainCircuit, MessageSquare, Database, Zap, Webhook, Search, Globe, Upload } from 'lucide-react';

const icons = {
    ai: BrainCircuit,
    message: MessageSquare,
    database: Database,
    zap: Zap,
    httprequest: Webhook,
    manus: Search,
    perplexity: Globe,
    publish: Upload,
    script: Zap,
};

export default memo(({ id, data, selected }: any) => {
    const Icon = icons[data.iconType as keyof typeof icons] || Zap;
    const { setNodes } = useReactFlow();

    const toggleDisabled = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setNodes((nds) =>
            nds.map((n) => n.id === id
                ? { ...n, data: { ...n.data, nodeDisabled: !n.data.nodeDisabled } }
                : n
            )
        );
    }, [id, setNodes]);

    const getExecutionStyle = () => {
        if (data.nodeDisabled) {
            return 'border-red-500/40 border-dashed opacity-50';
        }
        if (data.executionStatus === 'running') {
            return 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)]';
        }
        if (data.executionStatus === 'completed') {
            return 'border-green-400 ring-2 ring-green-400/50 shadow-[0_0_15px_rgba(74,222,128,0.4)]';
        }
        return selected ? 'border-primary ring-1 ring-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]' : 'border-slate-700 hover:border-slate-500';
    };

    return (
        <div className={`relative w-48 bg-slate-900 border-2 rounded-lg shadow-2xl transition-all duration-200 ${getExecutionStyle()}`}>
            <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-slate-400 !border-slate-900" />

            {/* On/Off toggle — top right */}
            <button
                onClick={toggleDisabled}
                className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: data.nodeDisabled ? '#ef4444' : '#22c55e' }}
                title={data.nodeDisabled ? 'Ativar nó' : 'Desativar nó'}
            >
                <span className="text-[7px] font-bold text-white leading-none">
                    {data.nodeDisabled ? 'OFF' : 'ON'}
                </span>
            </button>

            <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                    <div className={`p-2 rounded-md ${data.color || 'bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    {data.executionStatus === 'running' && (
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    )}
                    {data.executionStatus === 'completed' && (
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                    )}
                </div>

                <h3 className="font-semibold text-slate-200 text-sm mb-1">{data.label}</h3>
                <div className="text-[10px] text-slate-500 font-mono flex justify-between items-center">
                    <span className="uppercase tracking-wider">ACTION</span>
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-slate-400 !border-slate-900" />
        </div>
    );
});
