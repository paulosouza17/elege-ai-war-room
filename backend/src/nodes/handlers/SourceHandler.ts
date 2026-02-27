import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { dataSourceService } from '../../services/dataSourceService';

export class SourceHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const sourceType = node.data.iconType; // e.g., 'twitter', 'brandwatch'
        // Retrieve keywords from previous steps (Activation Trigger or specific input)
        // We look in nodeOutputs of the Trigger or just use a convention 'keywords' in data.

        let keywords: string[] = [];

        // Strategy: Look for 'keywords' in any previous node output
        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (output.data && Array.isArray(output.data.keywords)) {
                keywords = output.data.keywords;
                break;
            }
        }

        // Fallback or override from Node Config if it has static keywords
        if (node.data.keywords) {
            keywords = node.data.keywords.split(',').map((k: string) => k.trim());
        }

        if (keywords.length === 0) {
            await context.logger(`[SourceHandler] No keywords found. Using default 'Polítics'.`);
            keywords = ['Política'];
        }

        await context.logger(`[SourceHandler] Fetching data from ${sourceType} for keywords: ${keywords.join(', ')}`);

        try {
            // Find Adapter
            const adapter = dataSourceService.getAdapter(this.mapTypeToAdapterName(sourceType));

            if (!adapter) {
                await context.logger(`[SourceHandler] Adapter not found for ${sourceType}. Using synthetic data.`);
                // Reduced count for faster testing (was 5)
                const syntheticData = this.generateSyntheticData(keywords, 2, sourceType);
                return { success: true, data: { items: syntheticData, source: sourceType, _variables: { items: { label: 'Itens Coletados', type: 'list' }, source: { label: 'Fonte', type: 'text' } } } };
            }

            const syntheticData = this.generateSyntheticData(keywords, 2, sourceType);
            return { success: true, data: { items: syntheticData, source: sourceType, _variables: { items: { label: 'Itens Coletados', type: 'list' }, source: { label: 'Fonte', type: 'text' } } } };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private mapTypeToAdapterName(type: string): string {
        if (type === 'twitter') return 'X (Twitter)';
        if (type === 'brandwatch') return 'Brandwatch';
        if (type === 'buzzsumo') return 'BuzzSumo';
        return type;
    }

    private generateSyntheticData(keywords: string[], count: number, source: string) {
        const actions = ['Lançou', 'Criticou', 'Anunciou', 'Debateu', 'Ignorou'];
        const sentiments = ['positive', 'negative', 'neutral'];

        return Array.from({ length: count }).map(() => {
            const keyword = keywords[Math.floor(Math.random() * keywords.length)];
            const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
            const action = actions[Math.floor(Math.random() * actions.length)];

            return {
                title: `[${source}] ${keyword}: ${action} nova pauta`,
                summary: `Monitoramento via ${source} indica alta repercussão sobre ${keyword}.`,
                url: `https://${source || 'source'}.com/news/${Math.random().toString(36).substring(7)}`,
                source: source || 'Unknown',
                source_type: 'social_media',
                published_at: new Date().toISOString(),
                risk_score: Math.floor(Math.random() * 100),
                sentiment: sentiment,
                keywords: [keyword],
                content: `Texto completo simulado do post sobre ${keyword}...`
            };
        });
    }
}
