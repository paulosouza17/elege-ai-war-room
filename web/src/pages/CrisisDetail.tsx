import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { AlertOctagon, Clock, User, CheckCircle, FileText, Shield, ArrowLeft, BrainCircuit, Plus, X, MessageSquare, Save, Link2, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrisisPacket } from '@/types/crisis';
import { Dialog } from '@/components/ui/Dialog';

export const CrisisDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [crisis, setCrisis] = useState<CrisisPacket | null>(null);
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState<any>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [evidences, setEvidences] = useState<any[]>([]);
    const [loadingEvidences, setLoadingEvidences] = useState(false);

    // Bundled Mentions State
    const [bundledMentions, setBundledMentions] = useState<any[]>([]);
    const [loadingBundled, setLoadingBundled] = useState(false);
    const [bundlePage, setBundlePage] = useState(1);
    const BUNDLE_PAGE_SIZE = 10;

    // Refinement State
    const [userFeedback, setUserFeedback] = useState('');
    const [isEditingPlan, setIsEditingPlan] = useState(false);

    // Comments State
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (id) {
            fetchCrisis(id);
            fetchEvidences(id);
        }
    }, [id]);

    // Fetch bundled mentions when crisis loads (uses evidence_ids)
    useEffect(() => {
        if (crisis?.evidence_ids && crisis.evidence_ids.length > 0) {
            fetchBundledMentions(crisis.evidence_ids);
        }
    }, [crisis?.evidence_ids]);

    const fetchBundledMentions = async (evidenceIds: string[]) => {
        setLoadingBundled(true);
        try {
            const { data, error } = await supabase
                .from('intelligence_feed')
                .select('*')
                .in('id', evidenceIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBundledMentions(data || []);
        } catch (error) {
            console.error('Error fetching bundled mentions:', error);
        } finally {
            setLoadingBundled(false);
        }
    };

    // Pagination for bundled mentions
    const paginatedBundled = useMemo(() => {
        const start = (bundlePage - 1) * BUNDLE_PAGE_SIZE;
        return bundledMentions.slice(start, start + BUNDLE_PAGE_SIZE);
    }, [bundledMentions, bundlePage]);

    const totalBundlePages = Math.max(1, Math.ceil(bundledMentions.length / BUNDLE_PAGE_SIZE));

    const fetchCrisis = async (crisisId: string) => {
        try {
            const { data, error } = await supabase
                .from('crisis_packets')
                .select('*')
                .eq('id', crisisId)
                .single();

            if (error) throw error;
            setCrisis(data);

            if (data.user_feedback) {
                setUserFeedback(data.user_feedback);
            }
            if (data.comments) {
                setComments(data.comments);
            }

            if (data.plan) {
                // Normalize plan: ensure all actions have checked boolean
                const loadedPlan = { ...data.plan };
                if (loadedPlan.phases) {
                    loadedPlan.phases = loadedPlan.phases.map((phase: any) => ({
                        ...phase,
                        actions: (phase.actions || []).map((action: any) =>
                            typeof action === 'string' ? { text: action, checked: false } : { ...action, checked: !!action.checked }
                        )
                    }));
                }
                setPlan(loadedPlan);
            } else {
                generatePlan(data);
            }
        } catch (error) {
            console.error('Error fetching crisis details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEvidences = async (crisisId: string) => {
        setLoadingEvidences(true);
        try {
            const { data, error } = await supabase
                .from('crisis_evidence')
                .select('*')
                .eq('crisis_id', crisisId)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            setEvidences(data || []);
        } catch (error) {
            console.error('Error fetching evidences:', error);
        } finally {
            setLoadingEvidences(false);
        }
    };

    const generatePlan = async (crisisData: CrisisPacket, feedback?: string) => {
        setLoadingPlan(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        try {
            const response = await fetch(`${API_URL}/api/v1/crisis/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    crisisId: crisisData.id,
                    title: crisisData.title,
                    description: crisisData.description || crisisData.summary || '',
                    summary: crisisData.summary || '',
                    severity: crisisData.severity,
                    userFeedback: feedback
                })
            });
            const result = await response.json();
            if (result.success) {
                const structuredPlan = { ...result.plan };
                if (structuredPlan.phases) {
                    structuredPlan.phases = structuredPlan.phases.map((phase: any) => ({
                        ...phase,
                        actions: phase.actions.map((action: any) =>
                            typeof action === 'string' ? { text: action, checked: false } : { ...action, checked: !!action.checked }
                        )
                    }));
                }
                setPlan(structuredPlan);
                // Persist to DB (backend already saves via route, but also save structured version)
                savePlanToDB(structuredPlan);
            } else {
                alert(`Erro ao gerar plano: ${result.message}`);
            }
        } catch (error) {
            console.error("Failed to generate plan:", error);
            alert('⚠️ Backend não está rodando. Execute: cd backend && npm run dev');
        } finally {
            setLoadingPlan(false);
        }
    };

    const handleApprovePlan = async () => {
        if (!crisis) return;
        try {
            const { error } = await supabase
                .from('crisis_packets')
                .update({ status: 'active' }) // or 'responding' depending on enum
                .eq('id', crisis.id);

            if (error) throw error;

            setCrisis({ ...crisis, status: 'active' });
            alert('Plano aprovado! Status da crise alterado para ATIVO.');
        } catch (error: any) {
            console.error('Error approving plan:', error);
            alert('Erro ao aprovar plano.');
        }
    };

    const handleToggleAction = async (phaseIdx: number, actionIdx: number) => {
        if (!plan || !crisis) return;

        const newPlan = { ...plan };
        const action = newPlan.phases[phaseIdx].actions[actionIdx];

        // Toggle check
        action.checked = !action.checked;
        setPlan(newPlan);

        savePlanToDB(newPlan);
    };

    // --- Plan Editing Features ---

    const addActionToPhase = (phaseIdx: number) => {
        if (!plan) return;
        const newPlan = { ...plan };
        const newActionText = prompt("Nova Ação:");
        if (newActionText) {
            newPlan.phases[phaseIdx].actions.push({ text: newActionText, checked: false });
            setPlan(newPlan);
            savePlanToDB(newPlan);
        }
    };

    const removeActionFromPhase = (phaseIdx: number, actionIdx: number) => {
        if (!plan) return;
        if (!confirm("Remover esta ação do plano?")) return;

        const newPlan = { ...plan };
        newPlan.phases[phaseIdx].actions.splice(actionIdx, 1);
        setPlan(newPlan);
        savePlanToDB(newPlan);
    };

    const savePlanToDB = async (updatedPlan: any) => {
        if (!crisis) return;
        try {
            const { error } = await supabase
                .from('crisis_packets')
                .update({ plan: updatedPlan })
                .eq('id', crisis.id);

            if (error) throw error;
        } catch (error) {
            console.error('Failed to save plan progress:', error);
        }
    };

    // --- Comments Features ---

    const handleAddComment = async () => {
        if (!crisis || !newComment.trim()) return;

        const commentObj = {
            id: Date.now().toString(),
            text: newComment,
            author: 'Admin', // Replace with auth user name
            timestamp: new Date().toISOString()
        };

        const updatedComments = [...comments, commentObj];
        setComments(updatedComments);
        setNewComment('');

        try {
            const { error } = await supabase
                .from('crisis_packets')
                .update({ comments: updatedComments })
                .eq('id', crisis.id);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to save comment:", error);
            alert("Erro ao salvar comentário.");
        }
    };


    // State for Evidence Dialog
    const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);
    const [newEvidence, setNewEvidence] = useState({ type: 'link', url: '', description: '' });
    const [submittingEvidence, setSubmittingEvidence] = useState(false);

    const handleOpenEvidenceDialog = () => {
        setNewEvidence({ type: 'link', url: '', description: '' });
        setIsEvidenceDialogOpen(true);
    };

    const handleSubmitEvidence = async () => {
        if (!crisis || !newEvidence.url) return;

        setSubmittingEvidence(true);
        try {
            const { error } = await supabase
                .from('crisis_evidence')
                .insert({
                    crisis_id: crisis.id,
                    type: newEvidence.type,
                    url: newEvidence.url,
                    description: newEvidence.description || 'Sem descrição',
                    uploaded_at: new Date().toISOString()
                });

            if (error) throw error;

            await fetchEvidences(crisis.id);
            setIsEvidenceDialogOpen(false);
        } catch (error: any) {
            console.error('Error adding evidence:', error);
            alert(`Erro ao adicionar evidência: ${error.message}`);
        } finally {
            setSubmittingEvidence(false);
        }
    };

    if (loading) return <div className="text-white p-10">Carregando detalhes...</div>;
    if (!crisis) return <div className="text-white p-10">Crise não encontrada.</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <Button variant="ghost" onClick={() => navigate('/crisis')} className="mb-4 pl-0 hover:pl-2 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Lista
            </Button>

            {/* Header do Incidente */}
            <div className={`bg-surface border rounded-lg p-6 shadow-lg ${crisis.severity === 'high' ? 'border-danger/30 shadow-danger/5' : 'border-slate-700'}`}>
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Badge variant={crisis.severity === 'high' ? 'danger' : 'warning'} className="text-sm px-3 py-1">
                                {{ high: 'ALTA', medium: 'MÉDIA', low: 'BAIXA', critical: 'CRÍTICA' }[crisis.severity] || crisis.severity.toUpperCase()} SEVERIDADE
                            </Badge>
                            <span className="text-slate-500 font-mono">ID: {crisis.id.slice(0, 8)}</span>
                            <span className="flex items-center text-slate-400 font-bold">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(crisis.created_at).toLocaleString()}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {crisis.title}
                        </h1>
                        <p className="text-slate-300 max-w-3xl">
                            {crisis.description}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button variant="danger" size="lg" className="shadow-lg shadow-danger/20" onClick={handleApprovePlan}>
                            <Shield className="w-5 h-5 mr-2" />
                            Aprovar Plano
                        </Button>
                    </div>
                </div>

                <div className="flex gap-6 mt-6 pt-6 border-t border-slate-700/50 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                        <User className="w-4 h-4" />
                        Responsável: <span className="text-white font-medium">Admin</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <CheckCircle className="w-4 h-4 text-warning" />
                        Status: <span className="text-warning font-medium uppercase">{{ active: 'ATIVO', resolved: 'RESOLVIDO', archived: 'ARQUIVADO', pending_approval: 'AGUARDANDO APROVAÇÃO', draft: 'RASCUNHO' }[crisis.status] || crisis.status}</span>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <Tabs defaultValue="plan" className="space-y-4">
                <TabsList className="bg-surface border border-slate-700/50 p-1 w-full justify-start h-12">
                    <TabsTrigger value="plan" className="data-[state=active]:bg-primary px-6">
                        <Shield className="w-4 h-4 mr-2" />
                        Plano de Resposta
                    </TabsTrigger>
                    <TabsTrigger value="mentions" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white px-6">
                        <Newspaper className="w-4 h-4 mr-2" />
                        Menções Vinculadas
                        {bundledMentions.length > 0 && (
                            <span className="ml-1.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {bundledMentions.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="evidence" className="data-[state=active]:bg-danger data-[state=active]:text-white px-6">
                        <AlertOctagon className="w-4 h-4 mr-2" />
                        Anexos
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="data-[state=active]:bg-secondary data-[state=active]:text-white px-6">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Comentários
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="plan" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Coluna Esquerda: Estratégia */}
                        <Card className="md:col-span-2">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    Estratégia Recomendada
                                    {loadingPlan && <span className="text-xs text-slate-500 font-normal animate-pulse">Gerando estratégia...</span>}
                                </CardTitle>
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditingPlan(!isEditingPlan)}>
                                    {isEditingPlan ? 'Parar Edição' : 'Editar Ações'}
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Refinement Box */}
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
                                    <label className="text-sm font-medium text-slate-300">Observações para Refinar o Plano</label>
                                    <textarea
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white resize-none outline-none focus:border-primary"
                                        rows={2}
                                        placeholder="Ex: O cliente nega a acusação; A mídia ainda não publicou nada..."
                                        value={userFeedback}
                                        onChange={(e) => setUserFeedback(e.target.value)}
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => generatePlan(crisis!, userFeedback)}
                                            disabled={loadingPlan}
                                        >
                                            <BrainCircuit className="w-4 h-4 mr-2" />
                                            {loadingPlan ? 'Gerando...' : 'Regerar e Refinar com IA'}
                                        </Button>
                                    </div>
                                </div>

                                {plan ? (
                                    <>
                                        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                                            <h4 className="font-bold text-white mb-2">{plan.strategy_name}</h4>
                                            <p className="text-slate-400 text-sm">
                                                {plan.objective}
                                            </p>
                                        </div>

                                        {plan.phases?.map((phase: any, idx: number) => (
                                            <div key={idx} className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-white flex items-center gap-2">
                                                        <span className="bg-slate-700 text-xs px-2 py-1 rounded">FASE {idx + 1}</span>
                                                        {phase.name}
                                                    </h4>
                                                    {isEditingPlan && (
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => addActionToPhase(idx)}>
                                                            <Plus className="w-4 h-4 text-primary" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <ul className="space-y-3">
                                                    {phase.actions.map((action: any, actionIdx: number) => {
                                                        const isChecked = !!action.checked;

                                                        return (
                                                            <li key={actionIdx} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50 group">
                                                                <input
                                                                    type="checkbox"
                                                                    className="mt-1 rounded bg-slate-900 border-slate-600 cursor-pointer"
                                                                    checked={isChecked}
                                                                    onChange={() => handleToggleAction(idx, actionIdx)}
                                                                />
                                                                <span className={`text-sm flex-1 ${isChecked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                                                    {action.text}
                                                                </span>
                                                                {isEditingPlan && (
                                                                    <button
                                                                        onClick={() => removeActionFromPhase(idx, actionIdx)}
                                                                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-danger"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="text-center py-10 text-slate-500">
                                        Clique em "Regerar com IA" para obter um plano.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Coluna Direita: Contexto */}
                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-danger/20">
                                <CardHeader>
                                    <CardTitle className="text-base text-danger">Riscos Identificados</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {plan ? (
                                        plan.risks?.map((risk: any, idx: number) => (
                                            <div key={idx}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-slate-400">{risk.type}</span>
                                                    <span className={`font-bold ${risk.level === 'High' ? 'text-danger' : risk.level === 'Medium' ? 'text-warning' : 'text-slate-300'}`}>
                                                        {({ High: 'ALTO', Medium: 'MÉDIO', Low: 'BAIXO' } as Record<string, string>)[risk.level] || risk.level.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">{risk.description}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 text-sm">Aguardando análise...</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="mentions">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-amber-400" />
                                Menções Vinculadas ao Pacote de Crise
                                <span className="text-sm font-normal text-slate-500">({bundledMentions.length} matérias)</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingBundled ? (
                                <p className="text-slate-500 text-center py-8 animate-pulse">Carregando menções vinculadas...</p>
                            ) : bundledMentions.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg">
                                    <Newspaper className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                    <p className="text-slate-400">Nenhuma menção vinculada a este pacote.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {paginatedBundled.map((m: any) => (
                                            <div key={m.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-amber-500/20 transition-all">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${m.sentiment === 'negative' ? 'bg-red-500' :
                                                        m.sentiment === 'positive' ? 'bg-emerald-500' : 'bg-slate-500'
                                                        }`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 text-xs text-slate-500">
                                                            <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 capitalize font-medium">
                                                                {m.source || 'Desconhecido'}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(m.created_at).toLocaleString()}
                                                            </span>
                                                            {!m.bundle_id && (
                                                                <Badge variant="danger" className="text-[9px] px-1 py-0">
                                                                    PRINCIPAL
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-200 leading-relaxed line-clamp-3">
                                                            {m.text || m.summary || m.title || 'Sem conteúdo'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${m.sentiment === 'negative' ? 'text-red-400 border-red-900 bg-red-950/30' :
                                                                m.sentiment === 'positive' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/30' :
                                                                    'text-slate-400 border-slate-700 bg-slate-800/30'
                                                                }`}>
                                                                {m.sentiment === 'negative' ? 'Negativo' : m.sentiment === 'positive' ? 'Positivo' : 'Neutro'}
                                                            </span>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 text-slate-400 bg-slate-800/30">
                                                                Risco: {m.risk_score}/100
                                                            </span>
                                                            {m.classification_metadata?.keywords?.slice(0, 4).map((kw: string) => (
                                                                <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/20 text-amber-400 bg-amber-500/5">
                                                                    #{kw}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {m.url && (
                                                            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 block truncate max-w-md">
                                                                {m.url}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalBundlePages > 1 && (
                                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
                                            <span className="text-sm text-slate-500">
                                                Página {bundlePage} de {totalBundlePages}
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={bundlePage === 1}
                                                    onClick={() => setBundlePage(p => p - 1)}
                                                >
                                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                                    Anterior
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={bundlePage === totalBundlePages}
                                                    onClick={() => setBundlePage(p => p + 1)}
                                                >
                                                    Próxima
                                                    <ChevronRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="evidence">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Evidências Vinculadas</CardTitle>
                            <Button size="sm" onClick={handleOpenEvidenceDialog}>
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Evidência
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loadingEvidences ? (
                                <p className="text-slate-500">Carregando evidências...</p>
                            ) : evidences.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg">
                                    <p className="text-slate-400 mb-2">Nenhuma evidência vinculada.</p>
                                    <Button variant="ghost" size="sm" onClick={handleOpenEvidenceDialog}>Adicionar a primeira</Button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {evidences.map((evidence) => (
                                        <div key={evidence.id} className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-all">
                                            <div className="p-2 bg-slate-800 rounded text-slate-400">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-white">{evidence.description || 'Sem descrição'}</h4>
                                                <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block max-w-md">
                                                    {evidence.url}
                                                </a>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-700 text-slate-500 uppercase">{evidence.type}</Badge>
                                                    <span className="text-xs text-slate-600">
                                                        {new Date(evidence.uploaded_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="comments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Comentários e Notas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Input de Comentário */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-white focus:border-primary outline-none"
                                        placeholder="Escreva um comentário..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                    />
                                </div>
                                <Button onClick={handleAddComment}>
                                    Enviar
                                </Button>
                            </div>

                            {/* Lista de Comentários */}
                            <div className="space-y-4">
                                {comments.length === 0 ? (
                                    <p className="text-slate-500 text-center py-4">Nenhum comentário ainda.</p>
                                ) : (
                                    comments.slice().reverse().map((comment: any) => (
                                        <div key={comment.id} className="flex gap-4 bg-slate-900/30 p-4 rounded-lg border border-slate-800">
                                            <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">
                                                {comment.author[0]}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-white">{comment.author}</span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(comment.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-slate-300">{comment.text}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Evidence Dialog */}
            <Dialog
                isOpen={isEvidenceDialogOpen}
                onClose={() => setIsEvidenceDialogOpen(false)}
                title="Adicionar Nova Evidência"
                description="Vincule URLs, documentos ou imagens relevantes a esta crise."
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="ghost" onClick={() => setIsEvidenceDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmitEvidence} disabled={submittingEvidence || !newEvidence.url}>
                            {submittingEvidence ? 'Salvando...' : 'Adicionar Evidência'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Tipo de Evidência</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={newEvidence.type}
                            onChange={(e) => setNewEvidence({ ...newEvidence, type: e.target.value })}
                        >
                            <option value="link">Link (URL)</option>
                            <option value="image">Imagem</option>
                            <option value="document">Documento</option>
                            <option value="video">Vídeo</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">URL / Link *</label>
                        <input
                            type="url"
                            placeholder="https://..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={newEvidence.url}
                            onChange={(e) => setNewEvidence({ ...newEvidence, url: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Descrição</label>
                        <textarea
                            placeholder="Descreva o conteúdo desta evidência..."
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                            value={newEvidence.description}
                            onChange={(e) => setNewEvidence({ ...newEvidence, description: e.target.value })}
                        />
                    </div>
                </div>
            </Dialog>
        </div >
    );
};
