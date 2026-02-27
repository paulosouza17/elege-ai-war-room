import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, X, AlertTriangle, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Mention {
    id: string;
    text: string;
    title?: string;
    summary?: string;
    source: string;
    risk_score: number;
    narrative?: string;
    sentiment?: string;
    bundle_id?: string | null;
    classification_metadata?: {
        keywords?: string[];
        detected_entities?: string[];
    };
}

interface CrisisEscalationModalProps {
    isOpen: boolean;
    onClose: () => void;
    mention: Mention;
    allMentions: Mention[];
    onSuccess: () => void;
}

export const CrisisEscalationModal: React.FC<CrisisEscalationModalProps> = ({
    isOpen, onClose, mention, allMentions, onSuccess
}) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showRelated, setShowRelated] = useState(true);

    const initialText = mention.text || mention.summary || mention.title || 'Sem conteúdo';
    const initialTitle = mention.title
        ? `Crise: ${mention.title}`
        : `Crise: ${initialText.substring(0, 30)}...`;

    const [title, setTitle] = useState(initialTitle);
    const [severity, setSeverity] = useState(
        mention.risk_score >= 80 ? 'critical' :
            mention.risk_score >= 60 ? 'high' : 'medium'
    );
    const [summary, setSummary] = useState(mention.narrative || mention.summary || mention.text || '');

    // Auto-detect related mentions by shared keywords + detected entities
    const relatedMentions = useMemo(() => {
        const myKeywords = new Set(
            (mention.classification_metadata?.keywords || []).map(k => k.toLowerCase())
        );
        const myEntities = new Set(
            mention.classification_metadata?.detected_entities || []
        );

        if (myKeywords.size === 0 && myEntities.size === 0) return [];

        return allMentions.filter(m => {
            if (m.id === mention.id) return false;
            if (m.bundle_id) return false; // Already bundled

            const mKeywords = (m.classification_metadata?.keywords || []).map(k => k.toLowerCase());
            const mEntities = m.classification_metadata?.detected_entities || [];

            const sharedKeywords = mKeywords.some(k => myKeywords.has(k));
            const sharedEntities = mEntities.some(e => myEntities.has(e));

            return sharedKeywords || sharedEntities;
        });
    }, [mention, allMentions]);

    if (!isOpen) return null;

    const handleEscalate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const demoClientId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
        const allEvidenceIds = [mention.id, ...relatedMentions.map(m => m.id)];

        try {
            // 1. Create Crisis Packet with all evidence IDs
            const { error: crisisError } = await supabase
                .from('crisis_packets')
                .insert({
                    client_id: demoClientId,
                    title,
                    severity,
                    summary,
                    status: 'draft',
                    evidence_ids: allEvidenceIds
                })
                .select()
                .single();

            if (crisisError) throw crisisError;

            // 2. Update primary mention status
            const { error: mentionError } = await supabase
                .from('intelligence_feed')
                .update({ status: 'escalated' })
                .eq('id', mention.id);

            if (mentionError) throw mentionError;

            // 3. Bundle related mentions
            if (relatedMentions.length > 0) {
                const relatedIds = relatedMentions.map(m => m.id);
                const { error: bundleError } = await supabase
                    .from('intelligence_feed')
                    .update({ bundle_id: mention.id, status: 'escalated' })
                    .in('id', relatedIds);

                if (bundleError) {
                    console.error('Bundle update error:', bundleError);
                }
            }

            // 4. Success & Redirect
            onSuccess();
            navigate('/crisis');

        } catch (error: any) {
            console.error('Escalation failed:', error);
            alert('Falha ao escalar crise: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-red-500/30 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-red-950/10 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                        Escalar para Pacote de Crise
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleEscalate} className="p-6 space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-200">
                            Isso criará um <strong>Pacote de Crise</strong> e agrupará automaticamente
                            {relatedMentions.length > 0
                                ? ` ${relatedMentions.length + 1} menções relacionadas`
                                : ' esta menção'
                            } como evidências.
                        </p>
                    </div>

                    {/* Related Mentions Preview */}
                    {relatedMentions.length > 0 && (
                        <div className="border border-amber-500/20 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowRelated(!showRelated)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-sm font-medium text-amber-300">
                                    <Link2 className="w-4 h-4" />
                                    {relatedMentions.length} menções relacionadas serão vinculadas
                                </span>
                                {showRelated
                                    ? <ChevronUp className="w-4 h-4 text-amber-400" />
                                    : <ChevronDown className="w-4 h-4 text-amber-400" />
                                }
                            </button>
                            {showRelated && (
                                <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
                                    {relatedMentions.map(m => (
                                        <div key={m.id} className="flex items-start gap-2 p-2 bg-slate-950 rounded border border-slate-800 text-xs">
                                            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${m.sentiment === 'negative' ? 'bg-red-500' :
                                                m.sentiment === 'positive' ? 'bg-emerald-500' : 'bg-slate-500'
                                                }`} />
                                            <div className="min-w-0">
                                                <p className="text-slate-300 truncate">{m.text || m.summary || m.title}</p>
                                                <div className="flex items-center gap-2 mt-1 text-slate-500">
                                                    <span>{m.source}</span>
                                                    <span>·</span>
                                                    <span>Risco: {m.risk_score}</span>
                                                    {m.classification_metadata?.keywords?.slice(0, 2).map(kw => (
                                                        <span key={kw} className="text-amber-400/70">#{kw}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Título da Crise</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Severidade Inicial</label>
                            <select
                                value={severity}
                                onChange={e => setSeverity(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Risco Detectado</label>
                            <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
                                {mention.risk_score}/100
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Resumo Executivo (Contexto)</label>
                        <textarea
                            value={summary}
                            onChange={e => setSummary(e.target.value)}
                            rows={4}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
                            placeholder="Descreva o impacto esperado..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 shadow-lg shadow-red-900/20"
                        >
                            {loading ? (
                                'Processando...'
                            ) : (
                                <>
                                    <ShieldAlert className="w-4 h-4" />
                                    Confirmar Escalada{relatedMentions.length > 0 ? ` (${relatedMentions.length + 1})` : ''}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
