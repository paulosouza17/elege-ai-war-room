import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Crosshair, MapPin, Link as LinkIcon, AlertTriangle, FileText, Ban, Activity, Network } from 'lucide-react';

export const ThreatDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Button variant="ghost" size="sm" onClick={() => navigate('/threats')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Radar
            </Button>

            <div className="bg-surface border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-start">
                    <div className="flex gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-500 border-4 border-danger">
                                LP
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-danger text-white text-xs px-2 py-1 rounded-full font-bold uppercase border-2 border-surface">
                                Hostil
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold text-white">Lucas Pereira</h1>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Crosshair className="w-4 h-4" />
                                    ID: {id || 'ACT-001'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    São Paulo, SP
                                </span>
                                <span className="flex items-center gap-1 text-blue-400">
                                    <LinkIcon className="w-4 h-4" />
                                    @lucasp_oficial
                                </span>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Badge variant="danger">Influenciador Opositor</Badge>
                                <Badge variant="outline">Política</Badge>
                                <Badge variant="outline">Saúde</Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button variant="danger" size="sm">
                            <Ban className="w-4 h-4 mr-2" />
                            Sugerir Bloqueio Legal
                        </Button>
                        <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-2" />
                            Gerar Dossiê
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-slate-700/50">
                    <div className="text-center p-4 bg-slate-900/50 rounded border border-slate-800">
                        <div className="text-secondary text-xs uppercase tracking-wider mb-1">Score de Risco</div>
                        <div className="text-3xl font-bold text-danger">92/100</div>
                    </div>
                    <div className="text-center p-4 bg-slate-900/50 rounded border border-slate-800">
                        <div className="text-secondary text-xs uppercase tracking-wider mb-1">Alcance Estimado</div>
                        <div className="text-3xl font-bold text-white">52.4k</div>
                    </div>
                    <div className="text-center p-4 bg-slate-900/50 rounded border border-slate-800">
                        <div className="text-secondary text-xs uppercase tracking-wider mb-1">Sentimento Gerado</div>
                        <div className="text-3xl font-bold text-danger">-85%</div>
                    </div>
                    <div className="text-center p-4 bg-slate-900/50 rounded border border-slate-800">
                        <div className="text-secondary text-xs uppercase tracking-wider mb-1">Engajamento</div>
                        <div className="text-3xl font-bold text-warning">Alto</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Últimas Atividades Hostis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4 p-3 hover:bg-slate-800/30 rounded transition-colors">
                                <div className="mt-1">
                                    <AlertTriangle className="w-4 h-4 text-warning" />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-500">Hoje, 14:3{i}</span>
                                    </div>
                                    <p className="text-sm text-slate-300 italic">
                                        "Absurdo o que estão fazendo com a verba da saúde! Tenho provas..."
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                        <Badge variant="outline" className="text-[10px] h-5">Twitter</Badge>
                                        <Badge variant="danger" className="text-[10px] h-5">Fake News</Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Conexões e Rede</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px] bg-slate-900/20 rounded-md border border-slate-800/50 border-dashed">
                        <div className="text-center text-slate-500">
                            <Network className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Visualização do Grafo de Influência</p>
                            <p className="text-xs opacity-60">(Placeholder para D3.js / React Flow)</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
