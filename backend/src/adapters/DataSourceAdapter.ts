export interface DataSourceConfig {
    apiKey?: string;
    apiSecret?: string;
    endpoint?: string;
    [key: string]: any;
}

export interface DataSourceAdapter {
    name: string;
    type: 'social' | 'seo' | 'market' | 'political' | 'ai' | 'news' | 'content';

    /**
     * Validate the configuration provided by the user.
     * key: The name of the field to validate.
     */
    validateConfig(config: DataSourceConfig): Promise<boolean>;

    /**
     * Connect to the external service to verify credentials.
     */
    connect(config: DataSourceConfig): Promise<boolean>;

    /**
     * Fetch data from the external service.
     * @param params Parameters specific to the source (e.g., query, date range)
     */
    fetchData(config: DataSourceConfig, params: any): Promise<any>;
}
