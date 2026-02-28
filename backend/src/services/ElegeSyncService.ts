import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

export class ElegeSyncService {
    private supabase: SupabaseClient;
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private apiBaseUrl: string = (process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001') + '/api';
    private apiKey: string;
    private SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
        this.apiKey = process.env.ELEGEAI_API_TOKEN || '';

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
            console.log(`[ElegeSync] Activation "${activationLabel}" has no people_of_interest configured. Skipping.`);
            return;
        }

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

    private async fetchAndStoreMentions(personId: number, activation: any) {
        try {
            const url = `${this.apiBaseUrl}/analytics/mentions/latest?person_id=${personId}&limit=50&period=7d`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                },
                timeout: 30000,
            });

            const data = response.data;
            const mentions = data.data || data.mentions || [];

            console.log(`[ElegeSync] DEBUG: Mentions endpoint returned ${mentions.length} items for person_id ${personId}`);

            if (mentions.length === 0) {
                console.log(`[ElegeSync] No mentions found for person_id ${personId}`);
                return;
            }

            let newInserts = 0;
            let skippedDuplicates = 0;
            let insertErrors = 0;

            for (const item of mentions) {
                const post = item.post;
                const channel = item.channel || { title: 'Unknown', kind: 'news' };

                if (!post) continue;

                // Unique identifier — use mention id for uniqueness since post.id can repeat across people
                const postUrl = post.url || `elegeai-mention-${item.id || post.id}`;

                // Check if already exists in DB
                const { data: existing } = await this.supabase
                    .from('intelligence_feed')
                    .select('id')
                    .eq('url', postUrl)
                    .single();

                if (existing) {
                    skippedDuplicates++;
                    continue;
                }

                // Map Source Type — channel.kind from API
                let sourceType = 'portal';
                if (channel.kind === 'tv' || channel.kind === 2) sourceType = 'tv';
                else if (channel.kind === 'radio' || channel.kind === 3) sourceType = 'radio';
                else if (channel.kind === 'social' || channel.kind === 4) sourceType = 'social_media';

                // Map Sentiment & Risk — handle 'mixed' as neutral
                let sentiment = 'neutral';
                let riskScore = 50;

                if (item.sentiment === 'negative' || item.sentiment?.tone === 'negative') {
                    sentiment = 'negative';
                    riskScore = 75;
                } else if (item.sentiment === 'positive' || item.sentiment?.tone === 'positive') {
                    sentiment = 'positive';
                    riskScore = 20;
                } else if (item.sentiment === 'mixed') {
                    sentiment = 'neutral';
                    riskScore = 60;
                }

                // Use item.subject or post content for the summary/content
                const contentText = item.subject || post.content || post.title || '';
                const channelName = channel.title || channel.name || 'Elege.AI API';

                // Keywords extraction
                let keywords = [activation.name];
                if (post.categories) {
                    keywords = [...keywords, ...post.categories];
                }
                if (item.person?.name) {
                    keywords.push(item.person.name);
                }

                // Insert into intelligence_feed
                const { error: insertError } = await this.supabase
                    .from('intelligence_feed')
                    .insert({
                        title: post.title || 'Sem título',
                        summary: item.subject || post.summary || contentText.substring(0, 150) || 'Sem resumo',
                        content: contentText,
                        source: channelName,
                        source_type: sourceType,
                        sentiment: sentiment,
                        risk_score: riskScore,
                        url: postUrl,
                        keywords: keywords,
                        activation_id: activation.id,
                        status: 'pending',
                        created_at: item.created_at || post.published_at || new Date().toISOString(),
                        published_at: item.created_at || post.published_at || new Date().toISOString(),
                        classification_metadata: {
                            assets: post.assets || [],
                            channel_kind: channel.kind,
                            elege_mention_id: item.id,
                            elege_post_id: post.id,
                            source_name: channelName,
                            person_name: item.person?.name,
                            person_title: item.person?.title,
                            relevance: item.relevance,
                            participation: item.participation,
                            content_type_detected: sourceType
                        }
                    });

                if (insertError) {
                    insertErrors++;
                    console.error(`[ElegeSync] Error inserting mention ${item.id}:`, insertError.message);
                } else {
                    newInserts++;
                }
            }

            console.log(`[ElegeSync] Sync result for ${activation.name}: ${newInserts} inserted, ${skippedDuplicates} duplicates skipped, ${insertErrors} errors`);

        } catch (error) {
            console.error(`[ElegeSync] fetchAndStoreMentions error:`, error);
        }
    }
}
