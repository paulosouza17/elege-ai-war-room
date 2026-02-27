import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, FileText, Calendar, Hash, User, Wifi } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const ActivationBriefing: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activation, setActivation] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchActivation();
    }, [id]);

    const fetchActivation = async () => {
        try {
            const { data, error } = await supabase
                .from('activations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setActivation(data);
        } catch (error) {
            console.error('Error fetching activation:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-500">Carregando briefing...</p>
            </div>
        );
    }

    if (!activation) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <p className="text-slate-500">Ativação não encontrada.</p>
                <Button onClick={() => navigate('/activations')}>Voltar para Lista</Button>
            </div>
        );
    }

    const mediaLabels: Record<string, string> = {
        'tvs': 'TVs',
        'radios': 'Rádios',
        'portais': 'Portais de Notícias',
        'redes-sociais': 'Redes Sociais',
        'pessoas': 'Pessoas'
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <Button variant="ghost" size="sm" onClick={() => navigate('/activations')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Lista
            </Button>

            <div className="space-y-2 mb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                            <FileText className="w-8 h-8 text-primary" />
                            Briefing de Ativação
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Documento estruturado com todos os parâmetros da ativação.
                        </p>
                    </div>
                    <Badge className={`${activation.status === 'active' ? 'bg-success/20 text-success' : 'bg-slate-700 text-slate-400'}`}>
                        {activation.status === 'active' ? 'ATIVO' : activation.status.toUpperCase()}
                    </Badge>
                </div>
            </div>

            {/* Identification */}
            <Card>
                <CardHeader>
                    <CardTitle>1. Identificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide">Nome da Ativação</label>
                            <p className="text-white text-lg font-medium mt-1">{activation.name}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide">Categoria</label>
                            <p className="text-white mt-1">{activation.category || 'Não especificada'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide">Prioridade</label>
                            <Badge className={`mt-1 ${activation.priority === 'crítica' ? 'bg-danger/20 text-danger' : activation.priority === 'alta' ? 'bg-warning/20 text-warning' : 'bg-slate-700'}`}>
                                {activation.priority?.toUpperCase() || 'NORMAL'}
                            </Badge>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Data de Criação
                            </label>
                            <p className="text-white mt-1">{new Date(activation.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                <Wifi className="w-3 h-3" />
                                Status
                            </label>
                            <p className="text-white mt-1">{activation.status === 'active' ? 'Monitoramento Ativo' : 'Inativo'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Keywords */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-primary" />
                        2. Palavras-chave ({activation.keywords?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activation.keywords && activation.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {activation.keywords.map((kw: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center bg-indigo-600/20 text-indigo-300 text-sm px-3 py-1 rounded-full border border-indigo-500/30">
                                    #{kw}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 italic">Nenhuma palavra-chave definida.</p>
                    )}
                </CardContent>
            </Card>

            {/* People of Interest */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        3. Pessoas de Interesse ({activation.people_of_interest?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activation.people_of_interest && activation.people_of_interest.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {activation.people_of_interest.map((person: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800 rounded border border-slate-700">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span className="text-white">{person}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 italic">Nenhuma pessoa de interesse definida.</p>
                    )}
                </CardContent>
            </Card>

            {/* Media */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wifi className="w-5 h-5 text-primary" />
                        4. Mídias Monitoradas ({activation.sources?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activation.sources_config?.selected && activation.sources_config.selected.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {activation.sources_config.selected.map((source: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-800 rounded border border-slate-700">
                                    <div className="w-2 h-2 rounded-full bg-success"></div>
                                    <span className="text-white">{mediaLabels[source] || source}</span>
                                    {(source === 'tvs' || source === 'radios') && (
                                        <span className="text-xs text-warning ml-auto">*</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 italic">Nenhuma mídia selecionada.</p>
                    )}
                    {activation.sources_config?.selected?.some((s: string) => s === 'tvs' || s === 'radios') && (
                        <p className="text-xs text-slate-500 mt-3">* TVs e Rádios: sob consulta e disponibilidade</p>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => navigate(`/activations/edit/${id}`)}>
                    Editar Ativação
                </Button>
                <Button variant="primary" onClick={() => window.print()}>
                    <FileText className="w-4 h-4 mr-2" />
                    Imprimir Briefing
                </Button>
            </div>
        </div>
    );
};
