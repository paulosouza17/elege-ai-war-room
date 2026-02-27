import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { interpolate } from '../utils/interpolate';
import { supabase } from '../../config/supabase';
import { AIService } from '../../services/aiService';

const AI_TIMEOUT_MS = 30_000; // 30 seconds max per AI call to prevent 10m executor timeouts

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms / 1000}s`)), ms);
        promise.then(
            (val) => { clearTimeout(timer); resolve(val); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 10_000; // 10 seconds between retries

async function withRetry<T>(fn: () => Promise<T>, label: string, logger: (msg: string) => Promise<void>): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const isRetryable = /503|429|timeout|ECONNRESET|ETIMEDOUT|high demand/i.test(err.message || '');
            if (!isRetryable || attempt === RETRY_ATTEMPTS) {
                await logger(`[AnalysisHandler] ❌ Attempt ${attempt}/${RETRY_ATTEMPTS} failed (${label}): ${err.message}`);
                throw err;
            }
            await logger(`[AnalysisHandler] ⚠ Attempt ${attempt}/${RETRY_ATTEMPTS} failed (${label}): ${err.message}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
    throw lastError;
}

export class AnalysisHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger(`[AnalysisHandler] Analyzing content via AI...`);

        // 1. GATHER INPUT — only items with actual content
        let itemsToAnalyze: any[] = [];

        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (!output.data) continue;

            // Check for items array with actual article content
            if (Array.isArray(output.data.items)) {
                const contentItems = output.data.items.filter((item: any) =>
                    item.content || item.extractedText || item.summary
                );
                if (contentItems.length > 0) {
                    itemsToAnalyze.push(...contentItems);
                }
            }

            // Check for direct content fields (e.g. response_content from http nodes)
            if (output.data.response_content && !itemsToAnalyze.some((i: any) => i.content === output.data.response_content)) {
                itemsToAnalyze.push({
                    content: output.data.response_content,
                    title: output.data.response_title || 'Sem título',
                    url: output.data.response_url || '',
                    source: 'http_content',
                    media: output.data.response_media || [],
                });
            }

            // Check for manual uploads
            if (output.data.extractedText || output.data.fileUrl) {
                itemsToAnalyze.push({
                    content: output.data.extractedText || "Conteúdo não extraível (Imagem/PDF sem OCR)",
                    title: output.data.originalName,
                    source: 'manual_upload',
                    fileUrl: output.data.fileUrl,
                    isMultimodal: !!output.data.fileUrl,
                });
            }
        }

        // Fallback: use raw upstream data
        if (itemsToAnalyze.length === 0) {
            const allUpstreamData: Record<string, any> = {};
            for (const key in context.nodeOutputs) {
                const output = context.nodeOutputs[key];
                if (output?.data) {
                    const { _variables, _dynamic, ...cleanData } = output.data;
                    allUpstreamData[key] = cleanData;
                }
            }

            if (Object.keys(allUpstreamData).length > 0) {
                await context.logger(`[AnalysisHandler] No structured items found, using raw upstream data from ${Object.keys(allUpstreamData).length} nodes.`);
                itemsToAnalyze.push({
                    content: JSON.stringify(allUpstreamData, null, 2),
                    title: 'Dados de nós anteriores',
                    source: 'upstream_nodes',
                });
            } else {
                return { success: false, error: "No content to analyze found from previous steps." };
            }
        }

        await context.logger(`[AnalysisHandler] Found ${itemsToAnalyze.length} items to analyze.`);

        // CAP: Limit items to prevent timeout (each AI call ≈ 5-30s with retries)
        // 15 items × 30s worst-case = ~7.5 min — fits within 5-10 min executor budget
        const MAX_ITEMS_PER_EXECUTION = 15;
        if (itemsToAnalyze.length > MAX_ITEMS_PER_EXECUTION) {
            await context.logger(`[AnalysisHandler] ⚠ Capping from ${itemsToAnalyze.length} to ${MAX_ITEMS_PER_EXECUTION} items to prevent timeout.`);
            // Sort by engagement (highest first) to prioritize impactful content
            itemsToAnalyze.sort((a, b) => (b.engagement || b.likes || 0) - (a.engagement || a.likes || 0));
            itemsToAnalyze = itemsToAnalyze.slice(0, MAX_ITEMS_PER_EXECUTION);
        }

        // Read node config
        const config = node.data || {};
        const userPrompt = config.prompt || '';
        const prePrompt = config.prePrompt || '';
        const outputFormat = config.outputFormat || 'json';
        const contextLinks = (config.contextLinks || '').split('\n').filter((l: string) => l.trim());

        const resolvedPrompt = interpolate(userPrompt, context);
        const modelOverride = config.model || '';

        const aiService = new AIService(supabase);
        const analyzedItems = [];

        // 2. FETCH MONITORED ENTITIES (Watchlist)
        let watchlistPrompt = "";
        let monitoredEntities: any[] = [];
        try {
            const { data: entities } = await supabase
                .from('monitored_entities')
                .select('*')
                .eq('user_id', context.userId);

            if (entities && entities.length > 0) {
                monitoredEntities = entities;
                watchlistPrompt = `
                ALVOS MONITORADOS (Entidades de Interesse):
                Abaixo está a lista de pessoas/organizações que estamos monitorando.
                Sua tarefa é identificar se alguma dessas entidades é mencionada no texto.

                CRITÉRIOS DE IDENTIFICAÇÃO:
                1. Ocorrência exata ou aproximada do "Nome" principal.
                2. Ocorrência de QUALQUER um dos "Apelidos" listados.
                3. Identificação contextual clara baseada na "Descrição".

                Lista de Alvos:
                ${entities.map(e => `- ID: ${e.id} | Nome: "${e.name}" | Apelidos: [${e.aliases?.join(', ')}] | Desc: "${e.description}"`).join('\n')}
                
                INSTRUÇÃO OBRIGATÓRIA:
                Se detectar qualquer um desses alvos (por nome ou apelido), você DEVE adicionar o ID correspondente ao array 'detected_entities' no JSON.
                Exemplo: "detected_entities": ["${entities[0].id}"]

                ⚠ REGRA ANTI-VIÉS — CRÍTICA:
                Você DEVE detectar entidades monitoradas INDEPENDENTE DO SENTIMENTO do artigo.
                Menções POSITIVAS, NEUTRAS ou ELOGIOSAS também devem ser detectadas.
                NÃO ignore uma entidade só porque ela está em contexto favorável.
                Qualquer citação = detecção obrigatória. Sentimento é irrelevante para a detecção.
                `;

                await context.logger(`[AnalysisHandler] Loaded ${entities.length} entities for watchlist.`);
            }
        } catch (err) {
            await context.logger(`[AnalysisHandler] Failed to load watchlist: ${err}`);
        }

        // 3a. GATHER ACTIVATION CONTEXT from trigger node output
        let activationPrompt = "";
        const triggerOutput = Object.values(context.nodeOutputs).find(
            (o: any) => o?.data?.trigger === 'activation'
        );
        if (triggerOutput) {
            const td = (triggerOutput as any).data;
            const parts: string[] = [];
            if (td.analysis_instructions) parts.push(`INSTRUÇÕES DO OPERADOR (PRIORIDADE MÁXIMA):\n${td.analysis_instructions}`);
            if (td.keywords?.length) parts.push(`PALAVRAS-CHAVE MONITORADAS: ${td.keywords.join(', ')}`);
            if (td.people_of_interest?.length) parts.push(`PESSOAS DE INTERESSE: ${td.people_of_interest.join(', ')}`);
            if (td.briefing) parts.push(`BRIEFING: ${td.briefing}`);
            if (td.category) parts.push(`CATEGORIA: ${td.category}`);
            if (td.activation_name) parts.push(`ATIVAÇÃO: ${td.activation_name}`);
            if (parts.length > 0) {
                activationPrompt = `\nCONTEXTO DA ATIVAÇÃO:\n${parts.join('\n')}\n`;
                await context.logger(`[AnalysisHandler] Injecting activation context: ${td.keywords?.length || 0} keywords, ${td.people_of_interest?.length || 0} people${td.analysis_instructions ? ', with custom instructions' : ''}`);
            }
        }

        // 3b. GATHER UPSTREAM SCRIPT RESULTS (keyword/people matches already detected)
        let scriptContextPrompt = "";
        const scriptOutput = Object.values(context.nodeOutputs).find(
            (o: any) => o?.data?.keyword_matches || o?.data?.people_matches
        );
        if (scriptOutput) {
            const sd = (scriptOutput as any).data;
            const sparts: string[] = [];
            if (sd.keyword_matches?.length) sparts.push(`Keywords encontradas no texto: ${sd.keyword_matches.join(', ')}`);
            if (sd.people_matches?.length) sparts.push(`Pessoas encontradas no texto: ${sd.people_matches.join(', ')}`);
            if (sparts.length > 0) {
                scriptContextPrompt = `\nRESULTADOS PRÉ-DETECTADOS:\n${sparts.join('\n')}\nUse estes dados como ponto de partida. Confirme e aprofunde a análise.\n`;
            }
        }

        // 3c. DETECT PORTAL/SOURCE name from upstream
        let portalName = "";
        for (const key of Object.keys(context.nodeOutputs)) {
            const d = (context.nodeOutputs[key] as any)?.data;
            if (!d) continue;
            // Check loop aliases and items for portal-like objects
            for (const k of Object.keys(d)) {
                if (k.startsWith('_')) continue;
                const v = d[k];
                if (v && typeof v === 'object' && !Array.isArray(v) && v.name && v.type && v.url) {
                    portalName = v.name;
                    break;
                }
            }
            if (portalName) break;
        }

        // 4. ANALYZE EACH ITEM
        for (let i = 0; i < itemsToAnalyze.length; i++) {
            const item = itemsToAnalyze[i];
            await context.logger(`[AnalysisHandler] Processing item ${i + 1}/${itemsToAnalyze.length}: ${item.title || 'Sem título'}`);

            const perEntityInstruction = `
INSTRUÇÃO — ANÁLISE POR ENTIDADE CITADA:
Se o texto mencionar pessoas ou organizações, retorne "per_entity_analysis" como array.
Formato para cada item:
{
  "entity_name": "Nome",
  "entity_id": "ID do alvo monitorado (se aplicável, senão null)",
  "sentiment": "positive|negative|neutral|mixed",
  "context": "Trecho resumido de como essa pessoa foi citada",
  "tone": "descritivo|crítico|elogioso|neutro|alarmista"
}
Se NENHUMA pessoa for citada, retorne "per_entity_analysis": [].
Inclua TODAS as pessoas citadas, independente do sentimento.

⚠ REGRA DE SENTIMENTO — PERSPECTIVA DO ALVO:
O "sentiment" de cada entidade deve refletir como o CONTEÚDO IMPACTA essa pessoa:
- "positive": apoio, elogio, endosso, defesa, promoção da imagem. Ex: "X Presidente", "X é o melhor", "Vote em X".
- "negative": crítica, ataque, denúncia, associação com escândalos, dano à imagem.
- "neutral": menção factual sem tom emocional claro.
- "mixed": o texto contém elementos positivos E negativos para a mesma pessoa.

EXEMPLOS PARA CALIBRAÇÃO:
- "Flávio Bolsonaro Presidente" → sentiment: "positive" (endosso direto)
- "Soltem Bolsonaro" → sentiment: "positive" (defesa, apoio)
- "X é corrupto" → sentiment: "negative" (ataque)
- "X disse que..." → sentiment: "neutral" (factual)
- Ataques a adversários que BENEFICIAM o alvo monitorado → sentiment do alvo: "positive"
  Ex: "Lula ladrão, Flávio Presidente" → Flávio=positive, Lula=negative

IMPORTANTE: Hashtags de apoio (#ImpeachmentDoX, #XPresidente) indicam o sentimento do autor.
Um tweet que DEFENDE ou PROMOVE alguém é POSITIVO para essa pessoa, mesmo que critique outros.
`;

            // Build activation-scoped framing
            let activationFraming = '';
            if (triggerOutput) {
                const td = (triggerOutput as any).data;
                const activationName = td.activation_name || '';
                activationFraming = `
ESCOPO DA ANÁLISE — REGRAS CRÍTICAS:
Esta análise faz parte do monitoramento "${activationName}".

1. ANALISE SOMENTE O QUE ESTÁ NO TEXTO. Não invente, não suponha, não extrapole.
2. NUNCA mencione pessoas, entidades ou keywords que NÃO aparecem no texto.
   Se alguém não é citado no artigo, essa pessoa NÃO DEVE aparecer em nenhum campo da análise.
3. Avalie o IMPACTO deste conteúdo sob a perspectiva desta ativação.
4. Adicione ao JSON:
   - "activation_relevance": "high" | "medium" | "low" | "none"
   - "relevance_justification": breve justificativa da relevância para "${activationName}"
5. Se o artigo não tem relação direta com o contexto monitorado, classifique como "none" ou "low".

⚠ CALIBRAÇÃO DO risk_score (0-100) — ATENÇÃO:
O risk_score mede o RISCO REPUTACIONAL PARA O ALVO MONITORADO, NÃO a relevância.
Relevância alta ≠ risco alto. Um elogio é altamente relevante mas tem risco BAIXO.

Escala obrigatória:
- 0-20: Conteúdo POSITIVO ou NEUTRO para o alvo (elogio, apoio, endosso, defesa)
- 21-40: Menção factual sem impacto reputacional significativo
- 41-60: Conteúdo com potencial de risco moderado (polêmica, crítica branda)
- 61-80: Conteúdo NEGATIVO real (ataque, escândalo, denúncia contra o alvo)
- 81-100: Crise reputacional grave (viral negativo, acusação criminal)

Exemplos:
- "X Presidente, vote em X" → risk_score: 10 (apoio direto = risco zero)
- "X disse que vai investir em educação" → risk_score: 25 (factual neutro)
- "Investigação apura atos de X" → risk_score: 70 (risco real)
- "X indiciado por corrupção" → risk_score: 90 (crise)
`;

            }

            const prompt = `${prePrompt ? `${prePrompt}\n\n` : ''}${resolvedPrompt ? `${resolvedPrompt}\n\n` : ''}${!prePrompt && !resolvedPrompt ? 'Analise o conteúdo a seguir com foco em inteligência política e narrativa.\n\n' : ''}${activationFraming}${activationPrompt}${scriptContextPrompt}${portalName ? `VEÍCULO/PORTAL DE ORIGEM: ${portalName}\n` : ''}${watchlistPrompt}${perEntityInstruction}
---
CONTEÚDO PARA ANÁLISE:
Título: ${item.title || 'Sem título'}
${item.url ? `URL: ${item.url}` : ''}
Texto:
${(item.content || item.summary || '').substring(0, 8000)}
${contextLinks.length > 0 ? `\nLINKS DE CONTEXTO:\n${contextLinks.join('\n')}` : ''}`;


            try {
                let cleanJson = '';

                const isPlaceholder = item.content && item.content.includes("Conteúdo não extraível");

                if (item.fileUrl && (isPlaceholder || item.isMultimodal)) {
                    await context.logger(`[AnalysisHandler] Downloading file for multimodal analysis...`);
                    const axios = require('axios');
                    const response: any = await withTimeout(
                        axios.get(item.fileUrl, { responseType: 'arraybuffer', timeout: 30000 }),
                        30000,
                        'File download'
                    );
                    const fileBuffer = Buffer.from(response.data);

                    const ext = item.title?.split('.').pop()?.toLowerCase();
                    let mimeType = 'application/pdf';
                    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

                    await context.logger(`[AnalysisHandler] Sending ${mimeType} (${fileBuffer.length} bytes) to Gemini...`);
                    const aiResponse = await withRetry(
                        () => withTimeout(
                            aiService.generateWithFile(prompt, fileBuffer, mimeType),
                            AI_TIMEOUT_MS,
                            'Gemini multimodal'
                        ),
                        'Gemini multimodal',
                        context.logger
                    );
                    cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

                } else {
                    await context.logger(`[AnalysisHandler] Sending text to AI (${prompt.length} chars)${modelOverride ? ` [model: ${modelOverride}]` : ''}...`);
                    const maxTokens = config.maxOutputTokens || 2048;
                    const aiResponse = await withRetry(
                        () => withTimeout(
                            aiService.generateRaw(prompt, modelOverride || undefined, maxTokens),
                            AI_TIMEOUT_MS,
                            'AI generateRaw'
                        ),
                        'AI generateRaw',
                        context.logger
                    );
                    cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                }

                await context.logger(`[AnalysisHandler] AI Response received (${cleanJson.length} chars).`);

                if (outputFormat === 'text') {
                    analyzedItems.push({
                        ...item,
                        summary: cleanJson,
                        raw_text: cleanJson,
                        analyzed_at: new Date().toISOString()
                    });
                } else {
                    let analysisData;
                    try {
                        analysisData = JSON.parse(cleanJson);
                    } catch (parseError) {
                        await context.logger(`[AnalysisHandler] ⚠ JSON Parse Failed. Using fallback risk_score=51. Raw: ${cleanJson.substring(0, 200)}`);
                        analysisData = {
                            summary: cleanJson.substring(0, 500),
                            risk_score: 51,
                            sentiment: 'neutral',
                            keywords: [],
                            entities: [],
                            detected_entities: []
                        };
                    }

                    // POST-PROCESS: Normalize detected_entities — convert names to UUIDs
                    if (monitoredEntities.length > 0 && Array.isArray(analysisData.detected_entities)) {
                        const validIds = new Set(monitoredEntities.map(e => e.id));
                        const normalizedIds: string[] = [];

                        for (const val of analysisData.detected_entities) {
                            if (validIds.has(val)) {
                                // Already a valid UUID
                                normalizedIds.push(val);
                            } else if (typeof val === 'string') {
                                // AI returned a name — match against name/aliases
                                const match = monitoredEntities.find(e =>
                                    e.name.toLowerCase() === val.toLowerCase() ||
                                    (e.aliases || []).some((a: string) => a.toLowerCase() === val.toLowerCase())
                                );
                                if (match) {
                                    normalizedIds.push(match.id);
                                    await context.logger(`[AnalysisHandler] Normalized entity name "${val}" → UUID ${match.id}`);
                                }
                            }
                        }
                        analysisData.detected_entities = [...new Set(normalizedIds)];
                    }

                    // POST-PROCESS: Normalize per_entity_analysis entity_id the same way
                    if (monitoredEntities.length > 0 && Array.isArray(analysisData.per_entity_analysis)) {
                        const validIds = new Set(monitoredEntities.map(e => e.id));
                        for (const ea of analysisData.per_entity_analysis) {
                            if (ea.entity_id && !validIds.has(ea.entity_id)) {
                                // entity_id is invalid — try to match by entity_name
                                const match = monitoredEntities.find(e =>
                                    e.name.toLowerCase() === (ea.entity_name || '').toLowerCase() ||
                                    (e.aliases || []).some((a: string) => a.toLowerCase() === (ea.entity_name || '').toLowerCase())
                                );
                                ea.entity_id = match ? match.id : null;
                            }
                            // Also ensure entity_id is set when entity_name matches a monitored entity
                            if (!ea.entity_id && ea.entity_name) {
                                const match = monitoredEntities.find(e =>
                                    e.name.toLowerCase() === ea.entity_name.toLowerCase() ||
                                    (e.aliases || []).some((a: string) => a.toLowerCase() === ea.entity_name.toLowerCase())
                                );
                                if (match) ea.entity_id = match.id;
                            }
                        }
                    }

                    // POST-PROCESS: Normalize all standard fields from AI response
                    // 1. Summary — always clean readable text, never JSON
                    if (!analysisData.summary || typeof analysisData.summary !== 'string' || analysisData.summary.trim().startsWith('{')) {
                        analysisData.summary =
                            analysisData.relevance_justification ||
                            analysisData.context_analysis ||
                            analysisData.relevance_explanation ||
                            (item.content || item.title || '').substring(0, 500) ||
                            'Análise realizada sem resumo disponível.';
                    }

                    // 2. Risk score — derive from activation_relevance if AI didn't provide one
                    // Relevance != Risk: high relevance just means it's about the target, not that it's risky
                    if (!analysisData.risk_score || analysisData.risk_score === 0) {
                        const relevanceMap: Record<string, number> = { high: 50, medium: 35, low: 20, none: 5 };
                        const baseScore = relevanceMap[analysisData.activation_relevance] || 30;

                        // Only boost risk if the MONITORED TARGET has negative sentiment (not bystander entities)
                        const monitoredEntityIds = new Set(monitoredEntities.map(e => e.id));
                        const monitoredEntityNames = new Set(monitoredEntities.map(e => e.name.toLowerCase()));
                        const targetNegative = (analysisData.per_entity_analysis || []).some((ea: any) =>
                            ea.sentiment === 'negative' && (
                                monitoredEntityIds.has(ea.entity_id) ||
                                monitoredEntityNames.has((ea.entity_name || '').toLowerCase())
                            )
                        );
                        analysisData.risk_score = targetNegative ? Math.min(baseScore + 15, 95) : baseScore;
                    }

                    // 2b. Risk score post-processing — override when AI confuses relevance with risk
                    // If monitored target sentiment is positive/neutral but AI gave high risk, cap it
                    if (analysisData.risk_score >= 60 && monitoredEntities.length > 0) {
                        const monitoredEntityIds = new Set(monitoredEntities.map(e => e.id));
                        const monitoredEntityNames = new Set(monitoredEntities.map(e => e.name.toLowerCase()));
                        const targetAnalyses = (analysisData.per_entity_analysis || []).filter((ea: any) =>
                            monitoredEntityIds.has(ea.entity_id) ||
                            monitoredEntityNames.has((ea.entity_name || '').toLowerCase())
                        );
                        const allTargetsPositiveOrNeutral = targetAnalyses.length > 0 &&
                            targetAnalyses.every((ea: any) => ea.sentiment === 'positive' || ea.sentiment === 'neutral');
                        if (allTargetsPositiveOrNeutral) {
                            analysisData.risk_score = Math.min(analysisData.risk_score, 35);
                        }
                    }

                    // 3. Sentiment — derive from MONITORED TARGET's per_entity sentiment
                    // Use the sentiment of the monitored entity, not any random entity
                    if (!analysisData.sentiment || analysisData.sentiment === 'neutral') {
                        const monitoredEntityIds = new Set(monitoredEntities.map(e => e.id));
                        const monitoredEntityNames = new Set(monitoredEntities.map(e => e.name.toLowerCase()));

                        // Find the per-entity analysis for the monitored target(s)
                        const targetAnalyses = (analysisData.per_entity_analysis || []).filter((ea: any) =>
                            monitoredEntityIds.has(ea.entity_id) ||
                            monitoredEntityNames.has((ea.entity_name || '').toLowerCase())
                        );

                        if (targetAnalyses.length > 0) {
                            // Use the monitored target's sentiment
                            const targetSentiments = targetAnalyses.map((ea: any) => ea.sentiment);
                            if (targetSentiments.includes('negative')) analysisData.sentiment = 'negative';
                            else if (targetSentiments.includes('positive')) analysisData.sentiment = 'positive';
                            else if (targetSentiments.includes('mixed')) analysisData.sentiment = 'mixed';
                        } else {
                            // No monitored entity found — fall back to any entity
                            const sentiments = (analysisData.per_entity_analysis || []).map((e: any) => e.sentiment);
                            if (sentiments.includes('negative')) analysisData.sentiment = 'negative';
                            else if (sentiments.includes('positive')) analysisData.sentiment = 'positive';
                            else if (sentiments.includes('mixed')) analysisData.sentiment = 'mixed';
                        }
                    }

                    // 4. Keywords — extract from content if AI didn't provide any
                    if (!analysisData.keywords || analysisData.keywords.length === 0) {
                        const entityNames = (analysisData.per_entity_analysis || []).map((e: any) => e.entity_name).filter(Boolean);
                        if (entityNames.length > 0) {
                            analysisData.keywords = entityNames;
                        }
                    }

                    // Merge: item fields first, then AI analysis overwrites
                    // BUT preserve critical source fields from the original item
                    // (AI response may contain generic source/source_type that would overwrite
                    //  the real values like source:'twitter', source_type:'social_media')
                    const preservedFields: Record<string, any> = {};
                    const fieldsToPreserve = [
                        'source', 'source_type', 'source_name', 'url', 'published_at',
                        // Twitter/X author metadata (from TwitterHandler)
                        'author_name', 'author_username', 'author_profile_image',
                        'author_followers', 'author_verified',
                        'likes', 'retweets', 'replies', 'impressions', 'engagement',
                    ];
                    for (const field of fieldsToPreserve) {
                        if (item[field]) preservedFields[field] = item[field];
                    }

                    const mergedItem = {
                        ...item,
                        ...analysisData,
                        ...preservedFields, // Re-apply original source fields AFTER AI data
                        analyzed_at: new Date().toISOString()
                    };

                    analyzedItems.push(mergedItem);
                }
            } catch (e: any) {
                await context.logger(`[AnalysisHandler] ❌ Error on item ${i + 1} after ${RETRY_ATTEMPTS} attempts: ${e.message}. Using fallback risk_score=51.`);
                analyzedItems.push({
                    ...item,
                    error: e.message,
                    summary: `Erro na análise (após ${RETRY_ATTEMPTS} tentativas): ${e.message}`,
                    risk_score: 51,
                    sentiment: 'neutral',
                    keywords: [],
                    entities: [],
                    detected_entities: []
                });
            }
        }

        await context.logger(`[AnalysisHandler] ✅ Completed. ${analyzedItems.length} items analyzed.`);

        // Build dynamic _variables from first analyzed item's keys
        const baseVars: Record<string, any> = {
            summary: { label: 'Resumo IA', type: 'text' },
            items: { label: 'Itens Analisados', type: 'list' },
            count: { label: 'Quantidade', type: 'text' },
        };

        // Expose all AI response fields as variables
        if (analyzedItems.length > 0) {
            const firstItem = analyzedItems[0];
            const labelMap: Record<string, string> = {
                title: 'Título', risk_score: 'Score de Risco', sentiment: 'Sentimento',
                source_name: 'Veículo', content_type_detected: 'Tipo de Conteúdo',
                keywords: 'Palavras-chave', entities: 'Entidades', people_found: 'Pessoas Encontradas',
                keyword_matches: 'Keywords Detectadas', relevance_explanation: 'Relevância',
                context_analysis: 'Análise Contextual', detected_entities: 'Entidades Detectadas',
            };
            for (const key of Object.keys(firstItem)) {
                if (key.startsWith('_') || baseVars[key]) continue;
                const val = firstItem[key];
                baseVars[key] = {
                    label: labelMap[key] || key,
                    type: Array.isArray(val) ? 'list' : typeof val === 'number' ? 'number' : 'text',
                };
            }
        }

        // Flatten first item fields to top level for easy variable access
        const topLevelData: Record<string, any> = {
            items: analyzedItems,
            count: analyzedItems.length,
            summary: analyzedItems.length > 0 ? analyzedItems[0].summary || '' : '',
        };
        if (analyzedItems.length > 0) {
            const first = analyzedItems[0];
            for (const key of Object.keys(first)) {
                if (key.startsWith('_') || topLevelData[key] !== undefined) continue;
                topLevelData[key] = first[key];
            }
        }
        topLevelData._variables = baseVars;

        return {
            success: true,
            data: topLevelData,
        };
    }
}
