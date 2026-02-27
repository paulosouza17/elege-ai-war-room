import React, { useEffect, useState } from 'react';
import { Shield, Save, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DEFAULT_POLICY = {
    "version": "1.0",
    "goal": "political_analysis_max_neutrality",
    "generation": {
        "temperature": 0.2,
        "top_p": 0.9,
        "presence_penalty": 0.0,
        "frequency_penalty": 0.0,
        "max_output_tokens": 1400,
        "seed": 42
    },
    "input": {
        "language": "pt-BR",
        "locale": "BR",
        "time_reference": {
            "timezone": "America/Sao_Paulo",
            "require_absolute_dates": true,
            "avoid_relative_dates_if_ambiguous": true
        },
        "context_handling": {
            "max_chars_per_source": 14000,
            "prioritize_primary_sources": true,
            "deduplicate_repeated_claims": true,
            "quote_limit_words_per_source": 25,
            "keep_track_of_sources": true
        }
    },
    "neutrality_policy": {
        "stance": "no_advocacy",
        "no_persuasion": true,
        "no_moral_judgment": true,
        "no_identity_alignment": true,
        "avoid_loaded_language": true,
        "avoid_strawman": true,
        "avoid_false_balance": true,
        "require_steelman_both_sides": true,
        "separate_fact_from_interpretation": true,
        "explicit_uncertainty_when_needed": true,
        "do_not_infer_private_motives": true,
        "avoid_predictions_without_bases": true
    },
    "lexical_constraints": {
        "forbidden_or_discouraged_terms": [
            "absurdo", "vergonhoso", "ridículo", "genial", "corrupto",
            "fascista", "comunista", "golpista", "herói", "vilão",
            "retrocesso", "avanço enorme", "ameaça", "extremista", "mentira"
        ],
        "allowed_if_quoted_or_evidenced": [
            "corrupção", "crime", "ilegal", "inconstitucional"
        ],
        "tone": {
            "style": "técnico_institucional",
            "no_emojis": true,
            "no_sarcasm": true,
            "no_rhetorical_questions": true
        }
    },
    "analysis_protocol": {
        "steps": [
            "extract_claims", "tag_claim_type", "map_stakeholders",
            "identify_evidence_gaps", "construct_best_arguments_pro",
            "construct_best_arguments_con", "institutional_impacts_short_long",
            "risk_assessment", "neutral_summary"
        ],
        "claim_tagging_schema": {
            "types": ["fato_verificavel", "interpretacao", "hipotese", "opniao_de_ator", "projecao"],
            "require_tag_per_paragraph": true
        },
        "stakeholder_map": { "required": true, "format": "list", "include_incentives": false }
    },
    "output_format": {
        "structure": [
            { "section": "Resumo neutro", "rules": { "max_sentences": 6, "no_value_words": true } },
            { "section": "Fatos verificáveis", "rules": { "bullet_points": true, "each_fact_needs_source": true } },
            { "section": "Interpretações plausíveis", "rules": { "min_items": 2, "max_items": 5, "no_preference": true } },
            { "section": "Argumentos favoráveis (steelman)", "rules": { "min_items": 3, "equal_depth_to_con": true } },
            { "section": "Argumentos contrários (steelman)", "rules": { "min_items": 3, "equal_depth_to_pro": true } },
            { "section": "Impactos institucionais", "rules": { "split": ["curto_prazo", "longo_prazo"], "avoid_speculation": true } },
            { "section": "Incertezas e dados faltantes", "rules": { "required": true, "actionable_questions": true } },
            { "section": "Checklist de neutralidade", "rules": { "required": true, "include_bias_flags": true } }
        ],
        "citations": {
            "required": true,
            "style": "inline",
            "if_no_sources_provided": "state_limitation_and_avoid_factual_claims"
        }
    },
    "self_audit": {
        "bias_checks": [
            "symmetry_check", "loaded_language_check", "fact_opinion_separation_check",
            "assumption_check", "missing_counterargument_check"
        ],
        "symmetry_check": { "require_equal_word_count_pro_con_tolerance": 0.15 },
        "loaded_language_check": { "flag_if_contains_discouraged_terms": true },
        "final_gate": {
            "if_flags_over_threshold": { "threshold": 2, "action": "rewrite_with_stricter_neutrality" }
        }
    },
    "optional_dual_model_validation": {
        "enabled": true,
        "validator_role": "neutrality_critic",
        "validator_instructions": [
            "Identify any implicit stance or persuasive framing",
            "List loaded terms and propose neutral replacements",
            "Score symmetry, evidence discipline, and speculative leaps from 0-5"
        ],
        "pass_fail": { "min_overall_score": 4.2, "fail_action": "regenerate_with_feedback" }
    }
};

export const NeutralityPolicy: React.FC = () => {
    const [enabled, setEnabled] = useState(false);
    const [jsonText, setJsonText] = useState(JSON.stringify(DEFAULT_POLICY, null, 2));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [recordId, setRecordId] = useState<string | null>(null);

    useEffect(() => {
        loadPolicy();
    }, []);

    const loadPolicy = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('data_sources')
            .select('id, config, is_active')
            .eq('type', 'system_config')
            .eq('name', 'Neutrality Policy')
            .limit(1)
            .maybeSingle();

        if (data) {
            setRecordId(data.id);
            setEnabled(data.is_active === true);
            setJsonText(JSON.stringify(data.config || DEFAULT_POLICY, null, 2));
        }
        setLoading(false);
    };

    const validateJson = (text: string): boolean => {
        try {
            JSON.parse(text);
            setJsonError(null);
            return true;
        } catch (e: any) {
            setJsonError(e.message);
            return false;
        }
    };

    const handleSave = async () => {
        if (!validateJson(jsonText)) return;
        setSaving(true);

        const config = JSON.parse(jsonText);
        const payload = {
            name: 'Neutrality Policy',
            type: 'system_config',
            config,
            is_active: enabled,
        };

        let error;
        if (recordId) {
            ({ error } = await supabase.from('data_sources').update(payload).eq('id', recordId));
        } else {
            const { data, error: insertError } = await supabase.from('data_sources').insert(payload).select('id').single();
            error = insertError;
            if (data) setRecordId(data.id);
        }

        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
        setSaving(false);
    };

    const handleToggle = async () => {
        const newState = !enabled;
        setEnabled(newState);

        if (recordId) {
            await supabase.from('data_sources').update({ is_active: newState }).eq('id', recordId);
        }
    };

    const handleReset = () => {
        if (!confirm('Restaurar para a política padrão? Suas alterações serão perdidas.')) return;
        setJsonText(JSON.stringify(DEFAULT_POLICY, null, 2));
        setJsonError(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Shield className="w-7 h-7 text-cyan-400" />
                        Política de Neutralidade IA
                    </h2>
                    <p className="text-slate-400 mt-2 max-w-2xl">
                        Define regras de neutralidade injetadas como <code className="text-cyan-400 bg-slate-800 px-1 rounded">system message</code> em todas as chamadas de IA.
                        Não altera os prompts de análise — atua apenas como neutralizador.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Toggle */}
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${enabled ? 'text-cyan-400' : 'text-slate-500'}`}>
                            {enabled ? 'Ativada' : 'Desativada'}
                        </span>
                        <button
                            onClick={handleToggle}
                            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-cyan-500' : 'bg-slate-600'}`}
                        >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Status Bar */}
            <div className={`px-4 py-3 rounded-lg border flex items-center gap-3 ${enabled
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-slate-800/50 border-slate-700 text-slate-400'
                }`}>
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">
                    {enabled
                        ? 'A política de neutralidade está ATIVA. Todas as chamadas de IA receberão estas regras como system message.'
                        : 'A política de neutralidade está DESATIVADA. As chamadas de IA operarão sem restrições adicionais de neutralidade.'
                    }
                </span>
            </div>

            {/* JSON Editor */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">
                        Configuração JSON
                    </label>
                    <button
                        onClick={handleReset}
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" /> Restaurar Padrão
                    </button>
                </div>

                <textarea
                    value={jsonText}
                    onChange={(e) => {
                        setJsonText(e.target.value);
                        validateJson(e.target.value);
                    }}
                    className={`w-full h-[500px] bg-slate-900 border rounded-lg p-4 text-sm font-mono text-slate-200 resize-y outline-none transition-colors ${jsonError ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500'
                        }`}
                    spellCheck={false}
                />

                {jsonError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>JSON inválido: {jsonError}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving || !!jsonError}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${saved
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : saving || jsonError
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
                        }`}
                >
                    {saved ? <><Check className="w-4 h-4" /> Salvo!</> : <><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Política'}</>}
                </button>
            </div>

            {/* Preview Section */}
            {enabled && !jsonError && (
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                    <button
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                        onClick={(e) => {
                            const content = (e.currentTarget.nextElementSibling as HTMLElement);
                            content.classList.toggle('hidden');
                        }}
                    >
                        📋 Preview das regras (clique para expandir)
                    </button>
                    <div className="hidden p-4 bg-slate-900/50 space-y-3 text-sm text-slate-300">
                        {(() => {
                            try {
                                const c = JSON.parse(jsonText);
                                return (
                                    <>
                                        {c.neutrality_policy && (
                                            <div>
                                                <h4 className="font-semibold text-cyan-400 mb-1">Regras de Neutralidade</h4>
                                                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                                                    {Object.entries(c.neutrality_policy).filter(([, v]) => v === true).map(([k]) => (
                                                        <li key={k}>{k.replace(/_/g, ' ')}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {c.lexical_constraints?.forbidden_or_discouraged_terms && (
                                            <div>
                                                <h4 className="font-semibold text-red-400 mb-1">Termos Proibidos</h4>
                                                <div className="flex flex-wrap gap-1">
                                                    {c.lexical_constraints.forbidden_or_discouraged_terms.map((t: string) => (
                                                        <span key={t} className="px-2 py-0.5 bg-red-500/10 text-red-300 text-xs rounded border border-red-500/20">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {c.generation && (
                                            <div>
                                                <h4 className="font-semibold text-amber-400 mb-1">Parâmetros de Geração</h4>
                                                <span className="text-slate-400 text-xs">
                                                    temperature: {c.generation.temperature} | top_p: {c.generation.top_p} | max_tokens: {c.generation.max_output_tokens} | seed: {c.generation.seed}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                );
                            } catch { return <span className="text-red-400">JSON inválido</span>; }
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};
