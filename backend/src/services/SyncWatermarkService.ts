import { SupabaseClient } from '@supabase/supabase-js';

export interface SyncWatermark {
    activationId: string;
    sourceType: string;
    sourceKey?: string;
    lastSyncAt: Date;
    lastItemId?: string;
    lastItemDate?: Date;
}

/**
 * Manages sync watermarks for incremental data fetching.
 * Each collector (elege_mentions, elege_channels, twitter, portal) stores
 * the last processed timestamp/ID per activation to avoid re-fetching old data.
 */
export class SyncWatermarkService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Get the watermark for a specific source/activation combo.
     * Returns null if no watermark exists (first sync).
     */
    async get(
        activationId: string,
        sourceType: string,
        sourceKey?: string
    ): Promise<SyncWatermark | null> {
        let query = this.supabase
            .from('sync_watermarks')
            .select('*')
            .eq('activation_id', activationId)
            .eq('source_type', sourceType);

        if (sourceKey) {
            query = query.eq('source_key', sourceKey);
        } else {
            query = query.is('source_key', null);
        }

        const { data, error } = await query.maybeSingle();

        if (error || !data) return null;

        return {
            activationId: data.activation_id,
            sourceType: data.source_type,
            sourceKey: data.source_key || undefined,
            lastSyncAt: new Date(data.last_sync_at),
            lastItemId: data.last_item_id || undefined,
            lastItemDate: data.last_item_date ? new Date(data.last_item_date) : undefined,
        };
    }

    /**
     * Upsert a watermark after a successful sync cycle.
     */
    async set(
        activationId: string,
        sourceType: string,
        options: {
            sourceKey?: string;
            lastItemId?: string;
            lastItemDate?: Date;
            metadata?: Record<string, any>;
        } = {}
    ): Promise<void> {
        const now = new Date().toISOString();

        const { error } = await this.supabase
            .from('sync_watermarks')
            .upsert(
                {
                    activation_id: activationId,
                    source_type: sourceType,
                    source_key: options.sourceKey || null,
                    last_sync_at: now,
                    last_item_id: options.lastItemId || null,
                    last_item_date: options.lastItemDate?.toISOString() || null,
                    metadata: options.metadata || {},
                    updated_at: now,
                },
                {
                    onConflict: 'activation_id,source_type,source_key',
                    ignoreDuplicates: false,
                }
            );

        if (error) {
            // Fallback: try manual upsert via select+insert/update
            const existing = await this.get(activationId, sourceType, options.sourceKey);

            if (existing) {
                let updateQuery = this.supabase
                    .from('sync_watermarks')
                    .update({
                        last_sync_at: now,
                        last_item_id: options.lastItemId || null,
                        last_item_date: options.lastItemDate?.toISOString() || null,
                        metadata: options.metadata || {},
                        updated_at: now,
                    })
                    .eq('activation_id', activationId)
                    .eq('source_type', sourceType);

                if (options.sourceKey) {
                    updateQuery = updateQuery.eq('source_key', options.sourceKey);
                } else {
                    updateQuery = updateQuery.is('source_key', null);
                }

                await updateQuery;
            } else {
                await this.supabase.from('sync_watermarks').insert({
                    activation_id: activationId,
                    source_type: sourceType,
                    source_key: options.sourceKey || null,
                    last_sync_at: now,
                    last_item_id: options.lastItemId || null,
                    last_item_date: options.lastItemDate?.toISOString() || null,
                    metadata: options.metadata || {},
                });
            }
        }
    }

    /**
     * Get start_date string (YYYY-MM-DD) for API calls.
     * Falls back to a default lookback period if no watermark exists.
     */
    getStartDate(watermark: SyncWatermark | null, defaultLookbackHours: number = 24): string {
        if (watermark?.lastItemDate) {
            return watermark.lastItemDate.toISOString().split('T')[0];
        }
        if (watermark?.lastSyncAt) {
            return watermark.lastSyncAt.toISOString().split('T')[0];
        }
        // Default: look back N hours
        const fallback = new Date(Date.now() - defaultLookbackHours * 3600_000);
        return fallback.toISOString().split('T')[0];
    }

    /**
     * Get start_time ISO string for Twitter API.
     * Falls back to 24h ago if no watermark exists.
     */
    getStartTime(watermark: SyncWatermark | null, defaultLookbackHours: number = 24): string {
        if (watermark?.lastItemDate) {
            return watermark.lastItemDate.toISOString();
        }
        if (watermark?.lastSyncAt) {
            return watermark.lastSyncAt.toISOString();
        }
        const fallback = new Date(Date.now() - defaultLookbackHours * 3600_000);
        return fallback.toISOString();
    }
}
