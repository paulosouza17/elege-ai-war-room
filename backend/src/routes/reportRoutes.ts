import { Router } from 'express';
import { supabase } from '../config/supabase';
import { AIService } from '../services/aiService';
import crypto from 'crypto';

const router = Router();

// Simple password hashing using SHA-256 + salt (no bcrypt dependency needed)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(password + s).digest('hex');
    return { hash: `${s}:${hash}`, salt: s };
}

function verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    const check = crypto.createHash('sha256').update(password + salt).digest('hex');
    return check === hash;
}

// ==========================================
// AUTHENTICATED ROUTES (manage report links)
// ==========================================

// POST /api/v1/activations/:id/report/create — Create a public report link
router.post('/:id/report/create', async (req, res) => {
    try {
        const { id } = req.params;
        const { password, max_views = 10 } = req.body;

        if (!password || password.length < 4) {
            return res.status(400).json({ success: false, message: 'Senha deve ter pelo menos 4 caracteres.' });
        }

        // Verify activation exists
        const { data: activation, error: actErr } = await supabase
            .from('activations')
            .select('id, name')
            .eq('id', id)
            .single();

        if (actErr || !activation) {
            return res.status(404).json({ success: false, message: 'Ativação não encontrada.' });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const { hash } = hashPassword(password);

        // Get user from header if available
        const userId = req.headers['x-user-id'] as string || null;

        const { data, error } = await supabase
            .from('report_links')
            .insert({
                activation_id: id,
                token,
                password_hash: hash,
                max_views: max_views,
                created_by: userId,
            })
            .select()
            .single();

        if (error) throw error;

        const reportUrl = `/report/${token}`;

        res.json({
            success: true,
            link: {
                id: data.id,
                token,
                url: reportUrl,
                max_views,
                created_at: data.created_at,
            },
        });
    } catch (error: any) {
        console.error('[Report] Create link error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/activations/:id/report/links — List report links
router.get('/:id/report/links', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('report_links')
            .select('id, token, max_views, current_views, created_at, revoked_at, expires_at')
            .eq('activation_id', id)
            .is('revoked_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, links: data || [] });
    } catch (error: any) {
        console.error('[Report] List links error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/activations/:id/report/links/:linkId — Revoke a link
router.delete('/:id/report/links/:linkId', async (req, res) => {
    try {
        const { linkId } = req.params;

        const { error } = await supabase
            .from('report_links')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', linkId);

        if (error) throw error;

        res.json({ success: true, message: 'Link revogado.' });
    } catch (error: any) {
        console.error('[Report] Revoke link error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// PUBLIC ROUTES (no authentication required)
// ==========================================

// POST /report/:token/verify — Validate password and get report data
router.post('/public/:token/verify', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Senha obrigatória.' });
        }

        // Find link
        const { data: link, error } = await supabase
            .from('report_links')
            .select('*')
            .eq('token', token)
            .is('revoked_at', null)
            .single();

        if (error || !link) {
            return res.status(404).json({ success: false, message: 'Link não encontrado ou revogado.' });
        }

        // Check view limit
        if (link.current_views >= link.max_views) {
            return res.status(403).json({ success: false, message: 'Limite de acessos atingido. Solicite um novo link.' });
        }

        // Check expiration
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return res.status(403).json({ success: false, message: 'Link expirado.' });
        }

        // Verify password
        if (!verifyPassword(password, link.password_hash)) {
            return res.status(401).json({ success: false, message: 'Senha incorreta.' });
        }

        // Increment view counter
        await supabase
            .from('report_links')
            .update({ current_views: link.current_views + 1 })
            .eq('id', link.id);

        // Generate session token for subsequent data requests
        const sessionToken = crypto.randomBytes(24).toString('hex');

        res.json({
            success: true,
            activation_id: link.activation_id,
            session_token: sessionToken,
            views_remaining: link.max_views - link.current_views - 1,
        });
    } catch (error: any) {
        console.error('[Report] Verify error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /report/:token/data — Get live report data (requires prior verification)
router.get('/public/:token/data', async (req, res) => {
    try {
        const { token } = req.params;

        // Find and validate link
        const { data: link, error } = await supabase
            .from('report_links')
            .select('*')
            .eq('token', token)
            .is('revoked_at', null)
            .single();

        if (error || !link) {
            return res.status(404).json({ success: false, message: 'Link não encontrado.' });
        }

        if (link.current_views > link.max_views) {
            return res.status(403).json({ success: false, message: 'Limite de acessos atingido.' });
        }

        // Get summary data from RPC
        const { data: summary, error: rpcErr } = await supabase.rpc('get_activation_summary', {
            p_activation_id: link.activation_id,
        });

        if (rpcErr) throw rpcErr;

        // Get context digests for AI analysis
        const { data: digests } = await supabase
            .from('context_digests')
            .select('digest, period_start, period_end, items_count, source_filter')
            .eq('activation_id', link.activation_id)
            .order('period_end', { ascending: false })
            .limit(20);

        res.json({
            success: true,
            report: {
                ...summary,
                digests: digests || [],
                generated_at: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error('[Report] Data error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /report/:token/ai-analysis — Generate AI analysis using digest pipeline
router.post('/public/:token/ai-analysis', async (req, res) => {
    try {
        const { token } = req.params;

        // Find link
        const { data: link, error } = await supabase
            .from('report_links')
            .select('activation_id')
            .eq('token', token)
            .is('revoked_at', null)
            .single();

        if (error || !link) {
            return res.status(404).json({ success: false, message: 'Link não encontrado.' });
        }

        // Get summary KPIs
        const { data: summary } = await supabase.rpc('get_activation_summary', {
            p_activation_id: link.activation_id,
        });

        // Get digests (Level 2 summaries)
        const { data: digests } = await supabase
            .from('context_digests')
            .select('digest, period_start, period_end, items_count')
            .eq('activation_id', link.activation_id)
            .order('period_end', { ascending: false })
            .limit(20);

        // Build optimized prompt using digests instead of raw items
        const digestSummaries = (digests || [])
            .map((d: any) => `[${d.period_start?.substring(0, 10)} → ${d.period_end?.substring(0, 10)}] (${d.items_count} itens): ${d.digest?.narrative_summary || 'N/A'}`)
            .join('\n');

        const topKeywords = (summary?.top_keywords || [])
            .slice(0, 10)
            .map((k: any) => `${k.keyword} (${k.count}x)`)
            .join(', ');

        const targetList = (summary?.target_mentions || [])
            .map((t: any) => `${t.name}: ${t.count} citações (${t.sentiment_positive} pos, ${t.sentiment_negative} neg)`)
            .join('\n    ');

        const riskItems = (summary?.top_risk_items || [])
            .map((r: any) => `- [Risk ${r.risk_score}] ${r.title}: ${r.summary || ''}`)
            .join('\n');

        const prompt = `Você é um analista sênior de inteligência política e comunicação estratégica.
Gere um RELATÓRIO em 3 blocos baseado nos dados abaixo.

ATIVAÇÃO: "${summary?.activation?.title}"
ANALISTA: ${summary?.activation?.created_by_name || 'N/A'}
PERÍODO: ${summary?.overview?.first_citation_at || 'N/A'} a ${summary?.overview?.last_citation_at || 'N/A'} (${summary?.overview?.monitoring_days || 0} dias)
TOTAL CITAÇÕES: ${summary?.overview?.total_citations || 0}
FONTES: ${(summary?.sources || []).map((s: any) => `${s.source} (${s.count})`).join(', ')}

SENTIMENTO:
    Positivas: ${summary?.sentiment?.positive || 0} | Negativas: ${summary?.sentiment?.negative || 0} | Neutras: ${summary?.sentiment?.neutral || 0}
    Ratio Neg/Pos: ${summary?.sentiment?.ratio_neg_pos || 0}

RISCO:
    Score Médio: ${summary?.risk?.avg_risk_score || 0} | Máximo: ${summary?.risk?.max_risk_score || 0}
    Alto Risco (>=80): ${summary?.risk?.high_risk_count || 0} | Crises Escaladas: ${summary?.risk?.escalated_crises || 0}

KEYWORDS: ${topKeywords || 'Nenhuma'}
ALVOS: ${targetList || 'Nenhum'}

DIGESTS CONSOLIDADOS (resumos por período):
${digestSummaries || 'Nenhum digest disponível — usar dados numéricos acima.'}

CITAÇÕES DE ALTO RISCO:
${riskItems || 'Nenhuma'}

Gere 3 blocos em PORTUGUÊS FORMAL (briefing executivo):

## BLOCO 1: RESUMO EXECUTIVO
Sintetize o cenário geral em 3-4 parágrafos. Tendências, padrões, destaques.

## BLOCO 2: DESTAQUES DE CENÁRIO E PROJEÇÕES
Identifique os 3-5 cenários potenciais de crise mais prováveis.
Para cada cenário: descrição, probabilidade (alta/média/baixa), impacto potencial, e recomendação de ação.

## BLOCO 3: RECOMENDAÇÕES TÁTICAS
Liste 5-7 ações imediatas recomendadas, priorizadas por urgência.`;

        const aiService = new AIService(supabase);
        const analysis = await aiService.generateRaw(prompt);

        res.json({ success: true, analysis });
    } catch (error: any) {
        console.error('[Report AI] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

export const reportRouter = router;
