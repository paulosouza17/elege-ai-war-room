import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AIService } from '../services/aiService';

const router = Router();

const AI_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms / 1000}s`)), ms);
        promise.then(
            (val) => { clearTimeout(timer); resolve(val); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}

/**
 * POST /api/v1/ingest/analyze
 * 
 * Standalone AI analysis for manual uploads.
 * Analyzes file content via AI, extracts keywords/entities/sentiment/risk_score,
 * and only inserts into intelligence_feed if at least one criterion is found.
 * 
 * Independent of flows — works with or without an activation.
 */
router.post('/analyze', async (req: Request, res: Response) => {
    try {
        const {
            file_url,
            file_type,
            original_name,
            title,
            source_name,
            source_url,
            activation_id,
            analysis_instructions,
            user_id,
        } = req.body;

        if (!file_url) {
            return res.status(400).json({ error: 'file_url is required' });
        }
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        console.log(`[ManualAnalysis] Starting analysis for: ${original_name || file_url}`);

        // 1. Load monitored entities for this user (watchlist)
        let watchlistPrompt = '';
        try {
            const { data: entities } = await supabase
                .from('monitored_entities')
                .select('*')
                .eq('user_id', user_id);

            if (entities && entities.length > 0) {
                watchlistPrompt = `
ALVOS MONITORADOS (Entidades de Interesse):
Abaixo está a lista de pessoas/organizações que estamos monitorando.
Sua tarefa é identificar se alguma dessas entidades é mencionada no conteúdo.

CRITÉRIOS DE IDENTIFICAÇÃO:
1. Ocorrência exata ou aproximada do "Nome" principal.
2. Ocorrência de QUALQUER um dos "Apelidos" listados.
3. Identificação contextual clara baseada na "Descrição".

Lista de Alvos:
${entities.map(e => `- ID: ${e.id} | Nome: "${e.name}" | Apelidos: [${e.aliases?.join(', ')}] | Desc: "${e.description}"`).join('\n')}

