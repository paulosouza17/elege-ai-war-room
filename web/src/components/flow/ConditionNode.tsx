import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Split } from 'lucide-react';

export default memo(({ id, data, selected }: any) => {
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

    const borderStyle = data.nodeDisabled
        ? 'border-red-500/40 border-dashed opacity-50'
        : selected
            ? 'border-primary ring-1 ring-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]'
            : 'border-slate-700 hover:border-slate-500';

    return (
        <div className={`relative w-48 bg-slate-900 border rounded-lg shadow-2xl transition-all duration-200 ${borderStyle}`}>
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
                    <div className={`p-2 rounded-md ${data.color || 'bg-blue-400/10 text-blue-400'}`}>
                        <Split className="w-5 h-5" />
                    </div>
                </div>

                <h3 className="font-semibold text-slate-200 text-sm mb-1">{data.label}</h3>
                <div className="text-[10px] text-slate-500 font-mono flex justify-between items-center">
                    <span className="uppercase tracking-wider">CONDITION</span>
                </div>
            </div>

            <div className="absolute -right-3 top-1/3 flex items-center">
                <span className="absolute right-4 text-[9px] text-emerald-500 font-bold uppercase tracking-wider">TRUE</span>
                <Handle type="source" position={Position.Right} id="true" className="w-2.5 h-2.5 !bg-emerald-500 !border-slate-900 top-0" style={{ top: '30%' }} />
            </div>

            <div className="absolute -right-3 bottom-1/3 flex items-center">
                <span className="absolute right-4 text-[9px] text-red-500 font-bold uppercase tracking-wider">FALSE</span>
                <Handle type="source" position={Position.Right} id="false" className="w-2.5 h-2.5 !bg-red-500 !border-slate-900 top-0" style={{ top: '70%' }} />
            </div>
        </div>
    );
});
