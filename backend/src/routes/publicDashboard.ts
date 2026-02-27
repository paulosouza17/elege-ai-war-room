import { Router } from 'express';
import { supabase } from '../config/supabase';
import crypto from 'crypto';

const router = Router();

// Simple password hashing
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(password + s).digest('hex');
    return { hash: `${s}:${hash}`, salt: s };
}

function verifyPassword(password: string, storedHash: string): boolean {
    const [salt] = storedHash.split(':');
    const { hash } = hashPassword(password, salt);
    return hash === storedHash;
}

// ==========================================
// ADMIN ROUTES — Manage dashboard sharing
// ==========================================

// POST /api/v1/activations/:id/public-dashboard/toggle
router.post('/:id/public-dashboard/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled, password } = req.body;

        const { data: activation, error: fetchErr } = await supabase
            .from('activations')
            .select('id, public_dashboard_token, public_dashboard_enabled')
            .eq('id', id)
            .single();

        if (fetchErr || !activation) {
            return res.status(404).json({ success: false, message: 'Ativação não encontrada' });
        }

        const updates: any = { public_dashboard_enabled: enabled };

        if (enabled && !activation.public_dashboard_token) {
            updates.public_dashboard_token = crypto.randomBytes(32).toString('hex');
        }

        if (password === null || password === '') {
            updates.public_dashboard_password = null;
        } else if (password && password.length >= 4) {
            const { hash } = hashPassword(password);
            updates.public_dashboard_password = hash;
        }

        const { data, error } = await supabase
            .from('activations')
            .update(updates)
            .eq('id', id)
            .select('id, public_dashboard_token, public_dashboard_enabled')
            .single();

        if (error) throw error;

        console.log(`[PublicDashboard] ${enabled ? 'Enabled' : 'Disabled'} for activation ${id}`);

        res.json({
            success: true,
            dashboard: {
                enabled: data.public_dashboard_enabled,
                token: data.public_dashboard_token,
                url: `/dashboard/${data.public_dashboard_token}`,
                has_password: !!updates.public_dashboard_password || (password === undefined && !!activation.public_dashboard_token),
            },
        });
    } catch (error: any) {
        console.error('[PublicDashboard] Toggle error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/activations/:id/public-dashboard/status
router.get('/:id/public-dashboard/status', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('activations')
            .select('public_dashboard_token, public_dashboard_enabled, public_dashboard_password')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            enabled: data?.public_dashboard_enabled || false,
            token: data?.public_dashboard_token || null,
            url: data?.public_dashboard_token ? `/dashboard/${data.public_dashboard_token}` : null,
            has_password: !!data?.public_dashboard_password,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// PUBLIC ROUTES — No authentication required
// ==========================================

// POST /api/public/dashboard/:token/verify
router.post('/:token/verify', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const { data: activation, error } = await supabase
            .from('activations')
            .select('id, name, public_dashboard_enabled, public_dashboard_password')
            .eq('public_dashboard_token', token)
            .single();

        if (error || !activation) {
            return res.status(404).json({ success: false, message: 'Dashboard não encontrado.' });
        }

        if (!activation.public_dashboard_enabled) {
            return res.status(403).json({ success: false, message: 'Dashboard desativado pelo administrador.' });
        }

        if (activation.public_dashboard_password) {
            if (!password) {
                return res.json({ success: false, requires_password: true, title: activation.name });
            }
            if (!verifyPassword(password, activation.public_dashboard_password)) {
                return res.status(401).json({ success: false, message: 'Senha incorreta.' });
            }
        }

        res.json({ success: true, activation_id: activation.id, title: activation.name });
    } catch (error: any) {
        console.error('[PublicDashboard] Verify error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/public/dashboard/:token/data
router.get('/:token/data', async (req, res) => {
    try {
        const { token } = req.params;

        const { data: activation, error: actErr } = await supabase
            .from('activations')
            .select('id, name, category, priority, keywords, people_of_interest, status, public_dashboard_enabled, public_dashboard_password')
            .eq('public_dashboard_token', token)
            .single();

        if (actErr || !activation) {
            return res.status(404).json({ success: false, message: 'Dashboard não encontrado.' });
        }

        if (!activation.public_dashboard_enabled) {
            return res.status(403).json({ success: false, message: 'Dashboard desativado.' });
        }

        const activationId = activation.id;
        const now = new Date();
        const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
        const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [
            mentions24hResult, mentionsPrevResult, totalResult, riskResult,
            sourcesResult, kwResult, sentPosResult, sentNegResult, sentNeuResult,
            alertsResult, recentResult, timeSeriesResult,
        ] = await Promise.all([
            supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).eq('activation_id', activationId).gte('created_at', h24ago),
            supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).eq('activation_id', activationId).gte('created_at', h48ago).lt('created_at', h24ago),
            supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).eq('activation_id', activationId),
            supabase.from('intelligence_feed').select('risk_score').eq('activation_id', activationId).not('risk_score', 'is', null).gte('created_at', h24ago),
            supabase.from('intelligence_feed').select('source').eq('activation_id', activationId).not('source', 'is', null).gte('created_at', h24ago),
            supabase.from('intelligence_feed').select('keywords').eq('activation_id', activationId).not('keywords', 'is', null).gte('created_at', h24ago),
            supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).eq('activation_id', activationId).eq('sentiment', 'positive'),
            supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).eq('activation_id', activationId).eq('sentiment', 'negative'),
            supabase.from('intelligence_feed').select('id', { count: 'exact', head: true }).eq('activation_id', activationId).eq('sentiment', 'neutral'),
            supabase.from('intelligence_feed').select('id, title, summary, source, sentiment, risk_score, created_at, keywords').eq('activation_id', activationId).or('risk_score.gte.70,and(sentiment.eq.negative,risk_score.gte.50)').order('created_at', { ascending: false }).limit(8),
            supabase.from('intelligence_feed').select('id, title, summary, source, sentiment, risk_score, created_at').eq('activation_id', activationId).order('created_at', { ascending: false }).limit(20),
            supabase.from('intelligence_feed').select('created_at, sentiment').eq('activation_id', activationId).gte('created_at', d7ago).order('created_at', { ascending: true }),
        ]);

        const current = mentions24hResult.count || 0;
        const prev = mentionsPrevResult.count || 0;
        // Only calculate meaningful growth when baseline is significant enough (prev >= 3)
        // With tiny baselines, percentage becomes misleading (1→3 = 200% but is not a real spike)
        const growthPct = prev >= 3 ? Math.round(((current - prev) / prev) * 100) : (current > prev ? Math.min(Math.round(((current - prev) / Math.max(prev, 1)) * 100), 100) : 0);

        const riskScores = (riskResult.data || []).map((r: any) => r.risk_score).filter((s: any) => typeof s === 'number');
        const avgRisk = riskScores.length > 0 ? Math.round(riskScores.reduce((a: number, b: number) => a + b, 0) / riskScores.length) : 0;

        const uniqueSources = new Set((sourcesResult.data || []).map((r: any) => r.source).filter(Boolean)).size;

        // Word cloud
        const wordCounts: Record<string, number> = {};
        (kwResult.data || []).forEach((r: any) => {
            if (Array.isArray(r.keywords)) {
                r.keywords.forEach((k: string) => {
                    const word = k.trim().toLowerCase();
                    if (word.length > 2) wordCounts[word] = (wordCounts[word] || 0) + 1;
                });
            }
        });
        const wordCloud = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([word, count]) => ({ word, count }));

        const sentPos = sentPosResult.count || 0;
        const sentNeg = sentNegResult.count || 0;
        const sentNeu = sentNeuResult.count || 0;

        // Time series — group by day (last 7 days)
        const tsMap: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split('T')[0];
            tsMap[key] = { positive: 0, negative: 0, neutral: 0, total: 0 };
        }
        (timeSeriesResult.data || []).forEach((r: any) => {
            const day = r.created_at.split('T')[0];
            if (!tsMap[day]) tsMap[day] = { positive: 0, negative: 0, neutral: 0, total: 0 };
            tsMap[day].total++;
            if (r.sentiment === 'positive') tsMap[day].positive++;
            else if (r.sentiment === 'negative') tsMap[day].negative++;
            else tsMap[day].neutral++;
        });
        const timeSeries = Object.entries(tsMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, vals]) => ({
            date,
            label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            ...vals,
        }));

        // Crisis detection — Pre-filter + AI Validator
        const crisisIndicators: string[] = [];
        if (avgRisk >= 70) crisisIndicators.push(`Risk Score médio alto (${avgRisk})`);
        if (growthPct > 80 && current >= 15) crisisIndicators.push(`Pico de menções (+${growthPct}%)`);
        if (sentNeg > sentPos * 2 && sentNeg >= 5) crisisIndicators.push('Sentimento predominantemente negativo');

        let isCrisis = false;
        let crisisReasons: string[] = [];
        let crisisConfidence = 0;
        let adjustedRisk = avgRisk;

        if (crisisIndicators.length > 0) {
            // AI validates if pre-filter suspects crisis
            try {
                const { AIService } = require('../services/aiService');
                const aiService = new AIService(supabase);
                const verdict = await aiService.validateCrisis({
                    indicators: crisisIndicators,
                    mentions_24h: current,
                    mentions_previous: prev,
                    avg_risk: avgRisk,
                    sentiment: { positive: sentPos, negative: sentNeg, neutral: sentNeu },
                    top_articles: (recentResult.data || []).slice(0, 5).map((a: any) => ({
                        title: a.title, summary: a.summary, source: a.source,
                        risk_score: a.risk_score, sentiment: a.sentiment,
                    })),
                    keywords: activation.keywords || [],
                });

                isCrisis = verdict.is_crisis && verdict.confidence >= 60;
                crisisConfidence = verdict.confidence;
                adjustedRisk = verdict.adjusted_risk;
                crisisReasons = isCrisis
                    ? [verdict.reasoning, ...crisisIndicators.map(i => `📊 ${i}`)]
                    : [];

                console.log(`[CrisisValidator] Indicators: ${crisisIndicators.join(', ')} → AI verdict: ${verdict.is_crisis} (confidence: ${verdict.confidence}%) → Final: ${isCrisis}`);
            } catch (err: any) {
                // If AI fails, fall back to static rules
                console.error('[CrisisValidator] AI failed, using static rules:', err.message);
                isCrisis = crisisIndicators.length > 0;
                crisisReasons = crisisIndicators;
            }
        }

        res.json({
            success: true,
            dashboard: {
                activation: {
                    title: activation.name, category: activation.category,
                    priority: activation.priority, status: activation.status,
                    keywords: activation.keywords || [], people_of_interest: activation.people_of_interest || [],
                },
                stats: {
                    total_mentions: totalResult.count || 0, mentions_24h: current, mentions_growth_pct: growthPct,
                    avg_risk_score: isCrisis ? adjustedRisk : avgRisk, sentiment_positive: sentPos, sentiment_negative: sentNeg,
                    sentiment_neutral: sentNeu, sentiment_net: sentPos - sentNeg,
                    unique_sources: uniqueSources, unique_entities: Object.keys(wordCounts).length,
                    alerts_count: (alertsResult.data || []).length,
                },
                word_cloud: wordCloud,
                alerts: (alertsResult.data || []).map((a: any) => ({
                    id: a.id, title: a.title, summary: a.summary, source: a.source,
                    sentiment: a.sentiment, risk_score: a.risk_score, created_at: a.created_at, keywords: a.keywords,
                })),
                recent_feed: (recentResult.data || []).map((f: any) => ({
                    id: f.id, title: f.title, summary: f.summary, source: f.source,
                    sentiment: f.sentiment, risk_score: f.risk_score, created_at: f.created_at,
                })),
                time_series: timeSeries,
                is_crisis: isCrisis,
                crisis_reasons: crisisReasons,
                crisis_confidence: crisisConfidence,
                generated_at: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error('[PublicDashboard] Data error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

export const publicDashboardRouter = router;
