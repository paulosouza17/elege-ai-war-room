import { DataSourceAdapter, DataSourceConfig } from './DataSourceAdapter';

export class BrandwatchAdapter implements DataSourceAdapter {
    name = 'Brandwatch';
    type = 'social' as const;
    private baseUrl = 'https://api.brandwatch.com';

    async validateConfig(config: DataSourceConfig): Promise<boolean> {
        return !!(config.apiKey && config.projectId);
    }

    async connect(config: DataSourceConfig): Promise<boolean> {
        if (!config.apiKey) return false;
        try {
            const response = await fetch(`${this.baseUrl}/projects/summary`, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                }
            });
            return response.status === 200;
        } catch (error) {
            console.error('Brandwatch connection failed:', error);
            return false;
        }
    }

    async fetchData(config: DataSourceConfig, params: { queryId?: string, startDate?: string, endDate?: string }): Promise<any> {
        if (!config.apiKey || !config.projectId) throw new Error('Brandwatch API Key or Project ID missing');

        // Example: Retrieve mentions for a specific query within the project
        // Endpoint structure varies based on specific BW product (Consumer Research vs others)
        // Assuming Consumer Research API pattern for mentions

        const queryId = params.queryId;
        if (!queryId) throw new Error('Query ID required for Brandwatch fetch');

        const startDate = params.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const endDate = params.endDate || new Date().toISOString();

        const url = `${this.baseUrl}/projects/${config.projectId}/data/mentions?queryId=${queryId}&startDate=${startDate}&endDate=${endDate}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Brandwatch API Error: ${response.status}`);
        }

        return await response.json();
    }
}
