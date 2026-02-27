export interface IngestionPayload {
    source_id: string;
    external_id?: string;
    text: string;
    author?: string;
    url?: string;
    media_url?: string;
    published_at?: string;
    metadata?: Record<string, any>;
}

export interface NormalizedMention {
    id?: string;
    client_id: string;
    source_id: string;
    external_id: string | null;
    text: string;
    author: string | null;
    url: string | null;
    media_url: string | null;
    metadata: Record<string, any>;
    created_at: Date;
}
