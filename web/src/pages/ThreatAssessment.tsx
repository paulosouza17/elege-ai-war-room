import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldAlert, Search, Filter, Crosshair, Users, Activity, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ThreatAssessment: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-danger" />
                        Radar de Ameaças
                    </h1>
                    <p className="text-slate-400">Monitoramento de atores hostis e redes de desinformação.</p>
                </div>
                <Button variant="danger">
                    <Crosshair className="w-4 h-4 mr-2" />
                    Novo Alvo
                </Button>
            </div>

            <div className="flex gap-4 items-center bg-surface p-4 rounded-lg border border-slate-700/60">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        placeholder="Buscar ator, perfil social ou palavra-chave..."
                        className="pl-10 bg-slate-900 border-slate-700"
                    />
                </div>
                <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros Avançados
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna da Esquerda: Lista de Atores */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Atores Monitorados
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-700/50">
                                {/* Ator 1 */}
                                <div
                                    className="p-4 hover:bg-slate-800/50 transition-colors flex items-center gap-4 cursor-pointer group"
                                    onClick={() => navigate('/threats/1')}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-300 border-2 border-danger">
                                            LP
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-danger rounded-full border-2 border-surface animate-pulse"></div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors">Lucas Pereira (Influencer)</h4>
                                            <Badge variant="danger">NÍVEL CRÍTICO</Badge>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            Líder de opinião local. <span className="text-danger font-medium">85% content negativo</span>.
                                            Alcance est: 50k/dia.
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <Activity className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Ator 2 */}
                                <div
                                    className="p-4 hover:bg-slate-800/50 transition-colors flex items-center gap-4 cursor-pointer group"
                                    onClick={() => navigate('/threats/2')}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-300 border-2 border-warning">
                                            GZ
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-warning rounded-full border-2 border-surface"></div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors">Grupo "Zap da Verdade"</h4>
                                            <Badge variant="warning">ALERTA</Badge>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            Rede de distribuição de fake news. <span className="text-warning font-medium">Atividade em alta (+40%)</span>.
                                            253 membros ativos.
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <Network className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna da Direita: Radar / Stats */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 border-slate-700">
                        <CardHeader>
                            <CardTitle>Nível de Ameaça Global</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-6">
                            <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                                <div className="absolute inset-0 rounded-full border-4 border-danger border-t-transparent animate-spin duration-3000"></div>
                                <div className="text-center">
                                    <span className="text-3xl font-bold text-white">ALTO</span>
                                    <span className="text-xs text-danger block uppercase tracking-widest">Defcon 3</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-4 text-center px-4">
                                Aumento significativo na coordenação de ataques nas últimas 24h.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Origens</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>WhatsApp (Grupos Privados)</span>
                                    <span className="text-white">65%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-danger w-[65%]"></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Twitter / X</span>
                                    <span className="text-white">25%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-warning w-[25%]"></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
