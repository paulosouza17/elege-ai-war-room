import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, Play, Edit, Trash2, Calendar, ToggleLeft, ToggleRight, Loader, Zap, LayoutTemplate, X, Copy, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { FLOW_TEMPLATES, TEMPLATE_CATEGORIES } from '@/data/flowTemplates';
import { useUserActivations } from '@/hooks/useUserActivations';

export const FlowsList: React.FC = () => {
    const navigate = useNavigate();
    const [flows, setFlows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);
    const { activationIds, loading: activationsLoading } = useUserActivations();

    useEffect(() => {
        if (activationsLoading) return;
        if (activationIds.length === 0) {
            setFlows([]);
            setLoading(false);
            return;
        }
        fetchFlows();
    }, [activationIds, activationsLoading]);

    const fetchFlows = async () => {
        try {
            // Fetch flows
            const { data: flowsData, error: flowsError } = await supabase
                .from('flows')
                .select('*')
                .order('created_at', { ascending: false });

            if (flowsError) throw flowsError;

            // Fetch active demands (running executions) for each flow
            const { data: demandsData, error: demandsError } = await supabase
                .from('demands')
                .select('flow_id, status')
                .in('status', ['active', 'pending']);

            if (demandsError) console.error('Error fetching demands:', demandsError);

            // Fetch assignment counts
            const { data: assignmentsData } = await supabase
                .from('flow_assignments')
                .select('flow_id, user_id, activation_id')
                .eq('active', true);

            // Build assignment count map
            const assignmentMap: Record<string, { users: number; activations: number }> = {};
            (assignmentsData || []).forEach(a => {
                if (!assignmentMap[a.flow_id]) assignmentMap[a.flow_id] = { users: 0, activations: 0 };
                if (a.user_id) assignmentMap[a.flow_id].users++;
                if (a.activation_id) assignmentMap[a.flow_id].activations++;
            });

            // Merge execution status and assignments with flows
            const flowsWithStatus = (flowsData || []).map(flow => ({
                ...flow,
                isRunning: demandsData?.some(d => d.flow_id === flow.id && d.status === 'active') || false,
                assignedUsers: assignmentMap[flow.id]?.users || 0,
                assignedActivations: assignmentMap[flow.id]?.activations || 0
            }));

            setFlows(flowsWithStatus);
        } catch (error) {
            console.error('Error fetching flows:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteFlow = async (flowId: string) => {
        if (!confirm('Deseja executar este fluxo agora?')) return;

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            const { data: session } = await supabase.auth.getSession();
            const userId = (await supabase.auth.getUser()).data.user?.id;

            const res = await fetch(`${backendUrl}/api/flows/${flowId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session?.access_token}`,
                },
                body: JSON.stringify({
                    title: 'Execução manual',
                    description: 'Disparada pela lista de fluxos',
                    source: 'manual_execution_from_list',
                    userId,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao executar');

            showToast.success('Execução iniciada!');
            fetchFlows();
        } catch (error: any) {
            console.error('Execution error:', error);
            showToast.error('Erro ao executar fluxo: ' + error.message);
        }
    };

    const handleToggleActive = async (flowId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('flows')
                .update({ active: !currentStatus })
                .eq('id', flowId);

            if (error) throw error;
            fetchFlows();
        } catch (error) {
            console.error('Error toggling flow:', error);
            alert('Erro ao alterar status do fluxo.');
        }
    };

    const handleDeleteFlow = async (flowId: string, flowName: string) => {
        if (!confirm(`Tem certeza que deseja excluir o fluxo "${flowName}"? Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.`)) return;

        try {
            const { error } = await supabase
                .from('flows')
                .delete()
                .eq('id', flowId);

            if (error) throw error;
            showToast.success('Fluxo excluído!');
            fetchFlows();
        } catch (error: any) {
            console.error('Error deleting flow:', error);
            showToast.error('Erro ao excluir fluxo: ' + error.message);
        }
    };

    const handleDuplicateFlow = async (flow: any) => {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            const { data, error } = await supabase
                .from('flows')
                .insert({
                    name: `${flow.name || 'Fluxo'} (Cópia)`,
                    description: flow.description || '',
                    nodes: flow.nodes || [],
                    edges: flow.edges || [],
                    active: false,
                    user_id: user?.id,
                })
                .select('id')
                .single();

            if (error) throw error;

            showToast.success('Fluxo duplicado!');
            if (data?.id) {
                navigate(`/flows/builder?id=${data.id}`);
            } else {
                fetchFlows();
            }
        } catch (error: any) {
            console.error('Error duplicating flow:', error);
            showToast.error('Erro ao duplicar fluxo: ' + error.message);
        }
    };

    const filteredFlows = flows.filter(f =>
        f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Play className="w-8 h-8 text-primary" />
                        Automa\u00e7\u00f5es (Flows)
                    </h1>
                    <p className="text-slate-400">Gerencie e execute fluxos automatizados.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowTemplates(true)}>
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Usar Modelo
                    </Button>
                    <Button onClick={() => navigate('/flows/builder')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Fluxo
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-surface p-4 rounded-lg border border-slate-700/60">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        placeholder="Buscar fluxo..."
                        className="pl-10 bg-slate-900 border-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Carregando fluxos...</div>
            ) : filteredFlows.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                    <p className="mb-2">Nenhum fluxo encontrado.</p>
                    <Button variant="outline" onClick={() => navigate('/flows/builder')}>Criar Primeiro Fluxo</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFlows.map((flow) => (
                        <Card key={flow.id} className="hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-2">
                                        <Badge className={`${flow.active ? 'bg-success/20 text-success' : 'bg-slate-700 text-slate-400'}`}>
                                            {flow.active ? 'ATIVO' : 'INATIVO'}
                                        </Badge>
                                        {flow.isRunning && (
                                            <Badge className="bg-warning/20 text-warning flex items-center gap-1">
                                                <Loader className="w-3 h-3 animate-spin" />
                                                EM EXECUÇÃO
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleToggleActive(flow.id, flow.active)}
                                            title={flow.active ? 'Desativar' : 'Ativar'}
                                        >
                                            {flow.active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => navigate(`/flows/builder?id=${flow.id}`)}
                                            title="Editar"
                                        >
                                            <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleDuplicateFlow(flow)}
                                            title="Duplicar Fluxo"
                                        >
                                            <Copy className="w-3 h-3 text-slate-400" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:text-danger"
                                            onClick={() => handleDeleteFlow(flow.id, flow.name)}
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                                <CardTitle className="mt-2 text-lg text-white truncate">
                                    {flow.name || 'Fluxo sem nome'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-slate-400 line-clamp-2">
                                    {flow.description || 'Sem descri\u00e7\u00e3o'}
                                </p>
                                <div className="space-y-2 text-sm text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        <span>{new Date(flow.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500">N\u00f3s:</span>
                                        <span>{flow.nodes?.length || 0}</span>
                                    </div>
                                    {(flow.assignedUsers > 0 || flow.assignedActivations > 0) && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {flow.assignedUsers > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                                                    <Users className="w-3 h-3" /> {flow.assignedUsers} usu{'\u00e1'}rio{flow.assignedUsers > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {flow.assignedActivations > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                    <Zap className="w-3 h-3" /> {flow.assignedActivations} ativa{'\u00e7\u00e3o'}{flow.assignedActivations > 1 ? 'es' : ''}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleExecuteFlow(flow.id)}
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    Executar Agora
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Template Gallery Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowTemplates(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <LayoutTemplate className="w-5 h-5 text-primary" />
                                    Modelos de Fluxo
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">Escolha um modelo pronto para começar rapidamente</p>
                            </div>
                            <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {FLOW_TEMPLATES.map((template) => {
                                    const cat = TEMPLATE_CATEGORIES[template.category];
                                    return (
                                        <div
                                            key={template.id}
                                            className="group bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-primary/50 hover:bg-slate-800 transition-all cursor-pointer"
                                            onClick={() => {
                                                navigate(`/flows/builder?template=${template.id}`);
                                                setShowTemplates(false);
                                            }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="text-3xl flex-shrink-0 mt-0.5">{template.icon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-bold text-white truncate">{template.name}</h3>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/50 ${cat.color} font-medium flex-shrink-0`}>
                                                            {cat.icon} {cat.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{template.description}</p>
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <span className="text-[10px] text-slate-500">{template.nodes.length} nós · {template.edges.length} conexões</span>
                                                        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">Usar este modelo →</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
