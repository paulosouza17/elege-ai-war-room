-- Seed the default neutrality policy (disabled by default)
INSERT INTO data_sources (name, type, config, is_active)
VALUES (
    'Neutrality Policy',
    'system_config',
    '{
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
        }
    }'::jsonb,
    false
)
ON CONFLICT DO NOTHING;
