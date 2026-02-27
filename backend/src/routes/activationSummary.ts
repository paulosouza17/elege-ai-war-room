import { Router } from 'express';
import { AIService } from '../services/aiService';
import { supabase } from '../config/supabase';

const router = Router();

// GET /:id/summary — Aggregated KPIs from RPC
router.get('/:id/summary', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase.rpc('get_activation_summary', {
            p_activation_id: id,
        });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error: any) {
        console.error('[Activation Summary] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /:id/ai-analysis — On-demand AI contextual analysis
router.post('/:id/ai-analysis', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch activation metadata
        const { data: activation, error: actError } = await supabase
            .from('activations')
            .select('*')
            .eq('id', id)
            .single();

        if (actError || !activation) {
            return res.status(404).json({ success: false, message: 'Activation not found' });
        }

        // 2. Fetch summary KPIs
        const { data: summary, error: sumError } = await supabase.rpc('get_activation_summary', {
            p_activation_id: id,
        });

        if (sumError) throw sumError;

        // 3. Fetch latest feed items for context
        const { data: recentFeed } = await supabase
            .from('intelligence_feed')
            .select('title, content, sentiment, risk_score, created_at')
            .eq('activation_id', id)
            .order('created_at', { ascending: false })
            .limit(20);

        // 4. Build contextual prompt
        const topKeywords = (summary.top_keywords || [])
            .slice(0, 10)
            .map((k: any) => `${k.keyword} (${k.count}x)`)
            .join(', ');

        const targetList = (summary.target_mentions || [])
            .map((t: any) => `${t.name}: ${t.count} menções (${t.sentiment_positive} pos, ${t.sentiment_negative} neg)`)
            .join('\n    ');

        const riskItems = (summary.top_risk_items || [])
            .map((r: any) => `- [Risk ${r.risk_score}] ${r.title}: ${r.summary || ''}`)
            .join('\n');

        const feedSnippets = (recentFeed || [])
            .slice(0, 10)
            .map((f: any) => {
                const contentStr = typeof f.content === 'string'
                    ? f.content.substring(0, 200)
                    : f.content?.summary?.substring(0, 200) || '';
                return `- [${f.sentiment}] ${f.title}: ${contentStr}`;
            })
            .join('\n');

        const prompt = `Você é um analista sênior de inteligência política e comunicação estratégica.
Analise o seguinte contexto de monitoramento e escreva um RESUMO EXECUTIVO em 3-5 parágrafos.

ATIVAÇÃO: "${activation.name || activation.title}"
PERÍODO: ${summary.overview?.first_citation_at || 'N/A'} a ${summary.overview?.last_citation_at || 'N/A'} (${summary.overview?.monitoring_days || 0} dias)
TOTAL CITAÇÕES: ${summary.overview?.total_citations || 0}

SENTIMENTO GERAL:
    Positivas: ${summary.sentiment?.positive || 0}
    Negativas: ${summary.sentiment?.negative || 0}
    Neutras: ${summary.sentiment?.neutral || 0}
    Ratio Neg/Pos: ${summary.sentiment?.ratio_neg_pos || 0}

RISCO:
    Score Médio: ${summary.risk?.avg_risk_score || 0}
    Itens Alto Risco (>=80): ${summary.risk?.high_risk_count || 0}
    Crises Escaladas: ${summary.risk?.escalated_crises || 0}

KEYWORDS MAIS CITADAS: ${topKeywords || 'Nenhuma'}

ALVOS MONITORADOS:
    ${targetList || 'Nenhum'}

${summary.emergent_keywords?.length > 0 ? `KEYWORDS EMERGENTES (não configuradas mas detectadas): ${summary.emergent_keywords.map((k: any) => k.keyword).join(', ')}` : ''}

CITAÇÕES DE ALTO RISCO:
${riskItems || 'Nenhuma'}

ÚLTIMAS CITAÇÕES NO FEED:
${feedSnippets || 'Nenhuma'}

Instruções:
1. Identifique tendências e padrões no monitoramento
2. Destaque riscos potenciais e sinais de alerta
3. Avalie o cenário geral de sentimento e percepção
4. Forneça recomendações táticas de ação imediata
5. Se houver keywords emergentes, analise o que podem indicar
6. Escreva em português formal e objetivo, adequado para um briefing executivo`;

        const aiService = new AIService(supabase);
        const analysis = await aiService.generateRaw(prompt);

        // 5. Persist to DB (upsert — overwrite on regenerate)
        await supabase
            .from('activation_analyses')
            .upsert({
                activation_id: id,
                analysis,
                generated_by: (req as any).user?.id || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'activation_id' });

        res.json({ success: true, analysis });
    } catch (error: any) {
        console.error('[AI Analysis] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /:id/ai-analysis — Load saved analysis
router.get('/:id/ai-analysis', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('activation_analyses')
            .select('analysis, updated_at')
            .eq('activation_id', id)
            .single();

        if (error || !data) {
            return res.json({ success: true, analysis: null });
        }

        res.json({ success: true, analysis: data.analysis, updated_at: data.updated_at });
    } catch (error: any) {
        console.error('[AI Analysis Load] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

export const activationSummaryRouter = router;
