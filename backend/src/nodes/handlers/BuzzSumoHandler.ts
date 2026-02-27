import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';
import axios from 'axios';

const BUZZSUMO_API_BASE = 'https://api.buzzsumo.com/search';

interface BuzzSumoConfig {
    apiKey: string;
}

export class BuzzSumoHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger('[BuzzSumoHandler] Starting BuzzSumo data collection...');

        const config = await this.loadCredentials(context);
        if (!config) {
            return { success: false, error: 'Credenciais do BuzzSumo não configuradas. Vá em Configurações → Integrações → BuzzSumo.' };
        }

        const operation = node.data.buzzsumoOperation || 'top_content';
        const query = this.resolveQuery(node, context);
        const numResults = Math.min(node.data.buzzsumoLimit || 20, 100);
        const days = node.data.buzzsumoDays || 30;
        const sortBy = node.data.buzzsumoSortBy || 'total_shares';

        await context.logger(`[BuzzSumoHandler] Operation: ${operation}, Query: "${query}", Days: ${days}, Limit: ${numResults}`);

        try {
            let result: NodeOutput;

            switch (operation) {
                case 'top_content':
                    result = await this.topContent(config, query, numResults, days, sortBy, context);
                    break;
                case 'trending_now':
                    result = await this.trendingNow(config, query, numResults, context);
                    break;
                case 'top_sharers':
                    result = await this.topSharers(config, query, numResults, days, context);
                    break;
                case 'influencers':
                    result = await this.influencers(config, query, numResults, context);
                    break;
                case 'content_analysis':
                    result = await this.contentAnalysis(config, query, days, context);
                    break;
                case 'backlinks':
                    result = await this.backlinks(config, query, numResults, context);
                    break;
                default:
                    result = await this.topContent(config, query, numResults, days, sortBy, context);
            }

            return result;
        } catch (error: any) {
            await context.logger(`[BuzzSumoHandler] ❌ Error: ${error.message}`);
            return { success: false, error: `BuzzSumo API Error: ${error.message}` };
        }
    }

    // ────────────── Credentials ──────────────

    private async loadCredentials(context: ExecutionContext): Promise<BuzzSumoConfig | null> {
        const { data, error } = await supabase
            .from('data_sources')
            .select('config, is_active')
            .ilike('name', '%BuzzSumo%')
            .single();

        if (error || !data || !data.is_active) {
            await context.logger('[BuzzSumoHandler] ⚠ Data source "BuzzSumo" not found or inactive.');
            return null;
        }

        const cfg = data.config;
        if (!cfg?.apiKey) {
            await context.logger('[BuzzSumoHandler] ⚠ API Key not configured.');
            return null;
        }

        await context.logger('[BuzzSumoHandler] ✅ Credentials loaded.');
        return cfg as BuzzSumoConfig;
    }

    // ────────────── Query Resolution ──────────────

    private resolveQuery(node: any, context: ExecutionContext): string {
        if (node.data.buzzsumoQuery) return node.data.buzzsumoQuery;

        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (output?.data?.keywords && Array.isArray(output.data.keywords)) {
                return output.data.keywords.join(' OR ');
            }
            if (output?.data?.people_of_interest && Array.isArray(output.data.people_of_interest)) {
                return output.data.people_of_interest.map((p: string) => `"${p}"`).join(' OR ');
            }
        }

        return '';
    }

    // ────────────── API Methods ──────────────

    private async topContent(config: BuzzSumoConfig, query: string, limit: number, days: number, sortBy: string, context: ExecutionContext): Promise<NodeOutput> {
        if (!query) return { success: false, error: 'Query de busca não informada.' };

        const endDate = Math.floor(Date.now() / 1000);
        const beginDate = endDate - (days * 86400);

        const data = await this.apiGet(config, '/articles.json', {
            q: query,
            num_results: String(limit),
            begin_date: String(beginDate),
            end_date: String(endDate),
            sort_by: sortBy,
        }, context);

        const items = (data.results || []).map((r: any) => ({
            title: r.title || '',
            url: r.url || '',
            domain: r.domain_name || '',
            published_date: r.published_date || '',
            total_shares: r.total_facebook_shares + r.twitter_shares + r.pinterest_shares + r.total_reddit_engagements || 0,
            facebook_shares: r.total_facebook_shares || 0,
            twitter_shares: r.twitter_shares || 0,
            pinterest_shares: r.pinterest_shares || 0,
            reddit_engagements: r.total_reddit_engagements || 0,
            evergreen_score: r.evergreen_score || 0,
            num_links: r.num_linking_domains || 0,
            thumbnail: r.thumbnail || '',
            author_name: r.author_name || '',
            language: r.language || '',
        }));

        const totalShares = items.reduce((sum: number, i: any) => sum + i.total_shares, 0);

        return this.buildOutput({
            items,
            count: items.length,
            total_shares: totalShares,
            query,
            days,
            summary: `${items.length} artigos sobre "${query}" | ${totalShares.toLocaleString()} compartilhamentos totais | Últimos ${days} dias`,
        }, 'top_content', context);
    }

    private async trendingNow(config: BuzzSumoConfig, query: string, limit: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!query) return { success: false, error: 'Query de busca não informada.' };

        const data = await this.apiGet(config, '/articles.json', {
            q: query,
            num_results: String(limit),
            sort_by: 'trending',
        }, context);

        const items = (data.results || []).map((r: any) => ({
            title: r.title || '',
            url: r.url || '',
            domain: r.domain_name || '',
            published_date: r.published_date || '',
            total_shares: (r.total_facebook_shares || 0) + (r.twitter_shares || 0),
            trending_score: r.trending_score || 0,
            author_name: r.author_name || '',
        }));

        return this.buildOutput({
            items,
            count: items.length,
            query,
            summary: `${items.length} artigos trending sobre "${query}"`,
        }, 'trending_now', context);
    }

    private async topSharers(config: BuzzSumoConfig, query: string, limit: number, days: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!query) return { success: false, error: 'Query de busca não informada.' };

        const endDate = Math.floor(Date.now() / 1000);
        const beginDate = endDate - (days * 86400);

        const data = await this.apiGet(config, '/sharers.json', {
            q: query,
            num_results: String(limit),
            begin_date: String(beginDate),
            end_date: String(endDate),
        }, context);

        const items = (data.results || []).map((r: any) => ({
            name: r.name || r.twitter_name || '',
            username: r.twitter_name || '',
            followers: r.followers || 0,
            total_retweets: r.total_retweets || 0,
            reply_ratio: r.reply_ratio || 0,
            retweet_ratio: r.retweet_ratio || 0,
            domain_authority: r.domain_authority || 0,
            is_influencer: (r.followers || 0) > 10000,
        }));

        return this.buildOutput({
            items,
            count: items.length,
            query,
            summary: `${items.length} principais compartilhadores sobre "${query}"`,
        }, 'top_sharers', context);
    }

    private async influencers(config: BuzzSumoConfig, query: string, limit: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!query) return { success: false, error: 'Tópico não informado.' };

        const data = await this.apiGet(config, '/influencers.json', {
            q: query,
            num_results: String(limit),
            sort_by: 'relevance',
        }, context);

        const items = (data.results || []).map((r: any) => ({
            name: r.name || '',
            username: r.twitter_name || '',
            bio: r.description || '',
            followers: r.followers || 0,
            following: r.following || 0,
            domain_authority: r.domain_authority || 0,
            avg_retweets: r.avg_retweets || 0,
            retweet_ratio: r.retweet_ratio || 0,
            influence_score: Math.round(((r.followers || 0) / 1000) * (r.retweet_ratio || 0.01) * 100) / 100,
        }));

        return this.buildOutput({
            items,
            count: items.length,
            query,
            summary: `${items.length} influenciadores sobre "${query}"`,
        }, 'influencers', context);
    }

    private async contentAnalysis(config: BuzzSumoConfig, query: string, days: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!query) return { success: false, error: 'Query não informada.' };

        const endDate = Math.floor(Date.now() / 1000);
        const beginDate = endDate - (days * 86400);

        const data = await this.apiGet(config, '/articles.json', {
            q: query,
            num_results: '50',
            begin_date: String(beginDate),
            end_date: String(endDate),
            sort_by: 'total_shares',
        }, context);

        const articles = data.results || [];
        const totalArticles = articles.length;
        const totalShares = articles.reduce((s: number, a: any) => s + (a.total_facebook_shares || 0) + (a.twitter_shares || 0), 0);
        const avgShares = totalArticles > 0 ? Math.round(totalShares / totalArticles) : 0;
        const topDomains = this.countBy(articles, 'domain_name').slice(0, 10);
        const topAuthors = this.countBy(articles, 'author_name').slice(0, 10);

        return this.buildOutput({
            total_articles: totalArticles,
            total_shares: totalShares,
            avg_shares_per_article: avgShares,
            top_domains: topDomains,
            top_authors: topAuthors,
            engagement_by_network: {
                facebook: articles.reduce((s: number, a: any) => s + (a.total_facebook_shares || 0), 0),
                twitter: articles.reduce((s: number, a: any) => s + (a.twitter_shares || 0), 0),
                pinterest: articles.reduce((s: number, a: any) => s + (a.pinterest_shares || 0), 0),
                reddit: articles.reduce((s: number, a: any) => s + (a.total_reddit_engagements || 0), 0),
            },
            query,
            days,
            summary: `Análise de "${query}": ${totalArticles} artigos | ${totalShares.toLocaleString()} shares | Média: ${avgShares} shares/artigo | ${days} dias`,
        }, 'content_analysis', context);
    }

    private async backlinks(config: BuzzSumoConfig, url: string, limit: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!url) return { success: false, error: 'URL não informada.' };

        const data = await this.apiGet(config, '/links.json', {
            q: url,
            num_results: String(limit),
        }, context);

        const items = (data.results || []).map((r: any) => ({
            source_url: r.source_url || '',
            source_domain: r.source_domain || '',
            target_url: r.target_url || '',
            domain_authority: r.source_domain_authority || 0,
            page_authority: r.source_page_authority || 0,
        }));

        return this.buildOutput({
            items,
            count: items.length,
            target_url: url,
            summary: `${items.length} backlinks para "${url}"`,
        }, 'backlinks', context);
    }

    // ────────────── Helpers ──────────────

    private countBy(arr: any[], field: string): { name: string; count: number }[] {
        const counts: Record<string, number> = {};
        arr.forEach(item => {
            const val = item[field] || 'Desconhecido';
            counts[val] = (counts[val] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }

    private async apiGet(config: BuzzSumoConfig, path: string, params: Record<string, string>, context: ExecutionContext): Promise<any> {
        const url = `${BUZZSUMO_API_BASE}${path}`;
        await context.logger(`[BuzzSumoHandler] GET ${path}`);

        const response = await axios.get(url, {
            params: { ...params, api_key: config.apiKey },
            timeout: 30000,
            validateStatus: () => true,
        });

        if (response.status === 401) throw new Error('API Key inválida. Verifique suas credenciais em buzzsumo.com.');
        if (response.status === 429) throw new Error('Rate limit excedido. Aguarde antes de nova requisição.');
        if (response.status >= 400) throw new Error(`API retornou ${response.status}: ${JSON.stringify(response.data)}`);

        return response.data;
    }

    private async buildOutput(data: any, operation: string, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger(`[BuzzSumoHandler] ✅ ${operation}: ${data.summary || 'done'}`);

        return {
            success: true,
            data: {
                ...data,
                operation,
                source: 'buzzsumo',
                source_type: 'content_intelligence',
                _variables: {
                    items: { label: 'Artigos/Influenciadores', type: 'list' },
                    count: { label: 'Quantidade', type: 'text' },
                    summary: { label: 'Resumo', type: 'text' },
                    total_shares: { label: 'Total Shares', type: 'text' },
                    avg_shares_per_article: { label: 'Média Shares/Artigo', type: 'text' },
                    total_articles: { label: 'Total Artigos', type: 'text' },
                    top_domains: { label: 'Top Domínios', type: 'list' },
                    top_authors: { label: 'Top Autores', type: 'list' },
                    query: { label: 'Query', type: 'text' },
                    operation: { label: 'Operação', type: 'text' },
                }
            }
        };
    }
}
