import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Zap, Plus, Search, Filter, Hash, User, Calendar, CheckCircle2, Users, Edit2, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { ActivationSharing } from '@/components/ActivationSharing';
import { usePermission } from '@/hooks/usePermission';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export const ActivationsList: React.FC = () => {
    const navigate = useNavigate();
    const { hasRole } = usePermission();
    const [activations, setActivations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedActivation, setSelectedActivation] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
    const [reviewActivation, setReviewActivation] = useState<any>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchActivations();
    }, []);

    const fetchActivations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // Get role from profiles table (same source as RLS policies)
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const isAdmin = profile?.role === 'admin';

            if (isAdmin) {
                // Admin sees everything
                const { data, error } = await supabase
                    .from('activations')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setActivations(data || []);
            } else {
                // Non-admin: ONLY activations explicitly shared via activation_users
                const { data: sharedRows } = await supabase
                    .from('activation_users')
                    .select('activation_id')
                    .eq('user_id', user.id);

                const sharedIds = (sharedRows || []).map(r => r.activation_id);

                let allActivations: any[] = [];
                if (sharedIds.length > 0) {
                    const { data, error } = await supabase
                        .from('activations')
                        .select('*')
                        .in('id', sharedIds)
                        .order('created_at', { ascending: false });
                    if (error) throw error;
                    allActivations = data || [];
                }

                setActivations(allActivations);
            }
        } catch (error) {
            console.error('Error fetching activations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (id: string) => {
        if (!confirm('Arquivar esta ativação? Os meta-dados serão mantidos, mas ela não aparecerá mais na lista ativa.')) return;
        try {
            const { error } = await supabase
                .from('activations')
                .update({ status: 'archived' })
                .eq('id', id);
            if (error) throw error;
            alert('Ativação arquivada com sucesso!');
            fetchActivations();
        } catch (error: any) {
            console.error('Error archiving activation:', error);
            alert('Erro ao arquivar: ' + error.message);
        }
    };

    const handleUpdateStatus = async (id: string, status: 'active' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('activations')
                .update({
                    status,
                    admin_feedback: reviewNotes
                })
                .eq('id', id);

            if (error) throw error;

            // Trigger Flows if Approved
            if (status === 'active') {
                console.log('🚀 Triggering Activation Flows...');
                // 1. Fetch flows with 'activation' trigger
                const { data: flows } = await supabase
                    .from('flows')
                    .select('id, nodes')
                    .eq('active', true);

                const activationFlows = flows?.filter(f =>
                    f.nodes.some((n: any) => n.data?.triggerType === 'activation')
                ) || [];

                if (activationFlows.length > 0) {
                    console.log(`Found ${activationFlows.length} flows to trigger.`);

                    // 2. Create Execution for each flow
                    for (const flow of activationFlows) {
                        const { error: execError } = await supabase
                            .from('flow_executions')
                            .insert({
                                flow_id: flow.id,
                                status: 'pending',
                                context: {
                                    trigger: 'activation_event',
                                    activation_id: id,
                                    keywords: reviewActivation.keywords || [],
                                    sources: reviewActivation.sources_config?.selected || []
                                }
                            });

                        if (execError) console.error('Error triggering flow:', execError);
                    }
                    alert(`Ativação Aprovada! ${activationFlows.length} fluxos foram iniciados.`);
                } else {
                    alert('Ativação Aprovada! Nenhum fluxo automático foi encontrado para disparar.');
                }
            } else {
                alert('Ativação Rejeitada com sucesso.');
            }

            setReviewActivation(null);
            setReviewNotes('');
            fetchActivations();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erro ao atualizar status.');
        }
    };

    const filteredActivations = activations.filter(a =>
        activeTab === 'active' ? (a.status === 'active' || a.status === 'inactive') : a.status === 'pending'
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Zap className="w-8 h-8 text-warning" />
                        Ativações de Monitoramento
                    </h1>
                    <p className="text-slate-400">Gerencie os assuntos e perímetros ativos no sistema.</p>
                </div>
                {hasRole(['admin', 'analyst']) && (
                    <Button onClick={() => navigate('/activations/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Ativação
                    </Button>
                )}
            </div>

            {hasRole(['admin']) && (
                <div className="flex gap-2 border-b border-slate-700">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('active')}
                    >
                        Ativas
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-warning text-warning' : 'border-transparent text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pendentes de Aprovação
                        {activations.filter(a => a.status === 'pending').length > 0 && (
                            <span className="ml-2 bg-warning/20 text-warning text-xs px-1.5 py-0.5 rounded-full">
                                {activations.filter(a => a.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>
            )}

            <div className="flex gap-4 items-center bg-surface p-4 rounded-lg border border-slate-700/60">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input placeholder="Buscar assunto, candidato ou tema..." className="pl-10 bg-slate-900 border-slate-700" />
                </div>
                <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Status
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-3 text-center py-10 text-slate-500">Carregando ativações...</div>
                ) : filteredActivations.length === 0 ? (
                    <div className="col-span-3 text-center py-10 text-slate-500">
                        <p className="mb-2">Nenhuma ativação {activeTab === 'active' ? 'ativa' : 'pendente'} encontrada.</p>
                        {activeTab === 'active' && hasRole(['admin', 'analyst']) && (
                            <Button variant="outline" onClick={() => navigate('/activations/new')}>Criar Primeira Ativação</Button>
                        )}
                    </div>
                ) : (
                    filteredActivations.map((activation) => (
                        <Card
                            key={activation.id}
                            className="hover:border-primary/50 transition-colors group cursor-pointer"
                            onClick={() => navigate(`/activations/${activation.id}`)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge className={`${activation.status === 'active' ? 'bg-success/20 text-success' : activation.status === 'pending' ? 'bg-warning/20 text-warning' : 'bg-slate-700 text-slate-400'}`}>
                                        {activation.status === 'active' ? 'ATIVO' : activation.status === 'pending' ? 'PENDENTE' : activation.status.toUpperCase()}
                                    </Badge>
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        {(activation.status === 'active' || activation.status === 'pending') && (hasRole(['admin']) || activation.created_by === currentUserId) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-slate-400 hover:text-white"
                                                onClick={() => navigate(`/activations/${activation.id}/edit`)}
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {activation.status === 'active' && hasRole(['admin']) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-slate-400 hover:text-red-400"
                                                onClick={() => handleArchive(activation.id)}
                                                title="Arquivar"
                                            >
                                                <Archive className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {activation.status === 'pending' && hasRole(['admin']) && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="h-8 px-2 bg-warning text-black hover:bg-warning/90"
                                                onClick={() => setReviewActivation(activation)}
                                            >
                                                Avaliar
                                            </Button>
                                        )}
                                        {hasRole(['admin']) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2"
                                                onClick={() => setSelectedActivation(activation)}
                                            >
                                                <Users className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <CardTitle className="mt-2 text-lg text-white group-hover:text-primary transition-colors truncate">
                                    {activation.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 text-sm text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-slate-500" />
                                        <span>{activation.keywords?.length || 0} Palavras-chave</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-500" />
                                        <span>{activation.people_of_interest?.length || 0} Pessoas de Interesse</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        <span>{new Date(activation.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>

                                {activation.admin_feedback && (
                                    <div className="p-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300">
                                        <strong>Admin:</strong> {activation.admin_feedback}
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center text-xs">
                                    <span className="text-slate-500 truncate max-w-[120px]">Cat: <strong>{activation.category}</strong></span>
                                    <div className="flex items-center text-success">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        <span>{activation.status === 'active' ? 'Monitorando' : 'Aguardando'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Sharing Modal */}
            {selectedActivation && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-950 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-800">
                        <div className="sticky top-0 bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white">Gerenciar Acesso</h2>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedActivation(null)}>
                                Fechar
                            </Button>
                        </div>
                        <div className="p-4">
                            <ActivationSharing
                                activationId={selectedActivation.id}
                                activationName={selectedActivation.name}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewActivation && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-950 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-800">
                        <div className="p-6 space-y-4">
                            <h2 className="text-xl font-bold text-white">Avaliar Solicitação</h2>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Briefing do Usuário</label>
                                <div className="p-3 bg-slate-900 rounded border border-slate-800 text-sm text-white">
                                    {reviewActivation.description || "Nenhuma descrição fornecida."}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Insight Prévio</label>
                                <div className="p-3 bg-indigo-950/30 rounded border border-indigo-500/30 text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-indigo-300">Volume Estimado:</span>
                                        <span className="text-white font-bold">{reviewActivation.insight_preview?.estimated_volume || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-indigo-300">Complexidade:</span>
                                        <span className="text-white font-bold">{reviewActivation.insight_preview?.complexity_score || 0}/100</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-indigo-300">Fontes Rec.:</span>
                                        <span className="text-white">{reviewActivation.insight_preview?.recommended_sources?.join(', ') || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Feedback do Admin (Opcional)</label>
                                <textarea
                                    className="w-full h-20 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none"
                                    placeholder="Escreva um comentário para o solicitante..."
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400"
                                    onClick={() => handleUpdateStatus(reviewActivation.id, 'rejected')}
                                >
                                    Rejeitar
                                </Button>
                                <Button
                                    className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-400"
                                    onClick={() => handleUpdateStatus(reviewActivation.id, 'active')}
                                >
                                    Aprovar e Ativar
                                </Button>
                            </div>
                            <Button
                                variant="ghost"
                                className="w-full mt-2"
                                onClick={() => {
                                    setReviewActivation(null);
                                    setReviewNotes('');
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
