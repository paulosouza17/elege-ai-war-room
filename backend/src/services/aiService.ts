import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIAnalysisResult {
    theme: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    narrative: string;
    risk_score: number;
    reasoning: string;
}

export interface AIServiceConfig {
    provider: 'openai' | 'gemini' | 'manus' | 'perplexity';
    apiKey: string;
    model?: string;
}

export class AIService {
    private supabase: SupabaseClient;
    private config: AIServiceConfig | null = null;
    private genAI: GoogleGenerativeAI | null = null;
    private neutralityPolicy: { enabled: boolean; config: any } | null = null;

    // Retry helper for rate-limited API calls (503/429)
    private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 2000): Promise<T> {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                const msg = error?.message || '';
                const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('high demand');
                if (!isRetryable || attempt === maxRetries) throw error;
                const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
                console.warn(`[AIService] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms (${msg.substring(0, 80)})`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        throw new Error('Retry exhausted'); // unreachable
    }

    constructor(supabaseClient: SupabaseClient, explicitConfig?: AIServiceConfig) {
        this.supabase = supabaseClient;
        if (explicitConfig) {
            this.config = explicitConfig;
        }
    }

    private async loadConfig(providerPreference: 'openai' | 'gemini' | 'manus' | 'perplexity' | 'auto' = 'auto'): Promise<void> {
        // Fetch active config from DB
        let query = this.supabase
            .from('ai_configs')
            .select('*')
            .eq('is_active', true);

        if (providerPreference !== 'auto') {
            query = query.eq('provider', providerPreference);
        }

        const { data, error } = await query.limit(1).single();

        if (error || !data) {
            // If specific provider requested but not found, warn or mock?
            // For now, we strict fail only if auto.
            // Actually, let's allow a temporary bypass if it's a new provider to avoid blocking app if DB isn't seeded yet.
            if (providerPreference === 'manus' || providerPreference === 'perplexity') {
                console.warn(`⚠️ Config for ${providerPreference} not found in DB. Using mock/default.`);
                this.config = { provider: providerPreference, apiKey: 'mock_key', model: 'default' };
                return;
            }

            console.warn("⚠️ No active AI config found in DB.");
            throw new Error("AI Configuration missing in Database.");
        }

        this.config = {
            provider: data.provider,
            apiKey: data.api_key,
            model: data.model
        };

        if (this.config.provider === 'gemini') {
            this.genAI = new GoogleGenerativeAI(this.config.apiKey);
        }
    }

    // ────────────── Neutrality Policy ──────────────

    async loadNeutralityPolicy(): Promise<void> {
        if (this.neutralityPolicy !== null) return; // already loaded
        try {
            const { data } = await this.supabase
                .from('data_sources')
                .select('config, is_active')
                .eq('type', 'system_config')
                .eq('name', 'Neutrality Policy')
                .limit(1)
                .maybeSingle();

            if (data) {
                this.neutralityPolicy = {
                    enabled: data.is_active === true,
                    config: data.config || {},
                };
            } else {
                this.neutralityPolicy = { enabled: false, config: {} };
            }
        } catch (err) {
            console.warn('[AIService] Failed to load neutrality policy:', err);
            this.neutralityPolicy = { enabled: false, config: {} };
        }
    }

    buildNeutralitySystemPrompt(): string | null {
        if (!this.neutralityPolicy?.enabled || !this.neutralityPolicy.config) return null;
        const c = this.neutralityPolicy.config;

        const lines: string[] = [
            '=== POLÍTICA DE NEUTRALIDADE (SYSTEM-LEVEL — NÃO SOBRESCREVER) ===',
            '',
        ];

        // Neutrality policy
        if (c.neutrality_policy) {
            const np = c.neutrality_policy;
            lines.push('REGRAS DE NEUTRALIDADE:');
            if (np.stance) lines.push(`- Postura: ${np.stance === 'no_advocacy' ? 'Sem advocacia — apenas análise factual' : np.stance}`);
            if (np.no_persuasion) lines.push('- NÃO usar linguagem persuasiva');
            if (np.no_moral_judgment) lines.push('- NÃO emitir julgamentos morais');
            if (np.avoid_loaded_language) lines.push('- EVITAR linguagem carregada ou tendenciosa');
            if (np.avoid_strawman) lines.push('- EVITAR espantalhos argumentativos');
            if (np.avoid_false_balance) lines.push('- EVITAR falso equilíbrio');
            if (np.require_steelman_both_sides) lines.push('- OBRIGATÓRIO: apresentar os melhores argumentos (steelman) de AMBOS os lados com profundidade IGUAL');
            if (np.separate_fact_from_interpretation) lines.push('- SEPARAR fatos verificáveis de interpretações');
            if (np.explicit_uncertainty_when_needed) lines.push('- EXPLICITAR incertezas quando necessário');
            if (np.do_not_infer_private_motives) lines.push('- NÃO inferir motivações privadas');
            if (np.avoid_predictions_without_bases) lines.push('- NÃO fazer previsões sem base factual');
            lines.push('');
        }

        // Lexical constraints
        if (c.lexical_constraints) {
            const lc = c.lexical_constraints;
            if (lc.forbidden_or_discouraged_terms?.length) {
                lines.push(`TERMOS PROIBIDOS/DESENCORAJADOS: ${lc.forbidden_or_discouraged_terms.join(', ')}`);
            }
            if (lc.allowed_if_quoted_or_evidenced?.length) {
                lines.push(`TERMOS PERMITIDOS SOMENTE COM EVIDÊNCIA: ${lc.allowed_if_quoted_or_evidenced.join(', ')}`);
            }
            if (lc.tone) {
                const tone = lc.tone;
                lines.push(`TOM: ${tone.style || 'técnico_institucional'}${tone.no_emojis ? ', sem emojis' : ''}${tone.no_sarcasm ? ', sem sarcasmo' : ''}${tone.no_rhetorical_questions ? ', sem perguntas retóricas' : ''}`);
            }
            lines.push('');
        }

        // Self-audit
        if (c.self_audit) {
            lines.push('AUTO-AUDITORIA OBRIGATÓRIA:');
            if (c.self_audit.bias_checks?.length) {
                lines.push(`Verificações: ${c.self_audit.bias_checks.join(', ')}`);
            }
            if (c.self_audit.symmetry_check) {
                lines.push(`Tolerância de simetria pró/contra: ${(c.self_audit.symmetry_check.require_equal_word_count_pro_con_tolerance * 100)}%`);
            }
            if (c.self_audit.final_gate) {
                lines.push(`Se flags > ${c.self_audit.final_gate.if_flags_over_threshold?.threshold}: ${c.self_audit.final_gate.if_flags_over_threshold?.action}`);
            }
            lines.push('');
        }

        // Input handling
        if (c.input) {
            if (c.input.language) lines.push(`Idioma: ${c.input.language}`);
            if (c.input.context_handling?.max_chars_per_source) {
                lines.push(`Máximo ${c.input.context_handling.max_chars_per_source} caracteres por fonte`);
            }
        }

        lines.push('=== FIM DA POLÍTICA DE NEUTRALIDADE ===');
        return lines.join('\n');
    }

    getNeutralityGenerationParams(): Record<string, any> | null {
        if (!this.neutralityPolicy?.enabled) return null;
        const gen = this.neutralityPolicy.config?.generation;
        if (!gen) return null;
        return {
            temperature: gen.temperature,
            topP: gen.top_p,
            maxOutputTokens: gen.max_output_tokens,
            seed: gen.seed,
        };
    }

    // Helper to get provider config, ensuring it's loaded
    private async getProvider(preferredProvider?: 'openai' | 'gemini' | 'manus' | 'perplexity'): Promise<AIServiceConfig> {
        if (!this.config || (preferredProvider && this.config.provider !== preferredProvider)) {
            await this.loadConfig(preferredProvider || 'auto');
        }
        if (!this.config) {
            throw new Error("AI Service configuration not loaded.");
        }
        // Also load neutrality policy alongside config
        await this.loadNeutralityPolicy();
        return this.config;
    }

    async generateRaw(prompt: string, modelOverride?: string, maxOutputTokens?: number): Promise<string> {
        const provider = await this.getProvider('gemini');
        const neutralityPrompt = this.buildNeutralitySystemPrompt();
        const genParams = this.getNeutralityGenerationParams();
        const outputTokens = maxOutputTokens || genParams?.maxOutputTokens || 2048;

        if (provider.provider === 'gemini') {
            if (!this.genAI) {
                this.genAI = new GoogleGenerativeAI(provider.apiKey);
            }
            const modelConfig: any = { model: modelOverride || provider.model || "gemini-1.5-flash" };
            if (neutralityPrompt) modelConfig.systemInstruction = neutralityPrompt;
            modelConfig.generationConfig = {
                maxOutputTokens: outputTokens,
                ...(genParams ? { temperature: genParams.temperature, topP: genParams.topP } : {}),
            };
            const model = this.genAI.getGenerativeModel(modelConfig);
            const result = await this.retryWithBackoff(() => model.generateContent(prompt));
            return result.response.text();
        } else if (provider.provider === 'openai') {
            const openai = new OpenAI({ apiKey: provider.apiKey });
            const messages: any[] = [];
            if (neutralityPrompt) messages.push({ role: 'system', content: neutralityPrompt });
            messages.push({ role: 'user', content: prompt });
            const response = await openai.chat.completions.create({
                model: modelOverride || provider.model || 'gpt-4-turbo',
                messages,
                max_tokens: outputTokens,
                ...(genParams ? { temperature: genParams.temperature, top_p: genParams.topP, seed: genParams.seed } : {}),
            });
            return response.choices[0].message.content || '';
        }

        throw new Error(`Provider "${provider.provider}" not supported for raw generation.`);
    }

    async generateWithFile(prompt: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
        try {
            console.log(`[AIService] Sending file (${mimeType}, ${fileBuffer.length} bytes) to Gemini...`);
            const provider = await this.getProvider('gemini'); // Force Gemini for multimodal

            if (provider.provider !== 'gemini') {
                throw new Error("File generation is currently only supported for Gemini provider.");
            }

            if (!this.genAI) { // Ensure genAI is initialized
                this.genAI = new GoogleGenerativeAI(provider.apiKey);
            }

            // Convert Buffer to Base64
            const base64Data = fileBuffer.toString('base64');

            const model = this.genAI.getGenerativeModel({ model: provider.model || "gemini-1.5-flash" }); // 1.5 Flash is good for docs

            const result = await this.retryWithBackoff(() => model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                }
            ]));

            return result.response.text();
        } catch (error: any) {
            console.error("AI Generate With File Error:", error);
            throw new Error(`Gemini Multimodal Error: ${error.message}`);
        }
    }

    async validateCrisis(params: {
        indicators: string[];
        mentions_24h: number;
        mentions_previous: number;
        avg_risk: number;
        sentiment: { positive: number; negative: number; neutral: number };
        top_articles: { title: string; summary?: string; source: string; risk_score: number; sentiment: string }[];
        keywords: string[];
    }): Promise<{ is_crisis: boolean; confidence: number; reasoning: string; adjusted_risk: number }> {
        if (!this.config) await this.loadConfig();

        const articlesSummary = (params.top_articles || []).slice(0, 5).map((a, i) =>
            `${i + 1}. [${a.sentiment}|risk:${a.risk_score}] "${a.title || 'Sem título'}" (${a.source || '?'})`
        ).join('\n');

        const prompt = `Você é um analista sênior de inteligência política. Avalie se os dados abaixo representam uma CRISE REAL ou um FALSO POSITIVO.

DADOS AGREGADOS (últimas 24h):
- Menções hoje: ${params.mentions_24h} | Menções ontem: ${params.mentions_previous}
- Risk Score médio: ${params.avg_risk}/100
- Sentimento: +${params.sentiment.positive} positivas, ${params.sentiment.negative} negativas, ${params.sentiment.neutral} neutras
- Keywords monitoradas: ${params.keywords.join(', ')}
- Indicadores que dispararam: ${params.indicators.join('; ')}

TOP ARTIGOS MAIS CRÍTICOS:
${articlesSummary || 'Nenhum artigo disponível'}

CRITÉRIOS DE AVALIAÇÃO (USE ESTES para decidir):
- CRISE REAL: Múltiplas fontes independentes reportando o mesmo evento negativo com alto impacto potencial (escândalo, denúncia grave, viralização massiva, risco jurídico/político concreto)
- FALSO POSITIVO: Poucas menções, fontes repetidas, tom negativo genérico sem evento concreto, risk scores inflados sem justificativa, assuntos rotineiros da política
- VOLUME MÍNIMO: Menos de 10 menções raramente configura crise real, mesmo com sentimento negativo
- CONTEXTO: Considere se os artigos descrevem um EVENTO ESPECÍFICO novo ou são monitoramento rotineiro

Responda em JSON:
{
    "is_crisis": true/false,
    "confidence": 0-100 (sua confiança na avaliação),
    "reasoning": "Explicação em PT-BR de 1-2 frases justificando a decisão",
    "adjusted_risk": 0-100 (risk score recalibrado com base no contexto real)
}`;

        try {
            const raw = await this.generateRaw(prompt);
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(clean);
            return {
                is_crisis: !!result.is_crisis,
                confidence: Math.min(100, Math.max(0, Number(result.confidence) || 0)),
                reasoning: result.reasoning || 'Sem justificativa',
                adjusted_risk: Math.min(100, Math.max(0, Number(result.adjusted_risk) || 0)),
            };
        } catch (err: any) {
            console.error('[AIService] validateCrisis failed:', err.message);
            // On failure, fall back to static rules (don't block dashboard)
            return { is_crisis: true, confidence: 30, reasoning: 'Falha na validação por IA — usando regras estáticas', adjusted_risk: params.avg_risk };
        }
    }

    async analyzeText(text: string, context?: string, modelOverride?: string): Promise<AIAnalysisResult> {
        if (!this.config) await this.loadConfig(); // Default auto loading

        const prompt = `
        Analyze the following text for a War Room monitoring system.
        Context: ${context || 'General politics and media monitoring'}
        Text: "${text}"
        
        LANGUAGE: Portuguese (Brazil) - The response JSON values (narrative, reasoning, theme) MUST be in Portuguese.

        RISK SCORE CALIBRATION (follow strictly):
        0-20: Routine news, no political impact
        21-40: Minor mention, low relevance
        41-60: Moderate relevance, notable but not alarming
        61-80: Significant event, potential political impact, requires monitoring
        81-100: Critical crisis — scandal, serious accusation, viral negative event with concrete evidence

        Return a JSON object with:
        - theme: main topic (max 3 words)
        - sentiment: positive, negative, or neutral
        - narrative: brief explanation of the narrative (max 1 sentence)
        - risk_score: 0 to 100 (use calibration above — DO NOT inflate)
        - reasoning: why this risk score was given
        `;

        try {
            if (this.config?.provider === 'openai') {
                return await this.analyzeOpenAI(prompt, modelOverride);
            } else if (this.config?.provider === 'gemini') {
                return await this.analyzeGemini(prompt, modelOverride);
            } else if (this.config?.provider === 'manus') {
                return await this.analyzeManus(prompt);
            } else if (this.config?.provider === 'perplexity') {
                return await this.analyzePerplexity(prompt);
            }
            throw new Error('Invalid AI Provider');
        } catch (error: any) {
            console.error('AI Analysis Failed:', error.message);
            // Fallback default
            return {
                theme: 'Desconhecido',
                sentiment: 'neutral',
                narrative: 'Falha na análise: ' + (error.message || 'Erro desconhecido'),
                risk_score: 0,
                reasoning: `Erro no processamento de IA: ${error.message}`
            };
        }
    }

    private async analyzeOpenAI(prompt: string, modelOverride?: string): Promise<AIAnalysisResult> {
        const openai = new OpenAI({ apiKey: this.config!.apiKey });
        const neutralityPrompt = this.buildNeutralitySystemPrompt();
        const genParams = this.getNeutralityGenerationParams();
        const messages: any[] = [];
        if (neutralityPrompt) messages.push({ role: 'system', content: neutralityPrompt });
        messages.push({ role: 'user', content: prompt });
        const response = await openai.chat.completions.create({
            model: modelOverride || this.config!.model || 'gpt-4-turbo',
            messages,
            response_format: { type: 'json_object' },
            ...(genParams ? { temperature: genParams.temperature, top_p: genParams.topP, max_tokens: genParams.maxOutputTokens, seed: genParams.seed } : {}),
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content || '{}') as AIAnalysisResult;
    }

    private async analyzeGemini(prompt: string, modelOverride?: string): Promise<AIAnalysisResult> {
        const genAI = new GoogleGenerativeAI(this.config!.apiKey);
        const neutralityPrompt = this.buildNeutralitySystemPrompt();
        const genParams = this.getNeutralityGenerationParams();
        const modelConfig: any = {
            model: modelOverride || this.config!.model || 'gemini-1.5-flash',
            generationConfig: {
                responseMimeType: "application/json",
                ...(genParams ? { temperature: genParams.temperature, topP: genParams.topP, maxOutputTokens: genParams.maxOutputTokens } : {}),
            },
        };
        if (neutralityPrompt) modelConfig.systemInstruction = neutralityPrompt;
        const model = genAI.getGenerativeModel(modelConfig);

        const result = await this.retryWithBackoff(() => model.generateContent(prompt));
        const response = await result.response;
        const text = response.text();

        try {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText) as AIAnalysisResult;
        } catch (e) {
            console.error("Gemini JSON Parse Error. Raw text:", text);
            throw new Error('Failed to parse Gemini JSON');
        }
    }

    async generateCrisisPlan(
        crisis: { title: string; description: string; severity: string; contentSummary?: string },
        refinementContext?: string,
        mentionsContext?: string[],
        evidencesContext?: string[],
        entitiesContext?: string
    ): Promise<any> {
        // Ensure config is loaded. Prioritize database config.
        if (!this.config) {
            try {
                await this.loadConfig();
            } catch (e) {
                return {
                    strategy_name: "Erro de Configuração",
                    objective: "Nenhuma configuração de IA ativa encontrada no banco de dados.",
                    phases: [],
                    risks: []
                };
            }
        }

        // OPT3: Compact system prompt — minimal instructions, no redundancy
        let prompt = `Consultor Sênior de Gestão de Crises. Crie um Plano de Resposta em PT-BR.
REGRAS: Descreva EVENTOS REAIS (nunca cite nomes de arquivos). Use todo o contexto abaixo.

INCIDENTE: "${crisis.title}" | ${crisis.severity} | ${crisis.description}`;

        if (crisis.contentSummary) {
            prompt += `\nRESUMO: "${crisis.contentSummary}"`;
        }

        // Inject consolidated entities (deduplicated)
        if (entitiesContext) {
            prompt += `\nENTIDADES CITADAS: ${entitiesContext}`;
        }

        // Inject compact mentions
        if (mentionsContext && mentionsContext.length > 0) {
            prompt += `\nMENÇÕES (${mentionsContext.length}):\n${mentionsContext.join('\n')}`;
        }

        // Inject evidences
        if (evidencesContext && evidencesContext.length > 0) {
            prompt += `\nANEXOS (${evidencesContext.length}):\n${evidencesContext.join('\n')}`;
        }

        if (refinementContext) {
            prompt += `\nOBSERVAÇÕES DO USUÁRIO: "${refinementContext}"\nRefine a estratégia conforme as observações acima.`;
        }

        prompt += `

JSON (sem markdown):
{
    "strategy_name": "Nome da Estratégia",
    "objective": "Objetivo em uma frase.",
    "phases": [
        {"name": "Fase 1: Imediata (0-2h)", "actions": ["Ação 1", "Ação 2"]},
        {"name": "Fase 2: Curto Prazo (2-24h)", "actions": ["Ação 1", "Ação 2"]}
    ],
    "risks": [
        {"type": "Político", "level": "Alto/Médio/Baixo", "description": "..."},
        {"type": "Viral", "level": "Alto/Médio/Baixo", "description": "..."}
    ]
}`;

        try {
            if (this.config!.provider === 'openai') {
                return await this.analyzeOpenAI(prompt);
            } else if (this.config!.provider === 'gemini') {
                return await this.analyzeGemini(prompt);
            }
            // For now, Manus and Perplexity are mainly for research, not strategy gen.
            // But if selected as main provider, we can fallback or mock.
            if (this.config!.provider === 'manus' || this.config!.provider === 'perplexity') {
                // Use mock or simple response
                return {
                    strategy_name: `Estratégia via ${this.config!.provider === 'manus' ? 'Manus' : 'Perplexity'}`,
                    objective: "Estratégia preliminar baseada em pesquisa.",
                    phases: [
                        { name: "Fase 1: Pesquisa", actions: ["Coletar dados", "Monitorar redes"] }
                    ],
                    risks: []
                };
            }
            throw new Error('Provedor de IA inválido para geração de estratégia');
        } catch (error: any) {
            console.error('Crisis Plan Generation Failed:', error.message);
            return {
                strategy_name: "Falha na Geração",
                objective: `Erro de IA: ${error.message}`,
                phases: [],
                risks: []
            };
        }
    }

    // --- MANUS Specific Methods ---

    private async analyzeManus(prompt: string): Promise<AIAnalysisResult> {
        console.log("Using Manus AI for analysis...");
        // Simulator for Manus AI - Research Mode
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
            theme: 'Análise Manus (Research)',
            sentiment: 'neutral',
            narrative: 'Análise baseada em pesquisa profunda de documentos e links.',
            risk_score: 50,
            reasoning: 'Processado pelo motor de pesquisa Manus (Simulado).'
        };
    }

    async researchManus(query: string, options: { docs: boolean, links: boolean }): Promise<any> {
        if (!this.config || this.config.provider !== 'manus') {
            await this.loadConfig('manus');
        }

        console.log(`Manus Research: [${query}] Options:`, options);
        // Mock response structure for Research Source
        return {
            summary: `Resultados de pesquisa MANUS para: "${query}"`,
            documents: options.docs ? [
                { title: 'Dossiê Manus.pdf', url: 'https://manus.ai/doc1' },
                { title: 'Relatório Técnico.docx', url: 'https://manus.ai/doc2' }
            ] : [],
            links: options.links ? [
                { title: 'Fonte Confirmada 1', url: 'https://news.com/1' },
                { title: 'Fonte Oficial', url: 'https://gov.br/noticia' }
            ] : []
        };
    }

    // --- PERPLEXITY Specific Methods ---

    private async analyzePerplexity(prompt: string): Promise<AIAnalysisResult> {
        console.log("Using Perplexity AI for analysis...");
        // Simulator for Perplexity
        await new Promise(resolve => setTimeout(resolve, 1200));

        return {
            theme: 'Análise Perplexity (Real-time)',
            sentiment: 'neutral',
            narrative: 'Baseado nas últimas notícias encontradas na web.',
            risk_score: 40,
            reasoning: 'Citações de múltiplas fontes indicam risco moderado.'
        };
    }

    async researchPerplexity(query: string, options?: { focus?: string }): Promise<any> {
        if (!this.config || this.config.provider !== 'perplexity') {
            await this.loadConfig('perplexity');
        }

        console.log(`Perplexity Research: [${query}] Focus: ${options?.focus || 'all'}`);
        // Mock response
        return {
            summary: `Resumo Perplexity para: "${query}" (Foco: ${options?.focus || 'Notícias'}) - As últimas notícias indicam...`,
            citations: [
                'https://cnn.com/article1',
                'https://bbc.com/news/world',
                'https://g1.globo.com/politica'
            ]
        };
    }

    async extractKeywords(text: string): Promise<string[]> {
        if (!text || text.length < 10) return [];
        if (!this.config) await this.loadConfig();

        const prompt = `
        TASk: Extract main topics/keywords from the text.
        TEXT: "${text.substring(0, 1000)}"
        LANGUAGE: Portuguese (Brazil)
        OUTPUT: JSON string array only, max 5 keywords. Example: ["Eleições", "Economia", "Crise Hídrica"]
        `;

        try {
            let jsonString = '';

            if (this.config?.provider === 'openai') {
                const openai = new OpenAI({ apiKey: this.config!.apiKey });
                const response = await openai.chat.completions.create({
                    model: this.config.model || 'gpt-4-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                });
                const content = response.choices[0].message.content || '{}';
                const parsed = JSON.parse(content);
                return parsed.keywords || parsed.topics || [];
            }
            else if (this.config?.provider === 'gemini') {
                const genAI = new GoogleGenerativeAI(this.config!.apiKey);
                const model = genAI.getGenerativeModel({
                    model: 'gemini-1.5-flash',
                    generationConfig: { responseMimeType: "application/json" }
                });
                const result = await this.retryWithBackoff(() => model.generateContent(prompt));
                jsonString = result.response.text();
            }
            else {
                // Mock for other providers/no config
                console.log('[AIService] Mocking keyword extraction');
                return ['Simulação', 'Teste', 'Automático'];
            }

            // Parse response
            const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);
            return Array.isArray(data) ? data : (data.keywords || data.topics || []);

        } catch (error) {
            console.error('Failed to extract keywords:', error);
            return [];
        }
    }
}
