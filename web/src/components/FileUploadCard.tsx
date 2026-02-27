import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle, Upload, FileType, X, Link2, Unlink, Bot, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserActivations } from '../hooks/useUserActivations';

interface Activation {
    id: string;
    name: string;
}

interface FileUploadCardProps {
    preSelectedActivationId?: string;
    onUploadSuccess?: () => void;
    className?: string;
}

export const FileUploadCard: React.FC<FileUploadCardProps> = ({ preSelectedActivationId, onUploadSuccess, className }) => {
    const [activations, setActivations] = useState<Activation[]>([]);
    const [selectedActivation, setSelectedActivation] = useState(preSelectedActivationId || '');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [sourceName, setSourceName] = useState('');
    const [analysisInstructions, setAnalysisInstructions] = useState('');
    const [triggerFlow, setTriggerFlow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysisPhase, setAnalysisPhase] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'rejected' | null, message: string }>({ type: null, message: '' });
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const { activations: userActivations } = useUserActivations();

    useEffect(() => {
        if (!preSelectedActivationId) {
            setActivations(userActivations);
        } else {
            setSelectedActivation(preSelectedActivationId);
        }
    }, [preSelectedActivationId, userActivations]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus({ type: null, message: '' });
            setAnalysisResult(null);
        }
    };

    const clearFile = () => {
        setFile(null);
        setAnalysisResult(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setStatus({ type: null, message: '' });
        setAnalysisResult(null);
        setAnalysisPhase('Fazendo upload do arquivo...');

        try {
            const user = (await supabase.auth.getUser()).data.user;

            // 1. Upload file to storage
            const fileExt = file.name.split('.').pop();
            const storagePath = selectedActivation
                ? `${selectedActivation}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
                : `general/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('manual-uploads')
                .upload(storagePath, file);

            if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

            const { data: { publicUrl } } = supabase.storage
                .from('manual-uploads')
                .getPublicUrl(storagePath);

            // 2. Register in activation_files (if activation selected)
            if (selectedActivation) {
                await supabase
                    .from('activation_files')
                    .insert({
                        activation_id: selectedActivation,
                        original_name: file.name,
                        file_url: publicUrl,
                        file_type: file.type,
                        file_size: file.size,
                        status: 'analyzing',
                        metadata: { analysis_instructions: analysisInstructions || undefined }
                    });
            }

            // 3. Send to backend AI analysis endpoint
            setAnalysisPhase('Enviando para análise da IA...');

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${backendUrl}/api/v1/ingest/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_url: publicUrl,
                    file_type: file.type,
                    original_name: file.name,
                    title: title || undefined,
                    source_name: sourceName || undefined,
                    source_url: sourceUrl || undefined,
                    activation_id: selectedActivation || undefined,
                    analysis_instructions: analysisInstructions || undefined,
                    user_id: user?.id,
                }),
            });

            setAnalysisPhase('Processando resultado...');

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro na análise');
            }

            setAnalysisResult(result.analysis);

            if (result.published) {
                // 4. OPTIONAL: Also trigger a flow if user wants
                if (triggerFlow && selectedActivation) {
                    setAnalysisPhase('Executando fluxo vinculado...');
                    let assignedFlowId: string | null = null;

                    const { data: assignment } = await supabase
                        .from('flow_assignments')
                        .select('flow_id')
                        .eq('activation_id', selectedActivation)
                        .eq('active', true)
                        .limit(1)
                        .maybeSingle();

                    assignedFlowId = assignment?.flow_id || null;

                    if (!assignedFlowId) {
                        const { data: activation } = await supabase
                            .from('activations')
                            .select('flow_id')
                            .eq('id', selectedActivation)
                            .maybeSingle();
                        assignedFlowId = activation?.flow_id || null;
                    }

                    if (assignedFlowId) {
                        await supabase.from('flow_executions').insert({
                            flow_id: assignedFlowId,
                            user_id: user?.id,
                            status: 'pending',
                            context: {
                                trigger: 'manual_input',
                                activation_id: selectedActivation,
                                file_url: publicUrl,
                                file_type: file.type,
                                original_name: file.name,
                                analysis_instructions: analysisInstructions,
                            }
                        });
                    }
                }

                setStatus({
                    type: 'success',
                    message: `✅ Análise concluída e publicada no feed! Risk: ${result.analysis?.risk_score ?? 0} | Sentiment: ${result.analysis?.sentiment ?? 'neutral'} | ${result.analysis?.keywords?.length ?? 0} keywords detectadas.`
                });
                setFile(null);
                setTitle('');
                setSourceUrl('');
                setSourceName('');
                setAnalysisInstructions('');
                if (onUploadSuccess) onUploadSuccess();
            } else {
                // Rejected by quality gate
                setStatus({
                    type: 'rejected',
                    message: result.reason || 'Conteúdo rejeitado — nenhum critério relevante identificado pela IA.'
                });
            }

        } catch (error: any) {
            console.error('Ingestion error:', error);
            setStatus({ type: 'error', message: error.message || 'Falha ao processar arquivo.' });
        } finally {
            setLoading(false);
            setAnalysisPhase('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`bg-slate-800/50 p-6 rounded-lg border border-slate-700 ${className}`}>
            <div className="space-y-5">

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Título <span className="text-slate-600 text-xs">(opcional — usa nome do arquivo se vazio)</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ex: Matéria sobre privatização da Petrobras"
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                </div>

                {/* Source row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Fonte / Veículo
                        </label>
                        <input
                            type="text"
                            value={sourceName}
                            onChange={e => setSourceName(e.target.value)}
                            placeholder="Ex: Folha de S.Paulo"
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            URL da Matéria
                        </label>
                        <input
                            type="url"
                            value={sourceUrl}
                            onChange={e => setSourceUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                </div>

                {/* Activation Selector — OPTIONAL */}
                {!preSelectedActivationId && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Vincular Ativação <span className="text-slate-600 text-xs">(opcional)</span>
                        </label>
                        <select
                            value={selectedActivation}
                            onChange={e => {
                                setSelectedActivation(e.target.value);
                                if (!e.target.value) setTriggerFlow(false);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        >
                            <option value="">Nenhuma (entrada independente)</option>
                            {activations.map(act => (
                                <option key={act.id} value={act.id}>{act.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {selectedActivation
                                ? 'O contexto da ativação (keywords, pessoas) será usado na análise.'
                                : 'A IA analisará o arquivo sem contexto de ativação.'}
                        </p>
                    </div>
                )}

                {/* File Upload Area */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Arquivo <span className="text-red-400">*</span>
                    </label>

                    {!file ? (
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-md hover:border-primary/50 transition-colors">
                            <div className="space-y-1 text-center">
                                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="flex text-sm text-slate-400">
                                    <label htmlFor="file-upload" className="pl-1 relative cursor-pointer bg-transparent rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
                                        <span>Upload um arquivo</span>
                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            className="sr-only"
                                            onChange={handleFileChange}
                                            accept=".pdf,.txt,.doc,.docx,.csv,.xlsx,.xls,.jpg,.png,.jpeg"
                                        />
                                    </label>
                                    <p className="pl-1">ou arraste e solte</p>
                                </div>
                                <p className="text-xs text-slate-500">
                                    PDF, DOC, TXT, CSV, IMAGENS
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-1 flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-md">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded">
                                    <FileType className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={clearFile}
                                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Analysis Instructions */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Instruções para Análise (Opcional)
                    </label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none h-24 resize-none"
                        placeholder="Ex: Foque na identificação de riscos financeiros... ou Este é um contrato de prestação de serviços..."
                        value={analysisInstructions}
                        onChange={(e) => setAnalysisInstructions(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Adicione contexto extra para guiar a IA durante a análise deste arquivo.
                    </p>
                </div>

                {/* Optional: Trigger flow */}
                {selectedActivation && (
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                        <input
                            type="checkbox"
                            checked={triggerFlow}
                            onChange={e => setTriggerFlow(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary bg-slate-800"
                        />
                        <div className="flex items-center gap-2">
                            {triggerFlow ? <Link2 className="w-4 h-4 text-primary" /> : <Unlink className="w-4 h-4 text-slate-500" />}
                            <span className="text-sm text-slate-300">
                                Também executar fluxo vinculado à ativação
                            </span>
                        </div>
                    </label>
                )}

                {/* Loading phase indicator */}
                {loading && analysisPhase && (
                    <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <Bot className="w-5 h-5 text-blue-400 animate-pulse" />
                        <div>
                            <p className="text-sm text-blue-300 font-medium">{analysisPhase}</p>
                            <p className="text-xs text-blue-400/60 mt-0.5">A IA está analisando o conteúdo. Isso pode levar até 2 minutos.</p>
                        </div>
                    </div>
                )}

                {/* Status messages */}
                {status.message && (
                    <div className={`p-4 rounded-md flex items-start gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        status.type === 'rejected' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                        {status.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> :
                            status.type === 'rejected' ? <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" /> :
                                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                        <span className="text-sm">{status.message}</span>
                    </div>
                )}

                {/* Analysis result preview (when rejected) */}
                {analysisResult && status.type === 'rejected' && (
                    <details className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                            Ver resultado da IA (debug)
                        </summary>
                        <pre className="mt-3 text-xs text-slate-500 overflow-auto max-h-40 whitespace-pre-wrap">
                            {JSON.stringify(analysisResult, null, 2)}
                        </pre>
                    </details>
                )}

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={loading || !file}
                        className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium text-white transition-colors ${loading || !file ? 'bg-slate-700 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}
                    >
                        {loading ? (
                            <>
                                <Bot className="w-4 h-4 animate-spin" />
                                Analisando...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Enviar para Análise IA
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
};
