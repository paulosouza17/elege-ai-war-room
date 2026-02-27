import { DataSourceAdapter, DataSourceConfig } from './DataSourceAdapter';

export class BuzzSumoAdapter implements DataSourceAdapter {
    name = 'BuzzSumo';
    type = 'content' as const;
    private baseUrl = 'https://api.buzzsumo.com';

    async validateConfig(config: DataSourceConfig): Promise<boolean> {
        return !!config.apiKey;
    }

    async connect(config: DataSourceConfig): Promise<boolean> {
        if (!config.apiKey) return false;
        try {
            // Test with a simple search for "news"
            const url = `${this.baseUrl}/search/articles.json?q=news&num_results=1&api_key=${config.apiKey}`;
            const response = await fetch(url);
            return response.status === 200;
        } catch (error) {
            console.error('BuzzSumo connection failed:', error);
            return false;
        }
    }

    async fetchData(config: DataSourceConfig, params: { q: string, num_results?: number, result_type?: string }): Promise<any> {
        if (!config.apiKey) throw new Error('BuzzSumo API Key missing');

        // Default params
        const numResults = params.num_results || 10;
        const resultType = params.result_type || 'all'; // trending, all, etc.
        const query = encodeURIComponent(params.q);

        // BuzzSumo generally uses query params for auth too in some versions, or header.
        // Documentation says api_key query param is common.

        const url = `${this.baseUrl}/search/articles.json?q=${query}&result_type=${resultType}&num_results=${numResults}&api_key=${config.apiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`BuzzSumo API Error: ${response.status}`);
        }

        return await response.json();
    }
}
