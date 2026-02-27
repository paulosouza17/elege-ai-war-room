import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { supabase } from '../config/supabase';
import { IngestionPayload } from '../types/ingestion';
import { AIService } from '../services/aiService';

export const ingestionWorker = new Worker('ingestion-queue', async (job: Job<IngestionPayload>) => {
    console.log(`Job ${job.id} started processing...`);

    try {
        const payload = job.data;
        // Mock Client ID (In real app, derive from payload.source_id or API Key)
        // Using the Demo Client ID from migration
        const clientId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

        // 1. Persist Raw Mention
        const { data: mentionData, error: insertError } = await supabase
            .from('mentions')
            .insert({
                source_id: payload.source_id,
                external_id: payload.external_id,
                text: payload.text,
                url: payload.url,
                created_at: payload.published_at || new Date().toISOString(),
                metadata: payload.metadata || {},
                client_id: clientId
            })
            .select() // Return inserted data
            .single();

        if (insertError) {
            // Ignore Duplicate Key error (idempotency)
            if (insertError.code === '23505') {
                console.log(`Duplicate mention skipped: ${payload.external_id}`);
                return;
            }
            throw new Error(`Supabase Insert Error: ${insertError.message}`);
        }

        console.log(`Mention persisted: ${mentionData.id}`);

        // 2. Fetch AI Config for Client
        const { data: aiConfig, error: configError } = await supabase
            .from('ai_configs')
            .select('*')
            .eq('client_id', clientId)
            .eq('is_active', true)
            .single();

        if (configError || !aiConfig) {
            console.warn(`No active AI config found for client ${clientId}. Skipping analysis.`);
            return;
        }

        // 3. Perform AI Analysis
        console.log(`Analyzing with ${aiConfig.provider}...`);
        const aiService = new AIService(supabase, {
            provider: aiConfig.provider as any,
            apiKey: aiConfig.api_key,
            model: aiConfig.model
        });

        const analysis = await aiService.analyzeText(payload.text);

        // 4. Update Mention with Insights
        const { error: updateError } = await supabase
            .from('mentions')
            .update({
                theme: analysis.theme,
                sentiment: analysis.sentiment,
                narrative: analysis.narrative,
                risk_score: analysis.risk_score,
                classification_metadata: {
                    reasoning: analysis.reasoning,
                    provider: aiConfig.provider,
                    model: aiConfig.model,
                    analyzed_at: new Date().toISOString()
                }
            })
            .eq('id', mentionData.id);

        if (updateError) {
            console.error(`Failed to update mention with insights: ${updateError.message}`);
        } else {
            console.log(`Analysis complete for ${mentionData.id}. Risk Score: ${analysis.risk_score}`);
        }

    } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
    }

}, { connection: redisConnection });

ingestionWorker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

ingestionWorker.on('failed', (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
});
