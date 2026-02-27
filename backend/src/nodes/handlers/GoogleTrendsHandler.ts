import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
const googleTrends = require('google-trends-api');

export class GoogleTrendsHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger('[GoogleTrendsHandler] Starting Google Trends data collection...');

        // 1. Build keywords from node config + upstream
        const keywords = this.buildKeywords(node, context);
        if (keywords.length === 0) {
            return { success: false, error: 'Nenhuma keyword definida. Configure keywords no nó ou conecte a um trigger.' };
        }

        const geo = node.data.trendsGeo || 'BR';
        const operation = node.data.trendsOperation || 'interestOverTime';
        const timeRange = node.data.trendsTimeRange || '7d';

        await context.logger(`[GoogleTrendsHandler] Operation: ${operation}, Keywords: [${keywords.join(', ')}], Geo: ${geo}, Range: ${timeRange}`);

        try {
            let result: NodeOutput;

            switch (operation) {
                case 'interestOverTime':
                    result = await this.interestOverTime(keywords, geo, timeRange, context);
                    break;
                case 'interestByRegion':
                    result = await this.interestByRegion(keywords, geo, context);
                    break;
                case 'relatedQueries':
                    result = await this.relatedQueries(keywords, geo, context);
                    break;
                case 'relatedTopics':
                    result = await this.relatedTopics(keywords, geo, context);
                    break;
                case 'dailyTrends':
                    result = await this.dailyTrends(geo, context);
                    break;
                default:
                    result = await this.interestOverTime(keywords, geo, timeRange, context);
            }

            return result;
        } catch (error: any) {
            const msg = error.message || String(error);
            await context.logger(`[GoogleTrendsHandler] ❌ Error: ${msg}`);

            if (msg.includes('429') || msg.includes('Too Many Requests')) {
                return { success: false, error: 'Google Trends rate limit atingido. Aguarde 1-2 minutos e tente novamente.' };
            }

            return { success: false, error: `Google Trends Error: ${msg}` };
        }
    }

    private buildKeywords(node: any, context: ExecutionContext): string[] {
        const keywords: string[] = [];

        // From node config
        if (node.data.trendsKeywords) {
            keywords.push(...node.data.trendsKeywords.split(',').map((k: string) => k.trim()).filter(Boolean));
        }

        // From upstream nodes (trigger keywords, etc.)
        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (output?.data?.keywords && Array.isArray(output.data.keywords)) {
                keywords.push(...output.data.keywords);
            }
        }

        // Deduplicate and limit to 5 (Google Trends max comparison)
        return [...new Set(keywords)].slice(0, 5);
    }

    private getStartTime(range: string): Date {
        const now = new Date();
        switch (range) {
            case '1d': return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
            case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            case '12m': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
    }

    // ────────────── Operations ──────────────

    private async interestOverTime(keywords: string[], geo: string, timeRange: string, context: ExecutionContext): Promise<NodeOutput> {
        const raw = await googleTrends.interestOverTime({
            keyword: keywords,
            geo,
            startTime: this.getStartTime(timeRange),
        });

        const parsed = JSON.parse(raw);
        const timelineData = parsed.default?.timelineData || [];

        const items = timelineData.map((point: any) => ({
            date: point.formattedTime,
            timestamp: new Date(point.time * 1000).toISOString(),
            values: keywords.reduce((acc: any, kw: string, i: number) => {
                acc[kw] = point.value[i] || 0;
                return acc;
            }, {}),
            total: point.value.reduce((a: number, b: number) => a + b, 0),
        }));

        // Calculate peak and average for each keyword
        const analysis = keywords.map((kw, i) => {
            const values = timelineData.map((p: any) => p.value[i] || 0);
            const peak = Math.max(...values);
            const avg = values.length > 0 ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : 0;
            const latest = values[values.length - 1] || 0;
            const trend = values.length >= 2 ? (latest > values[values.length - 2] ? 'rising' : latest < values[values.length - 2] ? 'falling' : 'stable') : 'stable';
            return { keyword: kw, peak, average: avg, latest, trend };
        });

        await context.logger(`[GoogleTrendsHandler] ✅ ${items.length} data points collected for ${keywords.length} keywords`);

        return {
            success: true,
            data: {
                items,
                analysis,
                count: items.length,
                keywords,
                geo,
                time_range: timeRange,
                source: 'google_trends',
                source_type: 'search_trends',
                summary: `Google Trends: ${keywords.join(', ')} (${geo}, ${timeRange}). ${analysis.map(a => `${a.keyword}: pico=${a.peak}, média=${a.average}, tendência=${a.trend}`).join('; ')}`,
                _variables: {
                    items: { label: 'Série Temporal', type: 'list' },
                    analysis: { label: 'Análise por Keyword', type: 'list' },
                    count: { label: 'Data Points', type: 'text' },
                    keywords: { label: 'Keywords', type: 'list' },
                    summary: { label: 'Resumo', type: 'text' },
                },
            },
        };
    }

    private async interestByRegion(keywords: string[], geo: string, context: ExecutionContext): Promise<NodeOutput> {
        const raw = await googleTrends.interestByRegion({
            keyword: keywords,
            geo,
            resolution: geo === 'BR' ? 'REGION' : 'COUNTRY',
        });

        const parsed = JSON.parse(raw);
        const geoData = parsed.default?.geoMapData || [];

        const items = geoData.map((region: any) => ({
            region: region.geoName,
            region_code: region.geoCode,
            values: keywords.reduce((acc: any, kw: string, i: number) => {
                acc[kw] = region.value[i] || 0;
                return acc;
            }, {}),
            max_value: Math.max(...region.value),
        })).sort((a: any, b: any) => b.max_value - a.max_value);

        await context.logger(`[GoogleTrendsHandler] ✅ ${items.length} regions analyzed`);

        return {
            success: true,
            data: {
                items,
                count: items.length,
                keywords,
                geo,
                source: 'google_trends',
                source_type: 'search_trends',
                summary: `Interesse regional: ${items.slice(0, 3).map((r: any) => r.region).join(', ')} são as regiões com mais buscas.`,
                _variables: {
                    items: { label: 'Regiões', type: 'list' },
                    count: { label: 'Total Regiões', type: 'text' },
                    summary: { label: 'Resumo', type: 'text' },
                },
            },
        };
    }

    private async relatedQueries(keywords: string[], geo: string, context: ExecutionContext): Promise<NodeOutput> {
        const raw = await googleTrends.relatedQueries({
            keyword: keywords,
            geo,
        });

        const parsed = JSON.parse(raw);
        const allQueries: any[] = [];

        for (const kw of Object.keys(parsed.default || {})) {
            const kwData = parsed.default[kw];
            const top = (kwData?.top || []).map((q: any) => ({
                query: q.query, value: q.value, keyword: kw, type: 'top',
            }));
            const rising = (kwData?.rising || []).map((q: any) => ({
                query: q.query, value: q.value, keyword: kw, type: 'rising',
            }));
            allQueries.push(...top, ...rising);
        }

        await context.logger(`[GoogleTrendsHandler] ✅ ${allQueries.length} related queries found`);

        return {
            success: true,
            data: {
                items: allQueries,
                count: allQueries.length,
                keywords,
                source: 'google_trends',
                source_type: 'search_trends',
                summary: `${allQueries.filter(q => q.type === 'rising').length} queries em ascensão, ${allQueries.filter(q => q.type === 'top').length} queries top.`,
                _variables: {
                    items: { label: 'Queries Relacionadas', type: 'list' },
                    count: { label: 'Total', type: 'text' },
                    summary: { label: 'Resumo', type: 'text' },
                },
            },
        };
    }

    private async relatedTopics(keywords: string[], geo: string, context: ExecutionContext): Promise<NodeOutput> {
        const raw = await googleTrends.relatedTopics({
            keyword: keywords,
            geo,
        });

        const parsed = JSON.parse(raw);
        const allTopics: any[] = [];

        for (const kw of Object.keys(parsed.default || {})) {
            const kwData = parsed.default[kw];
            const top = (kwData?.top || []).map((t: any) => ({
                title: t.topic?.title || t.query, type_label: t.topic?.type || '', value: t.value, keyword: kw, category: 'top',
            }));
            const rising = (kwData?.rising || []).map((t: any) => ({
                title: t.topic?.title || t.query, type_label: t.topic?.type || '', value: t.value, keyword: kw, category: 'rising',
            }));
            allTopics.push(...top, ...rising);
        }

        await context.logger(`[GoogleTrendsHandler] ✅ ${allTopics.length} related topics found`);

        return {
            success: true,
            data: {
                items: allTopics,
                count: allTopics.length,
                keywords,
                source: 'google_trends',
                source_type: 'search_trends',
                summary: `Tópicos relacionados: ${allTopics.slice(0, 5).map(t => t.title).join(', ')}`,
                _variables: {
                    items: { label: 'Tópicos', type: 'list' },
                    count: { label: 'Total', type: 'text' },
                    summary: { label: 'Resumo', type: 'text' },
                },
            },
        };
    }

    private async dailyTrends(geo: string, context: ExecutionContext): Promise<NodeOutput> {
        const raw = await googleTrends.dailyTrends({ geo });
        const parsed = JSON.parse(raw);

        const trendingSearches = parsed.default?.trendingSearchesDays || [];
        const items: any[] = [];

        for (const day of trendingSearches) {
            for (const trend of (day.trendingSearches || [])) {
                items.push({
                    title: trend.title?.query || '',
                    traffic: trend.formattedTraffic || '',
                    date: day.formattedDate || '',
                    articles: (trend.articles || []).slice(0, 2).map((a: any) => ({
                        title: a.title, url: a.url, source: a.source,
                    })),
                    related_queries: (trend.relatedQueries || []).map((q: any) => q.query),
                });
            }
        }

        await context.logger(`[GoogleTrendsHandler] ✅ ${items.length} daily trending topics found`);

        return {
            success: true,
            data: {
                items,
                count: items.length,
                geo,
                source: 'google_trends',
                source_type: 'search_trends',
                summary: `Trending hoje: ${items.slice(0, 5).map(t => `${t.title} (${t.traffic})`).join(', ')}`,
                _variables: {
                    items: { label: 'Trending', type: 'list' },
                    count: { label: 'Total', type: 'text' },
                    summary: { label: 'Resumo', type: 'text' },
                },
            },
        };
    }
}
