import React from 'react';
import { X, FileText, Brain, TrendingUp, AlertTriangle } from 'lucide-react';

interface ProcessingResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: any;
}

export const ProcessingResultModal: React.FC<ProcessingResultModalProps> = ({ isOpen, onClose, file }) => {
    if (!isOpen || !file) return null;

    // Support both older 'processing_result' and newer 'metadata' structure
    const result = file.metadata || file.processing_result || {};
    const hasResult = Object.keys(result).length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Brain className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Análise de IA</h2>
                            <p className="text-sm text-slate-400 max-w-md truncate">{file.original_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!hasResult ? (
                        <div className="text-center py-12 text-slate-500">
                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>O processamento ainda não foi concluído ou não gerou resultados.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Section */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Resumo Executivo
                                </h3>
                                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                    <h4 className="font-semibold text-white mb-2">{result.title}</h4>
                                    <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                                        {result.summary}
                                    </p>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Score de Risco
                                    </h3>
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-4">
                                        <div className={`text-2xl font-bold ${result.risk_score > 70 ? 'text-red-500' : result.risk_score > 40 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                            {result.risk_score}/100
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {result.risk_score > 70 ? 'Alto Risco Identificado' : 'Risco Moderado/Baixo'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Sentimento
                                    </h3>
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 capitalize text-white font-medium">
                                        {result.sentiment === 'positive' && '🟢 Positivo'}
                                        {result.sentiment === 'negative' && '🔴 Negativo'}
                                        {result.sentiment === 'neutral' && '⚪ Neutro'}
                                        {!['positive', 'negative', 'neutral'].includes(result.sentiment) && result.sentiment}
                                    </div>
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Palavras-Chave</h3>
                                <div className="flex flex-wrap gap-2">
                                    {result.keywords?.map((kw: string, i: number) => (
                                        <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-slate-700 bg-slate-900 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors font-medium border border-slate-600"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
