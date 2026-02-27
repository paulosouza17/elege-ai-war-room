import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';
import axios from 'axios';

const PERPLEXITY_API_BASE = 'https://api.perplexity.ai';

interface PerplexityConfig {
    apiKey: string;
    model?: string;
}

export class PerplexityHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger('[PerplexityHandler] Starting Perplexity search...');

        const config = await this.loadCredentials(context);
        if (!config) {
            return { success: false, error: 'Credenciais do Perplexity não configuradas. Vá em Configurações → Integrações → Perplexity AI.' };
        }

        const query = this.resolveQuery(node, context);
        if (!query) {
            return { success: false, error: 'Query de pesquisa não informada.' };
        }

        const model = node.data.perplexityModel || config.model || 'sonar';
        const searchDomain = node.data.perplexitySearchDomain || '';

        await context.logger(`[PerplexityHandler] Query: "${query.substring(0, 100)}...", Model: ${model}`);

        try {
            const systemPrompt = this.buildSystemPrompt(searchDomain);

            const response = await axios.post(
                `${PERPLEXITY_API_BASE}/chat/completions`,
                {
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: query }
                    ],
                    max_tokens: 4096,
                    return_citations: true,
                    return_related_questions: true,
                    search_domain_filter: searchDomain ? [searchDomain] : undefined,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 120000, // deep-research can take up to 2 min
                    validateStatus: () => true,
                }
            );

            if (response.status === 401) throw new Error('API Key inválida. Verifique em perplexity.ai/settings/api.');
            if (response.status === 429) throw new Error('Rate limit excedido. Aguarde antes de nova requisição.');
            if (response.status >= 400) throw new Error(`API retornou ${response.status}: ${JSON.stringify(response.data)}`);

            const data = response.data;
            const choice = data.choices?.[0];
            const answer = choice?.message?.content || '';
            const citations = data.citations || [];
            const relatedQuestions = data.related_questions || [];

            const result = {
                answer,
                sources: citations.map((c: any, i: number) => ({
                    index: i + 1,
                    url: typeof c === 'string' ? c : c.url || '',
                    title: typeof c === 'string' ? '' : c.title || '',
                })),
                citations,
                related_questions: relatedQuestions,
                model,
                query,
                tokens_used: data.usage?.total_tokens || 0,
                summary: `Perplexity (${model}): ${answer.substring(0, 150)}...`,
            };

            await context.logger(`[PerplexityHandler] ✅ Response received. ${citations.length} sources cited. ${result.tokens_used} tokens.`);

            return {
                success: true,
                data: {
                    ...result,
                    operation: 'perplexity_search',
                    source: 'perplexity',
                    source_type: 'ai_search',
                    _variables: {
                        answer: { label: 'Resposta', type: 'text' },
                        sources: { label: 'Fontes', type: 'list' },
                        citations: { label: 'Citações', type: 'list' },
                        summary: { label: 'Resumo', type: 'text' },
                        model: { label: 'Modelo', type: 'text' },
                        related_questions: { label: 'Perguntas Relacionadas', type: 'list' },
                        tokens_used: { label: 'Tokens Usados', type: 'text' },
                        query: { label: 'Query', type: 'text' },
                    }
                }
            };
        } catch (error: any) {
            await context.logger(`[PerplexityHandler] ❌ Error: ${error.message}`);
            return { success: false, error: `Perplexity API Error: ${error.message}` };
        }
    }

    private async loadCredentials(context: ExecutionContext): Promise<PerplexityConfig | null> {
        const { data, error } = await supabase
            .from('data_sources')
            .select('config, is_active')
            .ilike('name', '%Perplexity%')
            .single();

        if (error || !data || !data.is_active) {
            await context.logger('[PerplexityHandler] ⚠ Data source "Perplexity AI" not found or inactive.');
            return null;
        }

        const cfg = data.config;
        if (!cfg?.apiKey) {
            await context.logger('[PerplexityHandler] ⚠ API Key not configured.');
            return null;
        }

        return cfg as PerplexityConfig;
    }

    private resolveQuery(node: any, context: ExecutionContext): string {
        if (node.data.perplexityQuery) {
            // Interpolate upstream variables in the query
            let q = node.data.perplexityQuery;
            for (const [nodeId, output] of Object.entries(context.nodeOutputs)) {
                if (output?.data) {
                    for (const [key, value] of Object.entries(output.data as Record<string, any>)) {
                        const placeholder = `{${nodeId}.${key}}`;
                        if (q.includes(placeholder)) {
                            q = q.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
                        }
                    }
                }
            }
            return q;
        }

        // Auto-build query from upstream activation data
        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (output?.data?.people_of_interest) {
                const people = output.data.people_of_interest;
                return `O que saiu nas últimas 24 horas sobre ${Array.isArray(people) ? people.join(', ') : people}? Inclua menções na mídia, redes sociais e eventos relevantes.`;
            }
            if (output?.data?.keywords) {
                const kws = output.data.keywords;
                return `Pesquise informações recentes sobre: ${Array.isArray(kws) ? kws.join(', ') : kws}`;
            }
        }

        return '';
    }

    private buildSystemPrompt(searchDomain: string): string {
        let base = 'Você é um analista de inteligência política. Responda de forma objetiva, estruturada e com foco em fatos verificáveis. Sempre cite as fontes.';

        if (searchDomain === 'news') {
            base += ' Foque exclusivamente em fontes jornalísticas e portais de notícias.';
        } else if (searchDomain === 'academic') {
            base += ' Foque em fontes acadêmicas, papers e publicações científicas.';
        }

        return base;
    }
}
