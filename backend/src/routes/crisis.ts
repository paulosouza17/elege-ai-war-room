import { Router } from 'express';
import { AIService } from '../services/aiService';
import { supabase } from '../config/supabase';

const router = Router();

router.post('/plan', async (req, res) => {
    try {
        const { title, description, summary, severity, crisisId, userFeedback } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Missing title' });
        }

        const safeDescription = description || summary || 'No description provided.';
        const contentSummary = summary || description || '';

        // ── GATHER RICH CONTEXT from DB (Token-Optimized) ──
        const MAX_MENTIONS = 10;
        const SUMMARY_MAX_CHARS = 150;
        let mentionsContext: string[] = [];
        let entitiesContext = '';
        let evidencesContext: string[] = [];

        if (crisisId) {
            // 1. Fetch the crisis packet to get evidence_ids
            const { data: crisisData } = await supabase
                .from('crisis_packets')
                .select('evidence_ids')
                .eq('id', crisisId)
                .single();

            // 2. Fetch bundled mentions — sorted by risk_score, limited
            if (crisisData && crisisData.evidence_ids && crisisData.evidence_ids.length > 0) {
                const { data: mentions } = await supabase
                    .from('intelligence_feed')
                    .select('title, summary, sentiment, risk_score, source, classification_metadata')
                    .in('id', crisisData.evidence_ids)
                    .order('risk_score', { ascending: false });

                if (mentions) {
                    // OPT1: Take only top N by risk_score, compact format
                    const topMentions = mentions.slice(0, MAX_MENTIONS);
                    const totalCount = mentions.length;

                    mentionsContext = topMentions.map((m: any, idx: number) => {
                        const parts = [`[${idx + 1}] "${m.title}"`];
                        if (m.summary) parts.push(m.summary.substring(0, SUMMARY_MAX_CHARS));
                        if (m.sentiment) parts.push(`(${m.sentiment})`);
                        if (m.risk_score) parts.push(`risco:${m.risk_score}`);
                        if (m.source) parts.push(`fonte:${m.source}`);
                        return parts.join(' | ');
                    });

                    if (totalCount > MAX_MENTIONS) {
                        mentionsContext.push(`[...+${totalCount - MAX_MENTIONS} menções de menor risco omitidas]`);
                    }

                    // OPT2: Deduplicate entities across ALL mentions
                    const entityMap: Record<string, { count: number; sentiments: Record<string, number> }> = {};
                    for (const m of mentions) {
                        const perEntity = m.classification_metadata?.per_entity_analysis;
                        if (!Array.isArray(perEntity)) continue;
                        for (const ea of perEntity) {
                            const name = ea.entity_name;
                            if (!name) continue;
                            if (!entityMap[name]) entityMap[name] = { count: 0, sentiments: {} };
                            entityMap[name].count++;
                            const s = ea.sentiment || 'neutro';
                            entityMap[name].sentiments[s] = (entityMap[name].sentiments[s] || 0) + 1;
                        }
                    }

                    const entityEntries = Object.entries(entityMap);
                    if (entityEntries.length > 0) {
                        entitiesContext = entityEntries
                            .sort((a, b) => b[1].count - a[1].count)
                            .map(([name, data]) => {
                                const sentStr = Object.entries(data.sentiments)
                                    .map(([s, c]) => `${c} ${s}`)
                                    .join(', ');
                                return `${name}: ${data.count} citações (${sentStr})`;
                            })
                            .join('; ');
                    }
                }
            }

            // 3. Fetch evidence attachments
            const { data: evidences } = await supabase
                .from('crisis_evidence')
                .select('title, description, evidence_type')
                .eq('crisis_id', crisisId);

            if (evidences?.length) {
                evidencesContext = evidences.map((e: any, idx: number) => {
                    const parts = [`[${idx + 1}] "${e.title || 'Sem título'}"`];
                    if (e.description) parts.push(e.description);
                    if (e.evidence_type) parts.push(`(${e.evidence_type})`);
                    return parts.join(' | ');
                });
            }
        }

        // Instantiate AI Service with Supabase client to fetch config from DB
        const aiService = new AIService(supabase);

        const plan = await aiService.generateCrisisPlan(
            { title, description: safeDescription, severity, contentSummary },
            userFeedback,
            mentionsContext,
            evidencesContext,
            entitiesContext
        );

        // If crisisId is provided, save the plan to the database
        if (crisisId) {
            const updatePayload: any = { plan: plan };
            if (userFeedback) {
                updatePayload.user_feedback = userFeedback;
            }

            const { error } = await supabase
                .from('crisis_packets')
                .update(updatePayload)
                .eq('id', crisisId);

            if (error) {
                console.error('Error saving plan to DB:', error);
            }
        }

        res.json({ success: true, plan });

    } catch (error: any) {
        console.error('Crisis Plan Route Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update an existing plan (e.g. checkbox changes)
router.put('/:id/plan', async (req, res) => {
    try {
        const { id } = req.params;
        const { plan } = req.body;

        const { data, error } = await supabase
            .from('crisis_packets')
            .update({ plan })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Error updating plan:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export const crisisRouter = router;
