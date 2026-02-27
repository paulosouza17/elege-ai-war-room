import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrainCircuit, Plus, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ScenarioEngine: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <BrainCircuit className="w-8 h-8 text-primary" />
                        Motor de Simulação
                    </h1>
                    <p className="text-slate-400">Projeção de cenários futuros e análise de impacto.</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Simulação
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cartão de Cenário 1 */}
                <Card
                    className="border-t-4 border-t-primary cursor-pointer hover:bg-slate-800/50 transition-colors group"
                    onClick={() => navigate('/scenarios/1')}
                >
                    <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">ECONOMIA</Badge>
                            <span className="text-xs text-slate-500">Probabilidade: 68%</span>
                        </div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">Aumento Inflação Local</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-sm mb-4">
                            Simulação do impacto de um aumento de 2% no índice de preços locais sobre a popularidade.
                        </p>
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded border border-slate-700/50">
                            <div className="flex items-center text-danger text-sm font-bold">
                                <TrendingDown className="w-4 h-4 mr-2" />
                                -4.2 pts
                            </div>
                            <span className="text-xs text-slate-500">Impacto Projetado</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Cartão de Cenário 2 */}
                <Card
                    className="border-t-4 border-t-purple-500 cursor-pointer hover:bg-slate-800/50 transition-colors group"
                    onClick={() => navigate('/scenarios/2')}
                >
                    <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">POLÍTICA</Badge>
                            <span className="text-xs text-slate-500">Hipótese</span>
                        </div>
                        <CardTitle className="text-lg group-hover:text-purple-400 transition-colors">Apoio Ex-Prefeito</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-sm mb-4">
                            Cenário onde o ex-prefeito declara apoio público oficial à candidatura.
                        </p>
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded border border-slate-700/50">
                            <div className="flex items-center text-success text-sm font-bold">
                                <TrendingUp className="w-4 h-4 mr-2" />
                                +8.5 pts
                            </div>
                            <span className="text-xs text-slate-500">Impacto Projetado</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Cartão de Criação Rápida */}
                <Card className="border-2 border-dashed border-slate-700 bg-transparent flex flex-col items-center justify-center text-center p-6 hover:border-slate-500 transition-colors cursor-pointer opacity-70 hover:opacity-100">
                    <div className="p-4 rounded-full bg-slate-800 mb-4">
                        <Zap className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Simulação Rápida</h3>
                    <p className="text-slate-400 text-sm mb-4 max-w-xs">
                        Execute uma análise de sentimento instantânea baseada em um tópico específico.
                    </p>
                    <Button variant="secondary" size="sm">Iniciar Agora</Button>
                </Card>
            </div>
        </div>
    );
};
