import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { SyncWatermarkService } from './SyncWatermarkService';

export class ElegeSyncService {
    private supabase: SupabaseClient;
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private apiBaseUrl: string = (process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001') + '/api';
    private apiKey: string;
    private watermarkService: SyncWatermarkService;
    private SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
        this.apiKey = process.env.ELEGEAI_API_TOKEN || '';
        this.watermarkService = new SyncWatermarkService(supabaseClient);

        if (!this.apiKey) {
            console.warn('[ElegeSync] ELEGEAI_API_TOKEN is missing in .env. Service will not fetch data.');
        }
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Execute immediately
        this.runSync().catch(err => console.error('[ElegeSync] Initial sync failed:', err));

        // Schedule
        this.intervalId = setInterval(() => {
            this.runSync().catch(err => console.error('[ElegeSync] Sync failed:', err));
        }, this.SYNC_INTERVAL_MS);

        console.log('[ElegeSync] Service started - polling every 5 minutes.');
    }

    public stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        console.log('[ElegeSync] Service stopped.');
    }

    private async runSync() {
        if (!this.apiKey) return;

        console.log('[ElegeSync] Starting sync cycle...');

        try {
            // 1. Get active activations with people_of_interest
            const { data: activations, error: actError } = await this.supabase
                .from('activations')
                .select('id, name, people_of_interest, keywords')
                .eq('status', 'active');

            if (actError) throw actError;
            if (!activations || activations.length === 0) {
                console.log('[ElegeSync] No active activations found to sync.');
                return;
            }

            for (const activation of activations) {
                await this.syncActivation(activation);
            }

            console.log('[ElegeSync] Sync cycle completed.');

        } catch (error: any) {
            console.error('[ElegeSync] Error in sync cycle:', error.message);
        }
    }

    private async syncActivation(activation: any) {
        const activationLabel = activation.name || activation.id;
        const people = activation.people_of_interest || [];

        if (people.length === 0) {
            console.log(`[ElegeSync] Activation "${activationLabel}" has no people_of_interest configured. Skipping people sync.`);
        } else {
            console.log(`[ElegeSync] Syncing activation "${activationLabel}" — ${people.length} person(s) of interest`);

            for (const personName of people) {
                try {
                    // 2. Discover person_id in Elege API
                    const personId = await this.getPersonId(personName);
                    if (!personId) {
                        console.log(`[ElegeSync] Person not found in Elege API for: "${personName}"`);
                        continue;
                    }

                    // 3. Fetch latest mentions
                    await this.fetchAndStoreMentions(personId, activation);

                } catch (error: any) {
                    console.error(`[ElegeSync] Failed to sync person "${personName}":`, error.message);
                }
            }
        }

        // 4. Sync linked channels (Instagram, TV, Radio, YouTube, Website, etc.)
        await this.syncChannels(activation);
    }

    private async getPersonId(name: string): Promise<number | null> {
        try {
            const url = `${this.apiBaseUrl}/people?q=${encodeURIComponent(name)}`;
            console.log(`[ElegeSync] DEBUG: GET ${url} | Token prefix: ${this.apiKey?.substring(0, 6)}...`);

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                },
                timeout: 30000,
            });

            console.log(`[ElegeSync] DEBUG: Response status ${response.status}, keys: ${Object.keys(response.data || {}).join(',')}`);
            const data = response.data;

            // API returns {people: [...], meta: {...}}
            const people = Array.isArray(data) ? data : (data.people || data.data || []);

            console.log(`[ElegeSync] DEBUG: Found ${people.length} people for "${name}"`);
            if (people.length > 0) {
                console.log(`[ElegeSync] DEBUG: First person: id=${people[0].id}, alias=${people[0].alias}`);
                return people[0].id;
            }
            return null;
        } catch (error: any) {
            if (error.response) {
                console.warn(`[ElegeSync] API /people returned ${error.response.status} | Body: ${JSON.stringify(error.response.data)?.substring(0, 300)}`);
            } else {
                console.error(`[ElegeSync] getPersonId error:`, error.message);
            }
            return null;
        }
    }

    /**
     * Fetch full post data (content, url, summary) from /api/posts/:id
     * The mentions endpoint only returns {id, title} for posts.
     */
    private async fetchFullPost(postId: number): Promise<any | null> {
        try {
            const url = `${this.apiBaseUrl}/posts/${postId}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                },
                timeout: 15000,
            });
            return response.data;
        } catch (error: any) {
            console.warn(`[ElegeSync] Could not fetch full post ${postId}: ${error.message}`);
            return null;
        }
    }

    /**
     * Map channel.kind from the Elege API to our source_type taxonomy.
     */
    private mapSourceType(channelKind: string | number | undefined): string {
        const kind = String(channelKind || '').toLowerCase();
        // Elege API numeric kinds: 0=tv, 1=radio, 4=website, 7=whatsapp, 9=youtube, 11=instagram
        if (kind === 'tv' || kind === '0') return 'tv';
        if (kind === 'radio' || kind === '1') return 'radio';
        if (kind === 'youtube' || kind === '9') return 'tv'; // YouTube channels = audiovisual → tv
        if (kind === 'website' || kind === '4') return 'portal'; // Elege website channels → portal
        if (kind === 'instagram' || kind === '11') return 'social_media';
        if (kind === 'tiktok') return 'social_media';
        if (['social', 'twitter', 'facebook', 'x'].includes(kind)) return 'social_media';
        if (kind === 'whatsapp' || kind === '7') return 'whatsapp';
        if (['news', 'web', 'site', 'portal'].includes(kind)) return 'portal';
        return 'portal'; // default fallback
    }

    /**
     * Map sentiment string to {sentiment, riskScore}.
     */
    private mapSentiment(raw: string | { tone?: string } | undefined): { sentiment: string; riskScore: number } {
        const tone = typeof raw === 'string' ? raw : raw?.tone;
        switch (tone) {
            case 'negative': return { sentiment: 'negative', riskScore: 75 };
            case 'positive': return { sentiment: 'positive', riskScore: 20 };
            case 'mixed': return { sentiment: 'neutral', riskScore: 55 };
            default: return { sentiment: 'neutral', riskScore: 50 };
        }
    }

    /**
     * Sync linked channels for an activation.
     * Queries channel_activations for channels linked to this activation,
     * then fetches latest posts/mentions from each channel via the Elege API.
     * Supports all channel kinds: instagram, tiktok, tv, radio, youtube, website.
     */
    private async syncChannels(activation: any) {
        const activationLabel = activation.name || activation.id;

        try {
            // Get linked channels for this activation
            const { data: links, error } = await this.supabase
                .from('channel_activations')
                .select('elege_channel_id, channel_kind, channel_title')
                .eq('activation_id', activation.id);

            if (error) {
                console.error(`[ElegeSync] Error fetching channel links for "${activationLabel}":`, error.message);
                return;
            }

            // Sync ALL channel kinds (not just social)
            const channels = (links || []).filter(l => l.elege_channel_id);

            if (channels.length === 0) return;

            // Group by kind for logging
            const kindCounts: Record<string, number> = {};
            channels.forEach(c => { const k = c.channel_kind || 'unknown'; kindCounts[k] = (kindCounts[k] || 0) + 1; });
            console.log(`[ElegeSync] Syncing ${channels.length} channel(s) for "${activationLabel}":`, JSON.stringify(kindCounts));

            for (const link of channels) {
                try {
                    await this.fetchAndStoreChannelPosts(link.elege_channel_id, link.channel_kind, link.channel_title, activation);
                } catch (err: any) {
                    console.error(`[ElegeSync] Failed to sync channel ${link.channel_title} (${link.elege_channel_id}):`, err.message);
                }
            }
        } catch (err: any) {
            console.error(`[ElegeSync] syncChannels error for "${activationLabel}":`, err.message);
        }
    }

    /**
     * Fetch latest posts from a specific Elege channel and store in intelligence_feed.
     */
    private async fetchAndStoreChannelPosts(
        channelId: number,
        channelKind: string,
        channelTitle: string,
        activation: any
    ) {
        try {
            // Get watermark for incremental sync
            const watermark = await this.watermarkService.get(
                activation.id, 'elege_channels', String(channelId)
            );
            const startDate = this.watermarkService.getStartDate(watermark, 48); // 48h fallback

            const url = `${this.apiBaseUrl}/analytics/mentions/latest?channel_id=${channelId}&limit=30&start_date=${startDate}`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                },
                timeout: 30000,
            });

            const data = response.data;
            const mentions = data.mentions || data.data || [];

            console.log(`[ElegeSync] Channel ${channelTitle} (${channelKind}): ${mentions.length} mentions found`);

            if (mentions.length === 0) return;

            // ── Group mentions by post.id to avoid duplicates ──
            const mentionsByPostId = new Map<number, any[]>();
            for (const item of mentions) {
                if (!item.post?.id) continue;
                const arr = mentionsByPostId.get(item.post.id) || [];
                arr.push(item);
                mentionsByPostId.set(item.post.id, arr);
            }

            console.log(`[ElegeSync] Channel ${channelTitle}: grouped ${mentions.length} mentions into ${mentionsByPostId.size} unique posts`);

            // Pre-fetch full post data
            const uniquePostIds = Array.from(mentionsByPostId.keys());
            const postCache: Record<number, any> = {};

            if (uniquePostIds.length > 0) {
                const postResults = await Promise.allSettled(
                    uniquePostIds.map(pid => this.fetchFullPost(pid))
                );
                postResults.forEach((result, idx) => {
                    if (result.status === 'fulfilled' && result.value) {
                        postCache[uniquePostIds[idx]] = result.value;
                    }
                });
            }

            let newInserts = 0;
            let skippedDuplicates = 0;
            let mergedMentions = 0;
            let newestItemDate: Date | null = null;

            // ── Batch dedup: check all post IDs at once instead of 1-by-1 ──
            const allPostIds = Array.from(mentionsByPostId.keys()).map(String);
            const existingPostIds = new Set<string>();
            if (allPostIds.length > 0) {
                for (let i = 0; i < allPostIds.length; i += 50) {
                    const batch = allPostIds.slice(i, i + 50);
                    const { data: rows } = await this.supabase
                        .from('intelligence_feed')
                        .select('classification_metadata->>elege_post_id')
                        .eq('activation_id', activation.id)
                        .in('classification_metadata->>elege_post_id', batch);
                    if (rows) {
                        rows.forEach((r: any) => {
                            const pid = r.elege_post_id || r['classification_metadata->>elege_post_id'];
                            if (pid) existingPostIds.add(String(pid));
                        });
                    }
                }
            }

            // In-batch dedup safety net
            const processedPostIds = new Set<number>();

            for (const [postId, groupedItems] of mentionsByPostId) {
                const item = groupedItems[0];
                const post = item.post;

                if (groupedItems.length > 1) {
                    mergedMentions += groupedItems.length - 1;
                }

                // In-batch dedup
                if (processedPostIds.has(postId)) {
                    skippedDuplicates++;
                    continue;
                }

                // Track newest item date for watermark
                const itemDate = new Date(groupedItems[0].created_at || Date.now());
                if (!newestItemDate || itemDate > newestItemDate) newestItemDate = itemDate;

                const fullPost = postCache[post.id] || {};
                const realUrl = fullPost.url || post.url || null;
                const uniqueUrl = realUrl || `elegeai-channel-${channelId}-post-${post.id}`;

                // Dedup Layer 1: batch check by elege_post_id (already resolved above)
                if (existingPostIds.has(String(post.id))) {
                    skippedDuplicates++; processedPostIds.add(postId); continue;
                }

                // Dedup Layer 2: by URL
                if (realUrl && realUrl.length >= 5) {
                    const { data: existing } = await this.supabase
                        .from('intelligence_feed')
                        .select('id')
                        .eq('url', realUrl)
                        .limit(1)
                        .maybeSingle();

                    if (existing) { skippedDuplicates++; processedPostIds.add(postId); continue; }
                }

                // Dedup Layer 3: by title within activation
                const postTitle = (post.title || fullPost.title || '').trim();
                if (postTitle && postTitle !== 'Sem título') {
                    const { data: titleMatch } = await this.supabase
                        .from('intelligence_feed')
                        .select('id')
                        .eq('title', postTitle)
                        .eq('activation_id', activation.id)
                        .limit(1)
                        .maybeSingle();

                    if (titleMatch) { skippedDuplicates++; processedPostIds.add(postId); continue; }
                }

                const sourceType = this.mapSourceType(channelKind);

                // ── Merge person data from all mentions of this post ──
                const allDetectedEntities: string[] = [];
                const allPerEntityAnalysis: any[] = [];
                const allKeywords = new Set<string>([activation.name, channelTitle]);
                let worstRiskScore = 0;
                let worstSentiment = 'neutral';

                for (const mentionItem of groupedItems) {
                    const { sentiment: mSentiment, riskScore: mRisk } = this.mapSentiment(mentionItem.sentiment);
                    if (mRisk > worstRiskScore) {
                        worstRiskScore = mRisk;
                        worstSentiment = mSentiment;
                    }
                    if (mentionItem.person?.name) {
                        allDetectedEntities.push(mentionItem.person.name);
                        allKeywords.add(mentionItem.person.name);
                        allPerEntityAnalysis.push({
                            entity_name: mentionItem.person.name,
                            entity_id: null,
                            sentiment: mSentiment,
                            context: mentionItem.subject || '',
                            tone: mSentiment === 'negative' ? 'crítico' : mSentiment === 'positive' ? 'elogioso' : 'neutro',
                        });
                    }
                }

                const fullContent = fullPost.content || post.content || '';
                const summary = item.subject || fullPost.summary || (fullContent ? fullContent.substring(0, 300) : null) || post.title || 'Sem resumo';
                const contentText = fullContent || item.subject || post.title || '';
                const keywords = Array.from(allKeywords);

                const { error: insertError } = await this.supabase
                    .from('intelligence_feed')
                    .insert({
                        title: post.title || fullPost.title || 'Sem título',
                        summary,
                        content: contentText,
                        source: channelTitle,
                        source_type: sourceType,
                        sentiment: worstSentiment,
                        risk_score: worstRiskScore,
                        url: uniqueUrl,
                        keywords,
                        activation_id: activation.id,
                        status: 'pending',
                        created_at: item.created_at || fullPost.published_at || new Date().toISOString(),
                        published_at: item.created_at || fullPost.published_at || new Date().toISOString(),
                        classification_metadata: {
                            assets: fullPost.assets || post.assets || [],
                            channel_kind: channelKind,
                            elege_channel_id: channelId,
                            elege_post_id: post.id,
                            elege_mention_id: item.id,
                            source_name: channelTitle,
                            author_username: fullPost.author_username || item.author_username || null,
                            content_type_detected: sourceType,
                            keywords,
                            detected_entities: [...new Set(allDetectedEntities)],
                            per_entity_analysis: allPerEntityAnalysis,
                        },
                    });

                if (insertError) {
                    console.error(`[ElegeSync] Error inserting channel post ${post.id}:`, insertError.message);
                } else {
                    processedPostIds.add(postId);
                    newInserts++;
                }
            }

            console.log(`[ElegeSync] Channel ${channelTitle}: ${newInserts} inserted, ${skippedDuplicates} duplicates skipped, ${mergedMentions} mentions merged`);

            // Update watermark after successful sync
            if (newInserts > 0 || skippedDuplicates > 0) {
                await this.watermarkService.set(activation.id, 'elege_channels', {
                    sourceKey: String(channelId),
                    lastItemDate: newestItemDate || new Date(),
                });
            }

        } catch (error: any) {
            if (error.response?.status === 404 || error.response?.status === 400) {
                console.log(`[ElegeSync] Channel ${channelTitle} (${channelId}): API returned ${error.response.status}, skipping`);
            } else {
                throw error;
            }
        }
    }

    private async fetchAndStoreMentions(personId: number, activation: any) {
        try {
            // Get watermark for incremental sync
            const watermark = await this.watermarkService.get(
                activation.id, 'elege_mentions', String(personId)
            );
            const startDate = this.watermarkService.getStartDate(watermark, 48); // 48h fallback

            const url = `${this.apiBaseUrl}/analytics/mentions/latest?person_id=${personId}&limit=50&start_date=${startDate}`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                },
                timeout: 30000,
            });

            const data = response.data;
            const mentions = data.mentions || data.data || [];

            console.log(`[ElegeSync] Mentions endpoint returned ${mentions.length} items for person_id ${personId}`);

            if (mentions.length === 0) {
                console.log(`[ElegeSync] No mentions found for person_id ${personId}`);
                return;
            }

            // ── Group mentions by post.id to avoid duplicates ──
            // The API returns one mention per person cited in a post.
            // A single TV segment can mention multiple people → N mentions with same post.id.
            // We group them and merge person data into a single feed item.
            const mentionsByPostId = new Map<number, any[]>();
            for (const item of mentions) {
                if (!item.post?.id) continue;
                const arr = mentionsByPostId.get(item.post.id) || [];
                arr.push(item);
                mentionsByPostId.set(item.post.id, arr);
            }

            console.log(`[ElegeSync] Grouped ${mentions.length} mentions into ${mentionsByPostId.size} unique posts`);

            // Pre-fetch full post data in parallel (batch of unique post IDs)
            const uniquePostIds = Array.from(mentionsByPostId.keys());
            const postCache: Record<number, any> = {};

            if (uniquePostIds.length > 0) {
                console.log(`[ElegeSync] Fetching full data for ${uniquePostIds.length} unique posts...`);
                const postResults = await Promise.allSettled(
                    uniquePostIds.map(pid => this.fetchFullPost(pid))
                );
                postResults.forEach((result, idx) => {
                    if (result.status === 'fulfilled' && result.value) {
                        postCache[uniquePostIds[idx]] = result.value;
                    }
                });
                console.log(`[ElegeSync] Successfully fetched ${Object.keys(postCache).length}/${uniquePostIds.length} posts`);
            }

            let newInserts = 0;
            let skippedDuplicates = 0;
            let mergedMentions = 0;
            let insertErrors = 0;
            let newestItemDate: Date | null = null;

            // ── Batch dedup: check all post IDs at once instead of 1-by-1 ──
            const allPostIds = Array.from(mentionsByPostId.keys()).map(String);
            const existingPostIds = new Set<string>();
            if (allPostIds.length > 0) {
                for (let i = 0; i < allPostIds.length; i += 50) {
                    const batch = allPostIds.slice(i, i + 50);
                    const { data: rows } = await this.supabase
                        .from('intelligence_feed')
                        .select('classification_metadata->>elege_post_id')
                        .eq('activation_id', activation.id)
                        .in('classification_metadata->>elege_post_id', batch);
                    if (rows) {
                        rows.forEach((r: any) => {
                            const pid = r.elege_post_id || r['classification_metadata->>elege_post_id'];
                            if (pid) existingPostIds.add(String(pid));
                        });
                    }
                }
                if (existingPostIds.size > 0) {
                    console.log(`[ElegeSync] Batch dedup: ${existingPostIds.size}/${allPostIds.length} posts already exist`);
                }
            }

            // In-batch dedup safety net: tracks post IDs already inserted in this cycle
            const processedPostIds = new Set<number>();

            for (const [postId, groupedItems] of mentionsByPostId) {
                // Use the first mention as the primary item for post-level data
                const item = groupedItems[0];
                const post = item.post;
                const channel = item.channel || { title: 'Unknown', kind: 'news' };

                // Track merged mentions (beyond the first)
                if (groupedItems.length > 1) {
                    mergedMentions += groupedItems.length - 1;
                }

                // In-batch dedup: skip if already processed in this sync cycle
                if (processedPostIds.has(postId)) {
                    skippedDuplicates++;
                    continue;
                }

                // Track newest item date for watermark
                const itemDate = new Date(item.created_at || Date.now());
                if (!newestItemDate || itemDate > newestItemDate) newestItemDate = itemDate;

                // Enrich post with full data from /api/posts/:id
                const fullPost = postCache[post.id] || {};

                // Resolve real URL: prefer full post URL, then mention-based fallback
                const realUrl = fullPost.url || post.url || null;
                const uniqueUrl = realUrl || `elegeai-mention-${item.id || post.id}`;

                // Dedup Layer 1: batch check by elege_post_id (already resolved above)
                if (existingPostIds.has(String(post.id))) {
                    skippedDuplicates++;
                    processedPostIds.add(postId);
                    continue;
                }

                // Dedup Layer 2: by real URL (skip synthetic URLs)
                if (realUrl && realUrl.length >= 5) {
                    const { data: existing } = await this.supabase
                        .from('intelligence_feed')
                        .select('id')
                        .eq('url', realUrl)
                        .limit(1)
                        .maybeSingle();

                    if (existing) {
                        skippedDuplicates++;
                        processedPostIds.add(postId);
                        continue;
                    }
                }

                // Dedup Layer 3: by title within same activation
                // (catches items with different synthetic URLs but identical content)
                const postTitle = (post.title || fullPost.title || '').trim();
                if (postTitle && postTitle !== 'Sem título') {
                    const { data: titleMatch } = await this.supabase
                        .from('intelligence_feed')
                        .select('id')
                        .eq('title', postTitle)
                        .eq('activation_id', activation.id)
                        .limit(1)
                        .maybeSingle();

                    if (titleMatch) {
                        skippedDuplicates++;
                        processedPostIds.add(postId);
                        continue;
                    }
                }

                // Map Source Type & Sentiment
                const sourceType = this.mapSourceType(channel.kind);

                // ── Merge person data from all mentions of this post ──
                const allPersonNames: string[] = [];
                const allDetectedEntities: string[] = [];
                const allPerEntityAnalysis: any[] = [];
                const allKeywords = new Set<string>([activation.name]);

                // Use the worst (highest risk) sentiment across all mentions
                let worstRiskScore = 0;
                let worstSentiment = 'neutral';

                for (const mentionItem of groupedItems) {
                    const { sentiment: mSentiment, riskScore: mRisk } = this.mapSentiment(mentionItem.sentiment);
                    if (mRisk > worstRiskScore) {
                        worstRiskScore = mRisk;
                        worstSentiment = mSentiment;
                    }

                    if (mentionItem.person?.name) {
                        allPersonNames.push(mentionItem.person.name);
                        allDetectedEntities.push(mentionItem.person.name);
                        if (mentionItem.person.alias) allDetectedEntities.push(mentionItem.person.alias);
                        allKeywords.add(mentionItem.person.name);

                        allPerEntityAnalysis.push({
                            entity_name: mentionItem.person.name,
                            entity_id: null,
                            elege_person_id: personId,
                            sentiment: mSentiment,
                            context: mentionItem.subject || '',
                            tone: mSentiment === 'negative' ? 'crítico' : mSentiment === 'positive' ? 'elogioso' : 'neutro',
                        });
                    }
                }

                // Build rich content from full post
                const fullContent = fullPost.content || post.content || '';
                const channelName = channel.title || channel.name || 'Elege.AI API';

                // Summary: mention subject > post summary > truncated content > fallback
                const summary = item.subject
                    || fullPost.summary
                    || fullPost.subject
                    || (fullContent ? fullContent.substring(0, 300) : null)
                    || post.title
                    || 'Sem resumo';

                // Content: full post content > mention subject > title
                const contentText = fullContent || item.subject || post.title || '';

                // Keywords extraction
                if (fullPost.categories || post.categories) {
                    (fullPost.categories || post.categories).forEach((c: string) => allKeywords.add(c));
                }

                const keywords = Array.from(allKeywords);

                // Insert into intelligence_feed
                const { error: insertError } = await this.supabase
                    .from('intelligence_feed')
                    .insert({
                        title: post.title || fullPost.title || 'Sem título',
                        summary: summary,
                        content: contentText,
                        source: channelName,
                        source_type: sourceType,
                        sentiment: worstSentiment,
                        risk_score: worstRiskScore,
                        url: uniqueUrl,
                        keywords: keywords,
                        activation_id: activation.id,
                        status: 'pending',
                        created_at: item.created_at || fullPost.published_at || post.published_at || new Date().toISOString(),
                        published_at: item.created_at || fullPost.published_at || post.published_at || new Date().toISOString(),
                        classification_metadata: (() => {
                            const allAssets = fullPost.assets || post.assets || [];

                            // Extract frames and media assets
                            const frames = allAssets.filter((a: any) => a.kind === 'image' && a.name?.startsWith('frame_'));
                            const videoAsset = allAssets.find((a: any) => a.kind === 'video' || (a.media_type && a.media_type.startsWith('video')));
                            const audioAsset = allAssets.find((a: any) => a.kind === 'audio' || (a.media_type && a.media_type.startsWith('audio')));

                            // Estimate durations
                            const FRAME_INTERVAL = 10; // 10 seconds per frame
                            const videoDuration = videoAsset?.duration > 0
                                ? videoAsset.duration
                                : (frames.length > 0 ? frames.length * FRAME_INTERVAL : undefined);
                            const audioDuration = audioAsset?.duration > 0
                                ? audioAsset.duration
                                : (audioAsset?.file_size ? Math.round(audioAsset.file_size / 16000) : undefined);

                            const duration = videoDuration || audioDuration;

                            // Build timeline marks — one per entity/citation with individual sentiment
                            const timelineMarks: { position: number; sentiment: string; frameId: number; entityName?: string }[] = [];

                            if (duration && duration > 0) {
                                if (allPerEntityAnalysis.length > 0 && frames.length > 0) {
                                    // Distribute entity marks across the available frames
                                    const entityCount = allPerEntityAnalysis.length;
                                    const step = Math.max(1, Math.floor(frames.length / (entityCount + 1)));
                                    allPerEntityAnalysis.forEach((ea: any, i: number) => {
                                        const frameIdx = Math.min(step * (i + 1), frames.length - 1);
                                        timelineMarks.push({
                                            position: Math.round(frameIdx * FRAME_INTERVAL),
                                            sentiment: ea.sentiment || worstSentiment,
                                            frameId: frames[frameIdx]?.id || 0,
                                            entityName: ea.entity_name,
                                        });
                                    });
                                } else if (allPerEntityAnalysis.length > 0) {
                                    // Radio (no frames): distribute entity marks across the duration
                                    const entityCount = allPerEntityAnalysis.length;
                                    const step = duration / (entityCount + 1);
                                    allPerEntityAnalysis.forEach((ea: any, i: number) => {
                                        timelineMarks.push({
                                            position: Math.round(step * (i + 1)),
                                            sentiment: ea.sentiment || worstSentiment,
                                            frameId: 0,
                                            entityName: ea.entity_name,
                                        });
                                    });
                                } else if (frames.length > 0) {
                                    // No per-entity data: single mark at midpoint
                                    const midIdx = Math.floor(frames.length / 2);
                                    timelineMarks.push({
                                        position: Math.round(midIdx * FRAME_INTERVAL),
                                        sentiment: worstSentiment,
                                        frameId: frames[midIdx]?.id || 0,
                                    });
                                } else {
                                    // Radio without entity data: single mark at midpoint
                                    timelineMarks.push({
                                        position: Math.round(duration / 2),
                                        sentiment: worstSentiment,
                                        frameId: 0,
                                    });
                                }
                            }

                            return {
                                assets: allAssets,
                                frames: frames.length > 0 ? frames : undefined,
                                total_frames: frames.length > 0 ? frames.length : undefined,
                                video_duration: videoDuration,
                                audio_duration: audioDuration,
                                timeline_marks: timelineMarks.length > 0 ? timelineMarks : undefined,
                                channel_kind: channel.kind,
                                elege_mention_id: item.id,
                                elege_post_id: post.id,
                                elege_person_id: personId,
                                source_name: channelName,
                                person_name: allPersonNames.length > 0 ? allPersonNames[0] : undefined,
                                person_title: item.person?.title,
                                relevance: item.relevance,
                                participation: item.participation,
                                content_type_detected: sourceType,
                                detected_entities: [...new Set(allDetectedEntities)],
                                per_entity_analysis: allPerEntityAnalysis.filter(ea => ea.entity_name),
                                keywords: keywords,
                            };
                        })()
                    });

                if (insertError) {
                    insertErrors++;
                    console.error(`[ElegeSync] Error inserting mention ${item.id}:`, insertError.message);
                } else {
                    processedPostIds.add(postId);
                    newInserts++;
                }
            }

            console.log(`[ElegeSync] Sync result for ${activation.name}: ${newInserts} inserted, ${skippedDuplicates} duplicates skipped, ${mergedMentions} mentions merged, ${insertErrors} errors`);

            // Update watermark after successful sync
            if (newInserts > 0 || skippedDuplicates > 0) {
                await this.watermarkService.set(activation.id, 'elege_mentions', {
                    sourceKey: String(personId),
                    lastItemDate: newestItemDate || new Date(),
                });
            }

        } catch (error) {
            console.error(`[ElegeSync] fetchAndStoreMentions error:`, error);
        }
    }
}
