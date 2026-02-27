import React from 'react';
import { Database, Bot, Info } from 'lucide-react';
import { FileUploadCard } from '../components/FileUploadCard';

export const ManualIngest: React.FC = () => {
    return (
        <div className="p-8 space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Database className="w-8 h-8 text-primary" />
                    Input Manual
                </h1>
                <p className="text-slate-400 mt-2">
                    Carregue documentos e arquivos para análise automática pela IA.
                </p>
            </header>

            <div className="max-w-2xl space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium mb-1">Como funciona</p>
                        <ul className="text-blue-400/80 space-y-0.5">
                            <li className="flex items-center gap-2">
                                <Bot className="w-3 h-3" />
                                A <strong>IA analisa o arquivo</strong> e extrai: keywords, entidades, pessoas, sentimento e score de risco
                            </li>
                            <li>• Somente conteúdo <strong>relevante</strong> é publicado no Intelligence Feed</li>
                            <li>• Vincular a uma ativação é <strong>opcional</strong> — enriquece o contexto da análise</li>
                            <li>• Se desejar, também pode executar o fluxo vinculado à ativação</li>
                        </ul>
                    </div>
                </div>

                <FileUploadCard />
            </div>
        </div>
    );
};
