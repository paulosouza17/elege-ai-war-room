import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';
import { SyncWatermarkService } from '../../services/SyncWatermarkService';
import axios from 'axios';

const TWITTER_API_BASE = 'https://api.x.com/2';

interface TwitterConfig {
    bearerToken: string;
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    accessTokenSecret?: string;
    searchTier?: string;
    defaultEndpoint?: string;
}

export class TwitterHandler implements NodeHandler {
    private watermarkService = new SyncWatermarkService(supabase);

    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger('[TwitterHandler] Starting Twitter/X data collection...');

        // 1. Load credentials from data_sources
        const config = await this.loadCredentials(context);
        if (!config) {
            return { success: false, error: 'Credenciais do Twitter não configuradas. Vá em Configurações → Integrações → X (Twitter) Oficial.' };
        }

        // 2. Determine operation
        const operation = node.data.twitterOperation || 'search_recent';
        const query = this.buildQuery(node, context);
        const maxResults = Math.min(node.data.twitterMaxResults || 10, 100);

        await context.logger(`[TwitterHandler] Operation: ${operation}, Query: "${query}", Max: ${maxResults}`);

        try {
            let result: any;

            switch (operation) {
                case 'search_recent':
                    result = await this.searchRecent(config, query, maxResults, context, context.activationId);
                    break;
                case 'search_all':
                    result = await this.searchAll(config, query, maxResults, context);
                    break;
                case 'user_timeline':
                    result = await this.userTimeline(config, node.data.twitterUserId || node.data.twitterUsername, maxResults, context);
                    break;
                case 'user_mentions':
                    result = await this.userMentions(config, node.data.twitterUserId, maxResults, context);
                    break;
                case 'user_lookup':
                    result = await this.userLookup(config, node.data.twitterUsername, context);
                    break;
                default:
                    result = await this.searchRecent(config, query, maxResults, context, context.activationId);
            }

            return result;
        } catch (error: any) {
            await context.logger(`[TwitterHandler] ❌ Error: ${error.message}`);
            return { success: false, error: `Twitter API Error: ${error.message}` };
        }
    }

    private async loadCredentials(context: ExecutionContext): Promise<TwitterConfig | null> {
        const { data, error } = await supabase
            .from('data_sources')
            .select('config, is_active')
            .ilike('name', '%Twitter%')
            .single();

        if (error || !data || !data.is_active) {
            await context.logger('[TwitterHandler] ⚠ Data source "X (Twitter) Oficial" not found or inactive.');
            return null;
        }

        const cfg = data.config;
        if (!cfg?.bearerToken) {
            await context.logger('[TwitterHandler] ⚠ Bearer Token not configured.');
            return null;
        }

        await context.logger(`[TwitterHandler] ✅ Credentials loaded. Tier: ${cfg.searchTier || 'basic'}`);
        return cfg as TwitterConfig;
    }

    private resolveTemplateVars(text: string, context: ExecutionContext): string {
        // Resolve {{nodeId.path}} and {nodeId.path} patterns from upstream node outputs
        return text.replace(/\{\{?([^{}]+)\}\}?/g, (match, varPath) => {
            const parts = varPath.trim().split('.');
            const nodeId = parts[0];
            const output = context.nodeOutputs[nodeId];
            if (!output?.data) return '';

            let value: any = output.data;
            for (let i = 1; i < parts.length; i++) {
                if (value == null) return '';
                value = value[parts[i]];
            }

            if (value == null) return '';
            if (Array.isArray(value)) return value.join(', ');
            return String(value);
        });
    }

    private buildQuery(node: any, context: ExecutionContext): string {
        // Priority: explicit query > upstream keywords > node keywords > activation keywords
        if (node.data.twitterQuery) {
            const resolved = this.resolveTemplateVars(node.data.twitterQuery, context).trim();
            if (resolved && !resolved.includes('{')) {
                // Ensure -is:retweet is always present
                const query = resolved.includes('-is:retweet') ? resolved : `${resolved} -is:retweet`;
                return query.substring(0, 512);
            }
            // If still has unresolved vars, fall through to keyword builder
        }

        // Gather keywords from upstream nodes
        const keywords: string[] = [];
        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (output?.data?.keywords && Array.isArray(output.data.keywords)) {
                keywords.push(...output.data.keywords);
            }
            // Also grab people_of_interest from trigger
            if (output?.data?.people_of_interest && Array.isArray(output.data.people_of_interest)) {
                keywords.push(...output.data.people_of_interest);
            }
        }

        if (node.data.keywords) {
            let raw = node.data.keywords;
            // Resolve template vars in keywords field too
            if (typeof raw === 'string' && raw.includes('{')) {
                raw = this.resolveTemplateVars(raw, context);
            }
            let nodeKws: string[] = [];
            if (Array.isArray(raw)) {
                nodeKws = raw;
            } else if (typeof raw === 'string') {
                const trimmed = raw.trim();
                if (trimmed.startsWith('[')) {
                    try { nodeKws = JSON.parse(trimmed); } catch { nodeKws = trimmed.split(','); }
                } else {
                    nodeKws = trimmed.split(',');
                }
            }
            keywords.push(...nodeKws.map((k: any) => String(k).trim()).filter(Boolean));
        }

        // Fallback: use activation keywords and people_of_interest
        if (keywords.length === 0) {
            for (const key in context.nodeOutputs) {
                const output = context.nodeOutputs[key];
                if (output?.data?.activation_keywords) {
                    keywords.push(...(Array.isArray(output.data.activation_keywords) ? output.data.activation_keywords : []));
                }
                if (output?.data?.activation_people) {
                    keywords.push(...(Array.isArray(output.data.activation_people) ? output.data.activation_people : []));
                }
            }
        }

        if (keywords.length === 0) return 'política Brasil -is:retweet';

        // Sanitize: remove quotes, special chars that break Twitter query
        const sanitized = [...new Set(keywords)]
            .map(k => k.replace(/["""'']/g, '').replace(/[()[\]{}]/g, '').trim())
            .filter(k => k.length >= 2)
            .slice(0, 10); // Max 10 terms to avoid query too long

        if (sanitized.length === 0) return 'política Brasil -is:retweet';

        // Build OR query — keep under 512 chars (Basic tier limit)
        let query = sanitized.map(k => `"${k}"`).join(' OR ');
        query = `(${query}) lang:pt -is:retweet`;

        if (query.length > 512) {
            // Trim keywords until under limit
            let trimmed = sanitized;
            while (trimmed.length > 1) {
                trimmed = trimmed.slice(0, -1);
                query = `(${trimmed.map(k => `"${k}"`).join(' OR ')}) lang:pt -is:retweet`;
                if (query.length <= 512) break;
            }
        }

        return query;
    }

    // ────────────── API Methods ──────────────

    private async searchRecent(config: TwitterConfig, query: string, maxResults: number, context: ExecutionContext, activationId?: string): Promise<NodeOutput> {
        // Twitter API v2 requires max_results between 10-100
        const safeMax = Math.max(10, Math.min(100, maxResults));

        const params = new URLSearchParams({
            query,
            max_results: String(safeMax),
            'tweet.fields': 'created_at,public_metrics,author_id,lang,source,referenced_tweets,note_tweet',
            'user.fields': 'name,username,profile_image_url,verified,public_metrics',
            'expansions': 'author_id,referenced_tweets.id',
        });

        // Incremental sync: use since_id or start_time from watermark
        if (activationId) {
            const watermark = await this.watermarkService.get(activationId, 'twitter', query.substring(0, 100));
            if (watermark?.lastItemId) {
                params.set('since_id', watermark.lastItemId);
                await context.logger(`[TwitterHandler] 🗓 Incremental: since_id=${watermark.lastItemId}`);
            } else if (watermark?.lastSyncAt) {
                // Twitter requires start_time to be at least 10 seconds ago and within last 7 days
                const startTime = this.watermarkService.getStartTime(watermark, 24);
                params.set('start_time', startTime);
                await context.logger(`[TwitterHandler] 🗓 Incremental: start_time=${startTime}`);
            }
        }

        const response = await this.apiGet(`/tweets/search/recent?${params}`, config, context);
        const result = await this.formatTweetResponse(response, 'search_recent', context);

        // Save watermark with the newest tweet ID
        if (activationId && result.success && result.data?.items?.length > 0) {
            const newestTweet = result.data.items[0]; // Twitter returns newest first
            await this.watermarkService.set(activationId, 'twitter', {
                sourceKey: query.substring(0, 100),
                lastItemId: newestTweet.id,
                lastItemDate: new Date(newestTweet.published_at),
            });
        }

        return result;
    }

    private async searchAll(config: TwitterConfig, query: string, maxResults: number, context: ExecutionContext): Promise<NodeOutput> {
        if (config.searchTier === 'basic') {
            await context.logger('[TwitterHandler] ⚠ search_all requires Pro or Enterprise. Fallback to search_recent.');
            return this.searchRecent(config, query, maxResults, context);
        }

        const params = new URLSearchParams({
            query,
            max_results: String(maxResults),
            'tweet.fields': 'created_at,public_metrics,author_id,lang,source,referenced_tweets,note_tweet',
            'user.fields': 'name,username,profile_image_url,verified',
            'expansions': 'author_id,referenced_tweets.id',
        });

        const response = await this.apiGet(`/tweets/search/all?${params}`, config, context);
        return this.formatTweetResponse(response, 'search_all', context);
    }

    private async userTimeline(config: TwitterConfig, userIdOrUsername: string, maxResults: number, context: ExecutionContext): Promise<NodeOutput> {
        let userId = userIdOrUsername;

        // If username was passed, resolve to ID first
        if (userId && !userId.match(/^\d+$/)) {
            const lookup = await this.userLookup(config, userId, context);
            if (lookup.success && lookup.data?.user_id) {
                userId = lookup.data.user_id;
            } else {
                return { success: false, error: `User not found: ${userIdOrUsername}` };
            }
        }

        const params = new URLSearchParams({
            max_results: String(maxResults),
            'tweet.fields': 'created_at,public_metrics,source,conversation_id,referenced_tweets,note_tweet',
            'expansions': 'referenced_tweets.id',
            exclude: 'retweets',
        });

        const response = await this.apiGet(`/users/${userId}/tweets?${params}`, config, context);
        return this.formatTweetResponse(response, 'user_timeline', context);
    }

    private async userMentions(config: TwitterConfig, userId: string, maxResults: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!userId) return { success: false, error: 'User ID é obrigatório para buscar menções.' };

        const params = new URLSearchParams({
            max_results: String(maxResults),
            'tweet.fields': 'created_at,public_metrics,author_id,referenced_tweets,note_tweet',
            'user.fields': 'name,username',
            'expansions': 'author_id,referenced_tweets.id',
        });

        const response = await this.apiGet(`/users/${userId}/mentions?${params}`, config, context);
        return this.formatTweetResponse(response, 'user_mentions', context);
    }

    private async userLookup(config: TwitterConfig, username: string, context: ExecutionContext): Promise<NodeOutput> {
        const cleanUsername = username.replace('@', '');
        const params = new URLSearchParams({
            'user.fields': 'name,username,profile_image_url,verified,public_metrics,description,created_at,location',
        });

        const response = await this.apiGet(`/users/by/username/${cleanUsername}?${params}`, config, context);

        if (response?.data) {
            const user = response.data;
            return {
                success: true,
                data: {
                    user_id: user.id,
                    name: user.name,
                    username: user.username,
                    description: user.description || '',
                    verified: user.verified || false,
                    followers: user.public_metrics?.followers_count || 0,
                    following: user.public_metrics?.following_count || 0,
                    tweet_count: user.public_metrics?.tweet_count || 0,
                    profile_image: user.profile_image_url || '',
                    location: user.location || '',
                    created_at: user.created_at || '',
                    _variables: {
                        user_id: { label: 'User ID', type: 'text' },
                        name: { label: 'Nome', type: 'text' },
                        username: { label: 'Username', type: 'text' },
                        followers: { label: 'Seguidores', type: 'text' },
                        tweet_count: { label: 'Total Tweets', type: 'text' },
                    }
                }
            };
        }

        return { success: false, error: `Usuário @${cleanUsername} não encontrado.` };
    }

    // ────────────── HTTP Client ──────────────

    private async apiGet(path: string, config: TwitterConfig, context: ExecutionContext): Promise<any> {
        const url = `${TWITTER_API_BASE}${path}`;
        await context.logger(`[TwitterHandler] GET ${url.substring(0, 250)}`);

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${config.bearerToken}`,
            },
            timeout: 30000,
            validateStatus: () => true,
        });

        if (response.status === 401) {
            throw new Error('Bearer Token inválido ou expirado. Verifique suas credenciais.');
        }
        if (response.status === 403) {
            throw new Error('Acesso negado. Verifique o nível de acesso da sua aplicação no Developer Portal.');
        }
        if (response.status === 429) {
            const resetTime = response.headers['x-rate-limit-reset'];
            throw new Error(`Rate limit excedido. Reset em: ${resetTime ? new Date(Number(resetTime) * 1000).toLocaleString() : 'desconhecido'}`);
        }
        if (response.status >= 400) {
            // Twitter API v2 returns { errors: [{ parameters: {}, message: "" }], title, detail, type }
            const body = response.data || {};
            const errors = body.errors || [];
            const errMsgs = errors.map((e: any) => `${e.message || ''} (params: ${JSON.stringify(e.parameters || {})})`).join('; ');
            const detail = errMsgs || body.detail || body.title || JSON.stringify(body);
            await context.logger(`[TwitterHandler] ❌ API ${response.status}: ${detail}`);
            throw new Error(`API retornou ${response.status}: ${detail}`);
        }

        return response.data;
    }

    // ────────────── Response Formatter ──────────────

    private async formatTweetResponse(apiResponse: any, operation: string, context: ExecutionContext): Promise<NodeOutput> {
        const tweets = apiResponse?.data || [];
        const users = apiResponse?.includes?.users || [];
        const refTweets = apiResponse?.includes?.tweets || [];
        const meta = apiResponse?.meta || {};

        // Build user lookup map
        const userMap: Record<string, any> = {};
        for (const u of users) {
            userMap[u.id] = u;
        }

        // Build referenced-tweet lookup map (for RTs and quotes)
        const refTweetMap: Record<string, any> = {};
        for (const rt of refTweets) {
            refTweetMap[rt.id] = rt;
        }

        // Normalize tweets into standard items
        const items = tweets.map((tweet: any) => {
            const author = userMap[tweet.author_id] || {};
            const metrics = tweet.public_metrics || {};

            // Reconstruct full text for RTs/quotes where the API truncates
            const fullText = this.reconstructFullText(tweet, refTweetMap);

            return {
                id: tweet.id,
                text: fullText,
                title: fullText.substring(0, 100) + (fullText.length > 100 ? '...' : ''),
                content: fullText,
                url: `https://x.com/${author.username || 'i'}/status/${tweet.id}`,
                published_at: tweet.created_at || new Date().toISOString(),
                source: 'twitter',
                source_type: 'social_media',
                author_name: author.name || 'Unknown',
                author_username: author.username || '',
                author_verified: author.verified || false,
                author_followers: author.public_metrics?.followers_count || 0,
                author_profile_image: author.profile_image_url || '',
                likes: metrics.like_count || 0,
                retweets: metrics.retweet_count || 0,
                replies: metrics.reply_count || 0,
                impressions: metrics.impression_count || 0,
                engagement: (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0),
                lang: tweet.lang || 'pt',
                conversation_id: tweet.conversation_id || '',
                is_reply: !!tweet.in_reply_to_user_id,
                referenced_tweets: tweet.referenced_tweets || [],
            };
        });

        await context.logger(`[TwitterHandler] ✅ ${items.length} tweets collected (${operation}). Next token: ${meta.next_token ? 'yes' : 'no'}`);

        // DEDUP: Filter out tweets already in intelligence_feed for this activation
        let filteredItems = items;
        if (items.length > 0 && context.activationId) {
            const tweetUrls = items.map((t: any) => t.url).filter(Boolean);
            if (tweetUrls.length > 0) {
                const { data: existingRows } = await supabase
                    .from('intelligence_feed')
                    .select('url')
                    .in('url', tweetUrls)
                    .eq('activation_id', context.activationId);

                if (existingRows && existingRows.length > 0) {
                    const existingUrls = new Set(existingRows.map((r: any) => r.url));
                    filteredItems = items.filter((t: any) => !existingUrls.has(t.url));
                    const skipped = items.length - filteredItems.length;
                    if (skipped > 0) {
                        await context.logger(`[TwitterHandler] ⏭ Dedup: skipped ${skipped} already-ingested tweet(s), keeping ${filteredItems.length}.`);
                    }
                }
            }
        }

        return {
            success: true,
            data: {
                items: filteredItems,
                count: filteredItems.length,
                total_results: meta.result_count || items.length,
                next_token: meta.next_token || null,
                operation,
                source: 'twitter',
                source_type: 'social_media',
                summary: `Coletados ${items.length} tweets via ${operation}`,
                _variables: {
                    items: { label: 'Tweets', type: 'list' },
                    count: { label: 'Quantidade', type: 'text' },
                    total_results: { label: 'Total Resultados', type: 'text' },
                    next_token: { label: 'Next Token (Paginação)', type: 'text' },
                    operation: { label: 'Operação', type: 'text' },
                    summary: { label: 'Resumo', type: 'text' },
                }
            }
        };
    }

    // ────────────── Full Text Reconstruction ──────────────

    /**
     * Twitter API v2 truncates RT text at ~140 chars ("RT @user: text…").
     * This method reconstructs the full text by:
     * 1. Using note_tweet.text for long-form tweets (>280 chars)
     * 2. Looking up the referenced tweet for retweets (type: "retweeted")
     * 3. Appending quoted tweet text for quote tweets (type: "quoted")
     */
    private reconstructFullText(tweet: any, refTweetMap: Record<string, any>): string {
        // 1. Long-form tweet (note_tweet has full text when >280 chars)
        if (tweet.note_tweet?.text) {
            return tweet.note_tweet.text;
        }

        const refs = tweet.referenced_tweets || [];
        if (refs.length === 0) return tweet.text;

        // 2. Retweet: the text is truncated as "RT @user: text…"
        const retweetRef = refs.find((r: any) => r.type === 'retweeted');
        if (retweetRef) {
            const original = refTweetMap[retweetRef.id];
            if (original) {
                // Use note_tweet from the referenced tweet if available (long RT)
                const originalText = original.note_tweet?.text || original.text;
                // Reconstruct as "RT @author: <full text>"
                // Extract the RT prefix to keep author attribution
                const rtMatch = tweet.text.match(/^RT @(\w+): /);
                if (rtMatch) {
                    return `RT @${rtMatch[1]}: ${originalText}`;
                }
                return originalText;
            }
        }

        // 3. Quote tweet: append the quoted tweet's text
        const quoteRef = refs.find((r: any) => r.type === 'quoted');
        if (quoteRef) {
            const quoted = refTweetMap[quoteRef.id];
            if (quoted) {
                const quotedText = quoted.note_tweet?.text || quoted.text;
                // Remove the trailing URL (Twitter appends the quoted tweet URL)
                const cleanText = tweet.text.replace(/\s*https:\/\/t\.co\/\w+\s*$/, '');
                return `${cleanText}\n\n[Citação]: ${quotedText}`;
            }
        }

        return tweet.text;
    }
}
