import { DataSourceAdapter, DataSourceConfig } from './DataSourceAdapter';

export class TwitterAdapter implements DataSourceAdapter {
    name = 'X (Twitter)';
    type = 'social' as const;
    private baseUrl = 'https://api.twitter.com/2';

    async validateConfig(config: DataSourceConfig): Promise<boolean> {
        return !!config.apiKey; // In v2 usually Bearer Token
    }

    async connect(config: DataSourceConfig): Promise<boolean> {
        if (!config.apiKey) return false;
        try {
            // Test connection with a simple user lookup or rule check
            // For v2 app-only, we usually check /2/tweets/search/recent?query=from:twitterdev
            const response = await fetch(`${this.baseUrl}/tweets/search/recent?query=test&max_results=10`, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                }
            });
            return response.status === 200;
        } catch (error) {
            console.error('Twitter connection failed:', error);
            return false;
        }
    }

    async fetchData(config: DataSourceConfig, params: { query: string, max_results?: number }): Promise<any> {
        if (!config.apiKey) throw new Error('Twitter API Key missing');

        // Default params
        const maxResults = params.max_results || 10;
        const query = encodeURIComponent(params.query);

        // We want tweet fields like created_at, author_id, public_metrics
        const fields = 'tweet.fields=created_at,author_id,public_metrics,lang';
        const expansions = 'expansions=author_id';
        const userFields = 'user.fields=username,name,profile_image_url,public_metrics';

        const url = `${this.baseUrl}/tweets/search/recent?query=${query}&max_results=${maxResults}&${fields}&${expansions}&${userFields}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}` // Bearer Token
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Twitter API Error: ${response.status} - ${JSON.stringify(error)}`);
        }

        return await response.json();
    }
}
