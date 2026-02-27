import { supabase } from '../config/supabase';
import { DataSourceAdapter, DataSourceConfig } from '../adapters/DataSourceAdapter';
import { TwitterAdapter } from '../adapters/TwitterAdapter';
import { BrandwatchAdapter } from '../adapters/BrandwatchAdapter';
import { BuzzSumoAdapter } from '../adapters/BuzzSumoAdapter';

export class DataSourceService {
    private adapters: Map<string, DataSourceAdapter> = new Map();

    constructor() {
        this.registerAdapter(new TwitterAdapter());
        this.registerAdapter(new BrandwatchAdapter());
        this.registerAdapter(new BuzzSumoAdapter());
    }

    registerAdapter(adapter: DataSourceAdapter) {
        this.adapters.set(adapter.name, adapter);
    }

    getAdapter(name: string): DataSourceAdapter | undefined {
        return this.adapters.get(name);
    }

    async getAllSources() {
        const { data, error } = await supabase
            .from('data_sources')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    }

    async testConnection(sourceId: string): Promise<{ success: boolean; message?: string }> {
        try {
            // 1. Get config from DB
            const { data: source, error } = await supabase
                .from('data_sources')
                .select('*')
                .eq('id', sourceId)
                .single();

            if (error || !source) throw new Error('Source not found');

            // 2. Find adapter
            const adapter = this.getAdapter(source.name);
            if (!adapter) throw new Error(`Adapter for ${source.name} not implemented`);

            // 3. Test connection
            const success = await adapter.connect(source.config);

            // 4. Update status
            if (success) {
                await supabase
                    .from('data_sources')
                    .update({ last_synced_at: new Date().toISOString() })
                    .eq('id', sourceId);
            }

            return { success };
        } catch (err: any) {
            console.error('Connection test failed:', err);
            return { success: false, message: err.message };
        }
    }

    async logExecution(sourceId: string, endpoint: string, status: 'success' | 'error', payload: any, response?: any, errorMessage?: string) {
        const { error } = await supabase
            .from('external_data_logs')
            .insert({
                source_id: sourceId,
                endpoint,
                status,
                payload,
                response,
                error_message: errorMessage
            });

        if (error) console.error('Failed to log execution:', error);
    }
}

export const dataSourceService = new DataSourceService();
