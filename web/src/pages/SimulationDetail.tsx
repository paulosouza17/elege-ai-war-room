import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, BrainCircuit, TrendingDown, Users, Share2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SimulationDetail: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Button variant="ghost" size="sm" onClick={() => navigate('/scenarios')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Cenários
            </Button>

            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">ECONOMIA</Badge>
                        <span className="text-sm text-slate-500">Processado em: 16/02/2026 14:30</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Aumento Inflação Local (+2%)</h1>
                    <p className="text-slate-300 max-w-3xl">
                        Projeção de impacto no sentimento público caso o índice inflacionário local suba 2 pontos percentuais no próximo trimestre.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                    </Button>
                    <Button variant="primary">
                        <Download className="w-4 h-4 mr-2" /> Exportar PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* KPI de Impacto Principal */}
                <Card className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-danger/10 border-danger/30">
                    <CardHeader>
                        <CardTitle className="text-secondary text-sm uppercase">Impacto na Aprovação</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-mono font-bold text-white">-4.2%</span>
                            <div className="flex items-center text-danger text-sm font-bold mb-2">
                                <TrendingDown className="w-4 h-4 mr-1" />
                                Queda
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Margem de erro: ±0.8%
                        </p>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-secondary text-sm uppercase">Sentimento Negativo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-mono font-bold text-white">62%</span>
                            <span className="text-xs text-slate-500 mb-2">do volume total</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                            <div className="bg-danger h-full w-[62%]"></div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-secondary text-sm uppercase">Grupos Mais Afetados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-white">Classe C / D</span>
                            </div>
                            <Badge variant="danger">Alto Impacto</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-white">Comerciantes Locais</span>
                            </div>
                            <Badge variant="warning">Médio Impacto</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Projeção (Mockup Visual) */}
            <Card>
                <CardHeader>
                    <CardTitle>Linha do Tempo: Evolução do Sentimento (Próximos 30 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 w-full flex items-end justify-between px-4 pb-4 border-b border-slate-700 gap-2">
                        {[40, 38, 35, 32, 30, 28, 25, 22, 20, 18, 18, 19].map((h, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative">
                                <div
                                    className="w-full bg-slate-700 group-hover:bg-primary transition-all rounded-t-sm relative"
                                    style={{ height: `${h * 2}px` }}
                                >
                                    {i === 9 && (
                                        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-slate-800 p-2 rounded border border-slate-600 shadow-xl z-10 w-32 text-center pointer-events-none">
                                            <span className="text-xs text-white font-bold block">Ponto Crítico</span>
                                            <span className="text-[10px] text-slate-400">Dia 10</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500 uppercase tracking-wider">
                        <span>Dia 1</span>
                        <span>Dia 15</span>
                        <span>Dia 30</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center text-primary">
                        <BrainCircuit className="w-5 h-5 mr-2" />
                        Recomendações da IA
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-slate-300">
                        Para mitigar a queda de 4.2 pontos, o sistema sugere focar a comunicação em <strong>programas de subsídio</strong> e culpar <strong>fatores externos globais</strong>.
                    </p>
                    <div className="flex gap-2 mt-4">
                        <Button variant="primary" size="sm">Gerar Discurso</Button>
                        <Button variant="outline" size="sm">Ver Casos Semelhantes</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
