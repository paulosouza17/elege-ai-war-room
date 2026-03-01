import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Generate a content hash from title + first 500 chars of content.
 * Used as a fallback dedup key when URL is not unique/meaningful.
 */
export function generateContentHash(title: string, content: string): string {
    const normalized = `${(title || '').trim().toLowerCase()}||${(content || '').trim().toLowerCase().substring(0, 500)}`;
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

/**
 * Check if a URL already exists in intelligence_feed for a given activation.
 */
export async function checkDuplicateByUrl(
    supabase: SupabaseClient,
    url: string,
    activationId?: string
): Promise<boolean> {
    if (!url || url.startsWith('elegeai-mention-') || url.length < 5) return false;

    let query = supabase
        .from('intelligence_feed')
        .select('id')
        .eq('url', url)
        .limit(1);

    if (activationId) {
        query = query.eq('activation_id', activationId);
    }

    const { data } = await query.maybeSingle();
    return !!data;
}

/**
 * Batch dedup check: filters out items that already exist in intelligence_feed.
 * Uses URL matching first, then content hash as fallback.
 *
 * Returns only new (non-duplicate) items and the count of skipped duplicates.
 */
export async function checkDuplicates(
    supabase: SupabaseClient,
    items: any[],
    activationId?: string,
    logger?: (msg: string) => Promise<void>
): Promise<{ newItems: any[]; duplicateCount: number }> {
    if (!items || items.length === 0) {
        return { newItems: [], duplicateCount: 0 };
    }

    // 0. Collect elege_post_ids for cross-path dedup
    const elegePostIds = items
        .map(item => item.classification_metadata?.elege_post_id)
        .filter(Boolean)
        .map(String);

    let existingPostIds = new Set<string>();
    if (elegePostIds.length > 0) {
        const uniquePostIds = [...new Set(elegePostIds)];
        // Query in batches of 50 to avoid query-string limits
        for (let i = 0; i < uniquePostIds.length; i += 50) {
            const batch = uniquePostIds.slice(i, i + 50);
            let query = supabase
                .from('intelligence_feed')
                .select('classification_metadata->>elege_post_id')
                .in('classification_metadata->>elege_post_id', batch);

            if (activationId) {
                query = query.eq('activation_id', activationId);
            }

            const { data: rows } = await query;
            if (rows) {
                rows.forEach((r: any) => {
                    const pid = r.elege_post_id || r['classification_metadata->>elege_post_id'];
                    if (pid) existingPostIds.add(String(pid));
                });
            }
        }
    }

    // 1. Collect URLs from items
    const urls = items
        .map(item => item.url)
        .filter((url: string) => url && url.length >= 5 && !url.startsWith('elegeai-mention-'));

    // 2. Batch query existing URLs
    let existingUrls = new Set<string>();
    if (urls.length > 0) {
        let query = supabase
            .from('intelligence_feed')
            .select('url')
            .in('url', urls);

        if (activationId) {
            query = query.eq('activation_id', activationId);
        }

        const { data: existingRows } = await query;
        if (existingRows) {
            existingUrls = new Set(existingRows.map((r: any) => r.url));
        }
    }

    // 3. For items without meaningful URL, check by content hash
    const itemsWithoutUrl = items.filter(item =>
        !item.url || item.url.length < 5 || item.url.startsWith('elegeai-mention-')
    );

    let existingHashes = new Set<string>();
    if (itemsWithoutUrl.length > 0) {
        const hashes = itemsWithoutUrl.map(item =>
            generateContentHash(item.title || '', item.content || item.summary || '')
        );

        // Search for title+content matches via summary comparison (first 100 chars)
        // Since we don't have a content_hash column, we check title similarity
        for (const item of itemsWithoutUrl) {
            const titleToCheck = (item.title || '').trim();
            if (!titleToCheck || titleToCheck === 'Sem título') continue;

            let query = supabase
                .from('intelligence_feed')
                .select('id, title')
                .eq('title', titleToCheck)
                .limit(1);

            if (activationId) {
                query = query.eq('activation_id', activationId);
            }

            const { data: match } = await query.maybeSingle();
            if (match) {
                const hash = generateContentHash(item.title || '', item.content || item.summary || '');
                existingHashes.add(hash);
            }
        }
    }

    // 4. Filter items (Layer 0: post_id → Layer 1: URL → Layer 2: content hash)
    const newItems: any[] = [];
    let duplicateCount = 0;

    for (const item of items) {
        // Layer 0: elege_post_id
        const postId = item.classification_metadata?.elege_post_id;
        if (postId && existingPostIds.has(String(postId))) {
            duplicateCount++;
            continue;
        }

        const url = item.url;
        const hasUrl = url && url.length >= 5 && !url.startsWith('elegeai-mention-');

        // Layer 1: URL
        if (hasUrl && existingUrls.has(url)) {
            duplicateCount++;
            continue;
        }

        // Layer 2: content hash
        if (!hasUrl) {
            const hash = generateContentHash(item.title || '', item.content || item.summary || '');
            if (existingHashes.has(hash)) {
                duplicateCount++;
                continue;
            }
        }

        newItems.push(item);
    }

    if (duplicateCount > 0 && logger) {
        await logger(`[Dedup] ⏭ Skipped ${duplicateCount} duplicate item(s) out of ${items.length} total.`);
    }

    return { newItems, duplicateCount };
}
