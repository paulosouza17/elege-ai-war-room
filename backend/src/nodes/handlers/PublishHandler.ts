import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';
import { checkDuplicates } from '../../services/deduplication';

export class PublishHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger(`[PublishHandler] Publishing results to Intelligence Feed...`);

        // 1. GATHER ITEMS ONLY FROM DIRECTLY CONNECTED UPSTREAM NODES
        let itemsToPublish: any[] = [];

        // Determine which nodeOutputs to scan: only direct upstream if edges available
        const directUpstreamIds = context.edges
            ? context.edges.filter(e => e.target === node.id).map(e => e.source)
            : null;

        const keysToScan = directUpstreamIds
            ? Object.keys(context.nodeOutputs).filter(k => directUpstreamIds.includes(k))
            : Object.keys(context.nodeOutputs);

        await context.logger(`[PublishHandler] Scanning ${keysToScan.length} upstream node(s): ${keysToScan.join(', ')}`);

        // Check outputs from upstream nodes
        for (const key of keysToScan) {
            const output = context.nodeOutputs[key];
            if (!output.data) continue;

            // Case 1: Standard items array (from AnalysisHandler, SourceHandler)
            if (Array.isArray(output.data.items) && output.data.items.length > 0 && output.data.items[0]?.summary) {
                itemsToPublish.push(...output.data.items);
            }
            // Case 1b: REMOVED — Social media items no longer published directly.
            // They MUST go through AI analysis first to get proper sentiment/entity classification.
            // Case 2: Single analyzed result with summary (from AI analysis without items wrapper)
            else if (output.data.summary && typeof output.data.summary === 'string' && output.data.title) {
                itemsToPublish.push({
                    title: output.data.title || output.data.originalName || 'Resultado da Análise',
                    summary: output.data.summary,
                    content: output.data.extractedText || output.data.content || '',
                    url: output.data.url || null,
                    source: output.data.source || output.data.source_name || 'Fluxo Automatizado',
                    source_type: output.data.content_type_detected || output.data.source_type || 'document',
                    published_at: output.data.published_at || null,
                    risk_score: output.data.risk_score || 0,
                    sentiment: output.data.sentiment || 'neutral',
                    keywords: output.data.keywords || [],
                    entities: output.data.entities || [],
                    detected_entities: output.data.detected_entities || [],
                    per_entity_analysis: output.data.per_entity_analysis || [],
                    source_name: output.data.source_name || null,
                    content_type_detected: output.data.content_type_detected || null,
                    portal_name: output.data.portal_name || null,
                    assets: output.data.assets || [],
                    elege_post_id: output.data.elege_post_id || null,
                    elege_mention_id: output.data.elege_mention_id || null,
                    engagement: output.data.engagement || null,
                    subject_category: output.data.subject_category || null,
                });
            }
            // Case 3: Raw file content from TriggerHandler (extractedText present)
            else if (output.data.extractedText && output.data.trigger) {
                itemsToPublish.push({
                    title: output.data.originalName || 'Arquivo Processado',
                    content: output.data.extractedText,
                    summary: output.data.extractedText.substring(0, 200),
                    source: 'manual_upload',
                    source_type: 'document',
                    fileUrl: output.data.fileUrl
                });
            }
        }

        // Case 3b: If direct upstream had no items, scan ALL nodeOutputs for analyzed items
        // This handles chains like: AI → HTTP → Conditional → Publish (where AI output has items)
        if (itemsToPublish.length === 0) {
            const allKeys = Object.keys(context.nodeOutputs).filter(k => !keysToScan.includes(k));
            for (const key of allKeys) {
                const output = context.nodeOutputs[key];
                if (!output.data) continue;

                // Prefer AI-analyzed items (have summary + sentiment/risk_score)
                if (Array.isArray(output.data.items) && output.data.items.length > 0 && output.data.items[0]?.summary) {
                    itemsToPublish.push(...output.data.items);
                    await context.logger(`[PublishHandler] Found ${output.data.items.length} analyzed items from node ${key}`);
                    break;
                }
                // Also pick up single analyzed results
                if (output.data.summary && typeof output.data.summary === 'string' && output.data.title && output.data.sentiment) {
                    itemsToPublish.push({
                        title: output.data.title,
                        summary: output.data.summary,
                        content: output.data.content || output.data.text || '',
                        source: output.data.source || output.data.source_name || 'Fluxo Automatizado',
                        source_type: output.data.source_type || 'portal',
                        risk_score: output.data.risk_score || 0,
                        sentiment: output.data.sentiment || 'neutral',
                        keywords: output.data.keywords || [],
                        entities: output.data.entities || [],
                        detected_entities: output.data.detected_entities || [],
                        per_entity_analysis: output.data.per_entity_analysis || [],
                        source_name: output.data.source_name || null,
                        content_type_detected: output.data.content_type_detected || null
                    });
                    await context.logger(`[PublishHandler] Found single analyzed item from node ${key}`);
                    break;
                }
            }
        }

        // Case 4: SMART GATHER — auto-detect from portal monitoring flow chain
        if (itemsToPublish.length === 0) {
            await context.logger(`[PublishHandler] No structured items found. Attempting Smart Gather from upstream nodeOutputs...`);
            const smartItem = this.smartGather(context);
            if (smartItem) {
                itemsToPublish.push(smartItem);
                await context.logger(`[PublishHandler] Smart Gather built item: title="${smartItem.title}", source="${smartItem.source}", entities=${smartItem.detected_entities?.length || 0}, keywords=${smartItem.keywords?.length || 0}`);
            }
        }

        if (itemsToPublish.length === 0) {
            await context.logger(`[PublishHandler] No items found. nodeOutputs keys: ${Object.keys(context.nodeOutputs).join(', ')}`);
            if (context.activationId) {
                await context.logger(`[PublishHandler] Creating placeholder from activation context.`);
                itemsToPublish.push({
                    title: 'Execução de Fluxo',
                    summary: 'Fluxo executado sem dados estruturados dos nós anteriores.',
                    source: 'flow_execution',
                    source_type: 'document',
                    risk_score: 0,
                    sentiment: 'neutral',
                    keywords: [],
                    entities: [],
                    detected_entities: []
                });
            } else {
                return { success: false, error: "No items to publish. Verifique se os nós anteriores produziram dados." };
            }
        }

        // 2. FORMAT FOR DB
        const feedItems = itemsToPublish.map(item => {
            // Auto-detect source_type from URL patterns
            const itemUrl = (item.url || '').toLowerCase();
            const isYouTube = itemUrl.includes('youtube.com') || itemUrl.includes('youtu.be');
            const isInstagram = itemUrl.includes('instagram.com') || itemUrl.includes('instagr.am');
            const isTikTok = itemUrl.includes('tiktok.com') || itemUrl.includes('vm.tiktok.com');
            let resolvedSourceType = item.source_type || item.content_type_detected || 'portal';
            if (isYouTube && (resolvedSourceType === 'social_media' || resolvedSourceType === 'portal')) {
                resolvedSourceType = 'tv';
            } else if (isInstagram && resolvedSourceType !== 'instagram') {
                resolvedSourceType = 'instagram';
            } else if (isTikTok && resolvedSourceType !== 'tiktok') {
                resolvedSourceType = 'tiktok';
            }

            return {
                title: item.title || 'Sem título',
                summary: item.summary || item.content?.substring(0, 500) || '',
                content: item.content || item.text || '',
                url: item.url,
                source: item.source_name || item.source || 'Fonte não identificada',
                source_type: resolvedSourceType,
                published_at: item.published_at || new Date().toISOString(),
                risk_score: item.risk_score || 0,
                sentiment: item.sentiment || 'neutral',
                keywords: item.keywords || [],
                classification_metadata: {
                    reasoning: item.relevance_justification || item.context_analysis || item.summary || null,
                    keywords: item.keywords || [],
                    entities: item.entities || [],
                    detected_entities: item.detected_entities || [],
                    per_entity_analysis: item.per_entity_analysis || [],
                    source_name: item.source_name || null,
                    content_type_detected: item.content_type_detected || null,
                    portal_name: item.portal_name || null,
                    portal_type: item.portal_type || null,
                    assets: item.assets || [],
                    elege_post_id: item.elege_post_id || null,
                    elege_mention_id: item.elege_mention_id || null,
                    engagement: item.engagement || null,
                    subject_category: item.subject_category || null,
                    // Twitter/X author metadata
                    author_name: item.author_name || null,
                    author_username: item.author_username || null,
                    author_profile_image: item.author_profile_image || null,
                    author_followers: item.author_followers || null,
                    author_verified: item.author_verified || null,
                    likes: item.likes || null,
                    retweets: item.retweets || null,
                    replies: item.replies || null,
                    impressions: item.impressions || null,
                },
                activation_id: context.activationId,
                user_id: context.userId
            };
        });

        // 3. DEDUP CHECK — Filter out items already in DB for this activation
        const { newItems: dedupedFeedItems, duplicateCount } = await checkDuplicates(
            supabase,
            feedItems,
            context.activationId,
            context.logger
        );

        if (dedupedFeedItems.length === 0) {
            await context.logger(`[PublishHandler] ⏭ All ${feedItems.length} items are duplicates. Nothing to publish.`);
            return {
                success: true,
                data: {
                    publishedCount: 0,
                    skippedDuplicates: duplicateCount,
                    message: `Todos os ${duplicateCount} itens já existem no feed. Nenhum item novo publicado.`
                }
            };
        }

        if (duplicateCount > 0) {
            await context.logger(`[PublishHandler] ⏭ Skipped ${duplicateCount} duplicate(s), inserting ${dedupedFeedItems.length} new item(s).`);
        }

        // 4. INSERT FEED ITEMS (only non-duplicates)
        const { error } = await supabase
            .from('intelligence_feed')
            .insert(dedupedFeedItems);

        if (error) {
            return { success: false, error: `DB Insert Error: ${error.message}` };
        }

        // 5. UPDATE ACTIVATION FILES (Traceability)
        const fileId = context.globalInput?.file_id;
        if (fileId) {
            const analysisSummary = {
                record_count: dedupedFeedItems.length,
                summary: dedupedFeedItems[0]?.summary,
                risk_score: dedupedFeedItems[0]?.risk_score,
                sentiment: dedupedFeedItems[0]?.sentiment,
                keywords: dedupedFeedItems[0]?.classification_metadata?.keywords || []
            };

            await supabase
                .from('activation_files')
                .update({
                    status: 'processed',
                    processed_at: new Date().toISOString(),
                    metadata: analysisSummary
                })
                .eq('id', fileId);

            await context.logger(`[PublishHandler] Updated activation_file ${fileId} status to processed.`);
        }

        await context.logger(`[PublishHandler] Successfully published ${dedupedFeedItems.length} items${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}.`);

        return {
            success: true,
            data: {
                publishedCount: dedupedFeedItems.length,
                skippedDuplicates: duplicateCount
            }
        };
    }

    /**
     * Smart Gather: scans all upstream nodeOutputs to auto-detect
     * title, url, portal name, cited entities, and keywords.
     * 
     * Works by recognizing common output patterns from:
     * - LoopHandler (current item aliases with title/url)
     * - MediaOutletHandler (portal name/type)
     * - HttpRequestHandler (response_* keys with content, people, keywords)
     * - LinkCheckHandler (url)
     * - ConditionalHandler (resolved values)
     */
    private smartGather(context: ExecutionContext): any | null {
        const outputs = context.nodeOutputs;
        const keys = Object.keys(outputs);

        if (keys.length === 0) return null;

        let title: string | null = null;
        let url: string | null = null;
        let portalName: string | null = null;
        let portalType: string | null = null;
        let content: string | null = null;
        let summary: string | null = null;
        let detectedEntities: string[] = [];
        let keywords: string[] = [];
        let sentiment: string = 'neutral';
        let riskScore: number = 0;
        let sourceType: string = 'portal';

        // Detect source_type from available items across all outputs
        for (const nodeId of keys) {
            const data = outputs[nodeId]?.data;
            if (!data) continue;
            if (data.source_type && typeof data.source_type === 'string') {
                sourceType = data.source_type;
                break;
            }
            if (data.items?.[0]?.source_type) {
                sourceType = data.items[0].source_type;
                break;
            }
        }

        for (const nodeId of keys) {
            const data = outputs[nodeId]?.data;
            if (!data) continue;

            // ── TITLE detection ──
            // Priority: loop alias items with .title, then response_title
            if (!title) {
                title = this.findFirstString(data, ['title', 'titulo', 'headline']);
                // Check loop aliases (e.g. data.noticia.title)
                if (!title) {
                    for (const key of Object.keys(data)) {
                        if (key.startsWith('_')) continue;
                        const val = data[key];
                        if (val && typeof val === 'object' && !Array.isArray(val)) {
                            const nested = this.findFirstString(val, ['title', 'titulo', 'headline', 'name']);
                            if (nested) { title = nested; break; }
                        }
                    }
                }
                // Check response_ prefixed keys
                if (!title) {
                    title = this.findFirstString(data, ['response_title', 'response_titulo', 'response_headline']);
                }
            }

            // ── URL detection ──
            if (!url) {
                url = this.findFirstString(data, ['url', 'link', 'href']);
                if (!url) {
                    for (const key of Object.keys(data)) {
                        if (key.startsWith('_')) continue;
                        const val = data[key];
                        if (val && typeof val === 'object' && !Array.isArray(val)) {
                            const nested = this.findFirstString(val, ['url', 'link', 'href']);
                            if (nested && typeof nested === 'string' && nested.startsWith('http')) { url = nested; break; }
                        }
                    }
                }
            }

            // ── PORTAL / SOURCE detection ──
            // Look for MediaOutlet handler outputs (iconType-based)
            if (!portalName && data.items && Array.isArray(data.items) && data.items.length > 0) {
                const firstItem = data.items[0];
                if (firstItem.name && firstItem.type && firstItem.url) {
                    // This is likely a MediaOutletHandler output
                    portalName = firstItem.name;
                    portalType = firstItem.type;
                }
            }
            // Check loop aliases that have portal-like structure
            if (!portalName) {
                for (const key of Object.keys(data)) {
                    if (key.startsWith('_')) continue;
                    const val = data[key];
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        if (val.name && val.type && (val.url || val.city !== undefined)) {
                            portalName = val.name;
                            portalType = val.type;
                            break;
                        }
                    }
                }
            }

            // ── ENTITIES / CITED PEOPLE detection ──
            const entityKeys = ['people_found', 'entities', 'detected_entities', 'pessoas',
                'response_people_found', 'response_entities', 'response_detected_entities',
                'people', 'persons', 'citados', 'references', 'response_references',
                'response_people', 'mentioned_people', 'response_mentioned_people'];
            for (const ek of entityKeys) {
                const val = data[ek];
                if (Array.isArray(val) && val.length > 0) {
                    const names = val.map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item?.name) return item.name;
                        if (item?.entity) return item.entity;
                        return null;
                    }).filter(Boolean);
                    if (names.length > 0) {
                        detectedEntities = Array.from(new Set([...detectedEntities, ...names]));
                    }
                }
            }

            // ── KEYWORDS detection ──
            const kwKeys = ['keywords', 'tags', 'topics', 'temas', 'palavras_chave',
                'response_keywords', 'response_tags', 'response_topics'];
            for (const kk of kwKeys) {
                const val = data[kk];
                if (Array.isArray(val) && val.length > 0) {
                    const kws = val.filter((k: any) => typeof k === 'string');
                    if (kws.length > 0) {
                        keywords = Array.from(new Set([...keywords, ...kws]));
                    }
                }
            }

            // ── CONTENT / SUMMARY detection ──
            if (!content) {
                content = this.findFirstString(data, ['content', 'text', 'extractedText', 'body',
                    'response_content', 'response_text', 'response_body', 'article_text']);
            }
            if (!summary) {
                const candidate = this.findFirstString(data, ['summary', 'resumo', 'description', 'descricao',
                    'response_summary', 'response_resumo', 'response_description']);
                // Skip descriptive aggregation summaries (e.g. "Coletados 10 tweets via search_recent")
                if (candidate && !/^Coletados \d+/.test(candidate) && !/^HTTP \w+ http/i.test(candidate)) {
                    summary = candidate;
                }
            }

            // ── SENTIMENT & RISK ──
            if (data.sentiment && typeof data.sentiment === 'string') sentiment = data.sentiment;
            if (data.response_sentiment && typeof data.response_sentiment === 'string') sentiment = data.response_sentiment;
            if (data.risk_score && typeof data.risk_score === 'number') riskScore = data.risk_score;
            if (data.response_risk_score && typeof data.response_risk_score === 'number') riskScore = data.response_risk_score;
        }

        // If we found at least a title or url, build a feed item
        if (!title && !url && !content) return null;

        // Auto-generate summary from content if missing
        if (!summary && content) {
            summary = content.substring(0, 500).replace(/\s+/g, ' ').trim();
            if (content.length > 500) summary += '...';
        }

        return {
            title: title || 'Menção Detectada',
            url,
            summary: summary || '',
            content: content || '',
            source: portalName || 'Fonte Automatizada',
            source_name: portalName || null,
            source_type: sourceType,
            portal_name: portalName,
            portal_type: portalType,
            risk_score: riskScore,
            sentiment,
            keywords,
            entities: detectedEntities,
            detected_entities: detectedEntities,
            content_type_detected: portalType || 'portal',
            published_at: new Date().toISOString(),
        };
    }

    /**
     * Find the first non-empty string value from a data object matching any of the given keys.
     */
    private findFirstString(data: any, keys: string[]): string | null {
        for (const key of keys) {
            const val = data[key];
            if (typeof val === 'string' && val.trim().length > 0) return val;
        }
        return null;
    }
}