INSTRUÇÃO OBRIGATÓRIA:
Se detectar qualquer um desses alvos (por nome ou apelido), você DEVE adicionar o ID correspondente ao array 'detected_entities' no JSON.
Exemplo: "detected_entities": ["${entities[0].id}"]
`;
                console.log(`[ManualAnalysis] Loaded ${entities.length} watchlist entities.`);
            }
        } catch (err) {
            console.warn(`[ManualAnalysis] Failed to load watchlist:`, err);
        }

        // 2. Load activation context if linked
        let activationPrompt = '';
        if (activation_id) {
            try {
                const { data: activation } = await supabase
                    .from('activations')
                    .select('name, briefing, keywords, people_of_interest, category')
                    .eq('id', activation_id)
                    .maybeSingle();

                if (activation) {
                    const parts: string[] = [];
                    if (activation.keywords?.length) parts.push(`PALAVRAS-CHAVE MONITORADAS: ${activation.keywords.join(', ')}`);
                    if (activation.people_of_interest?.length) parts.push(`PESSOAS DE INTERESSE: ${activation.people_of_interest.join(', ')}`);
                    if (activation.briefing) parts.push(`BRIEFING: ${activation.briefing}`);
                    if (activation.category) parts.push(`CATEGORIA: ${activation.category}`);
                    if (activation.name) parts.push(`ATIVAÇÃO: ${activation.name}`);
                    if (parts.length > 0) {
                        activationPrompt = `\nCONTEXTO DA ATIVAÇÃO:\n${parts.join('\n')}\n`;
                    }
                }
            } catch (err) {
                console.warn(`[ManualAnalysis] Failed to load activation context:`, err);
            }
        }

        // 3. Build analysis prompt
        const prompt = `Analise o conteúdo a seguir e retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem \`\`\`).
${analysis_instructions ? `\nINSTRUÇÕES DO OPERADOR:\n${analysis_instructions}\n` : ''}
${activationPrompt}
${watchlistPrompt}

O JSON deve conter:
{
  "title": "Título da matéria/documento",
  "summary": "Resumo objetivo em 2-3 frases",
  "source_name": "Nome do veículo/fonte (se identificável)",
  "content_type_detected": "noticia | opiniao | documento | relatorio | comunicado | outro",
  "risk_score": 0-100,
  "sentiment": "positive" | "negative" | "neutral",
  "keywords": ["palavra1", "palavra2", ...],
  "entities": ["Pessoa ou Organização 1", "Pessoa ou Organização 2", ...],
  "detected_entities": ["UUID do alvo monitorado se detectado"],
  "people_found": ["Nome completo de cada pessoa citada"],
  "relevance_explanation": "Por que este conteúdo é relevante para monitoramento"
}

REGRAS:
- keywords: mínimo 3, máximo 15 palavras-chave relevantes
- entities: todas as pessoas, empresas e organizações mencionadas
- risk_score: 0 = informativo neutro, 50 = atenção, 70+ = potencial crise
- Se não conseguir extrair informações relevantes, retorne risk_score: -1 para indicar conteúdo irrelevante

---
CONTEÚDO PARA ANÁLISE:
Título: ${title || original_name || 'Sem título'}
${source_url ? `URL: ${source_url}` : ''}
${source_name ? `Fonte: ${source_name}` : ''}
Tipo de arquivo: ${file_type || 'desconhecido'}
`;

        // 4. Call AI
        const aiService = new AIService(supabase);
        let cleanJson = '';

        const isImage = file_type && ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file_type);
        const isPdf = file_type && file_type === 'application/pdf';

        if (isImage || isPdf) {
            // Multimodal: download file and send to Gemini
            console.log(`[ManualAnalysis] Downloading file for multimodal analysis...`);
            const axios = require('axios');
            const response: any = await withTimeout(
                axios.get(file_url, { responseType: 'arraybuffer', timeout: 30000 }),
                30000,
                'File download'
            );
            const fileBuffer = Buffer.from(response.data);

            let mimeType = file_type || 'application/pdf';
            if (file_type === 'image/jpg') mimeType = 'image/jpeg';

            console.log(`[ManualAnalysis] Sending ${mimeType} (${fileBuffer.length} bytes) to Gemini...`);
            const aiResponse = await withTimeout(
                aiService.generateWithFile(prompt, fileBuffer, mimeType),
                AI_TIMEOUT_MS,
                'Gemini multimodal'
            );
            cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        } else {
            // Text-based: download and extract text, then send
            console.log(`[ManualAnalysis] Downloading file for text extraction...`);
            let textContent = '';
            try {
                const axios = require('axios');
                const response: any = await withTimeout(
                    axios.get(file_url, { responseType: 'text', timeout: 30000 }),
                    30000,
                    'File download'
                );
                textContent = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            } catch (err) {
                textContent = `Conteúdo não extraível do arquivo: ${original_name}`;
            }

            const fullPrompt = prompt + `\nTexto extraído:\n${textContent.substring(0, 12000)}`;
            console.log(`[ManualAnalysis] Sending text to AI (${fullPrompt.length} chars)...`);

            const aiResponse = await withTimeout(
                aiService.generateRaw(fullPrompt),
                AI_TIMEOUT_MS,
                'AI generateRaw'
            );
            cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        // 5. Parse AI response
        let analysisData: any;
        try {
            analysisData = JSON.parse(cleanJson);
        } catch (parseError) {
            console.warn(`[ManualAnalysis] JSON parse failed. Raw: ${cleanJson.substring(0, 300)}`);
            return res.status(422).json({
                error: 'AI retornou formato inválido. Tente novamente.',
                raw: cleanJson.substring(0, 500),
            });
        }

        // 6. QUALITY GATE — only publish if at least one criterion is found
        const hasKeywords = Array.isArray(analysisData.keywords) && analysisData.keywords.length > 0;
        const hasEntities = Array.isArray(analysisData.entities) && analysisData.entities.length > 0;
        const hasPeople = Array.isArray(analysisData.people_found) && analysisData.people_found.length > 0;
        const hasDetectedEntities = Array.isArray(analysisData.detected_entities) && analysisData.detected_entities.length > 0;
        const hasSentiment = analysisData.sentiment && analysisData.sentiment !== 'neutral';
        const hasRiskScore = typeof analysisData.risk_score === 'number' && analysisData.risk_score > 0 && analysisData.risk_score !== -1;
        const isIrrelevant = analysisData.risk_score === -1;

        if (isIrrelevant || (!hasKeywords && !hasEntities && !hasPeople && !hasDetectedEntities && !hasSentiment && !hasRiskScore)) {
            console.log(`[ManualAnalysis] ❌ Content rejected — no relevant criteria found.`);

            // Update activation_files status to 'rejected' if exists
            if (activation_id) {
                await supabase
                    .from('activation_files')
                    .update({ status: 'rejected', metadata: { reason: 'Nenhum critério relevante identificado pela IA', analysis: analysisData } })
                    .eq('activation_id', activation_id)
                    .eq('file_url', file_url);
            }

            return res.status(200).json({
                published: false,
                reason: 'Conteúdo não atende aos critérios mínimos de relevância. Nenhuma keyword, entidade, pessoa ou score de risco identificado.',
                analysis: analysisData,
            });
        }

        // 7. INSERT into intelligence_feed
        const feedEntry = {
            title: analysisData.title || title || original_name || 'Sem título',
            summary: analysisData.summary || '',
            url: source_url || null,
            source: analysisData.source_name || source_name || 'Input Manual',
            source_type: analysisData.content_type_detected || 'document',
            input_type: 'manual_upload',
            published_at: new Date().toISOString(),
            risk_score: analysisData.risk_score || 0,
            sentiment: analysisData.sentiment || 'neutral',
            keywords: analysisData.keywords || [],
            classification_metadata: {
                keywords: analysisData.keywords || [],
                entities: analysisData.entities || [],
                detected_entities: analysisData.detected_entities || [],
                people_found: analysisData.people_found || [],
                source_name: analysisData.source_name || null,
                content_type_detected: analysisData.content_type_detected || null,
                relevance_explanation: analysisData.relevance_explanation || null,
            },
            file_url,
            file_type: file_type || null,
            activation_id: activation_id || null,
            user_id,
        };

        const { data: insertedFeed, error: feedError } = await supabase
            .from('intelligence_feed')
            .insert(feedEntry)
            .select('id')
            .single();

        if (feedError) {
            console.error(`[ManualAnalysis] Feed insert error:`, feedError);
            return res.status(500).json({ error: `Erro ao publicar no feed: ${feedError.message}` });
        }

        // 8. Update activation_files status
        if (activation_id) {
            await supabase
                .from('activation_files')
                .update({
                    status: 'processed',
                    processed_at: new Date().toISOString(),
                    metadata: {
                        feed_id: insertedFeed?.id,
                        risk_score: analysisData.risk_score,
                        sentiment: analysisData.sentiment,
                        keywords: analysisData.keywords,
                    }
                })
                .eq('activation_id', activation_id)
                .eq('file_url', file_url);
        }

        console.log(`[ManualAnalysis] ✅ Published to feed. ID: ${insertedFeed?.id}`);

        return res.status(201).json({
            published: true,
            feed_id: insertedFeed?.id,
            analysis: analysisData,
        });

    } catch (error: any) {
        console.error('[ManualAnalysis] Error:', error);
        return res.status(500).json({ error: error.message || 'Erro interno na análise.' });
    }
});

export default router;
