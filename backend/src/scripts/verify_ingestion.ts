
import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
// BullMQ requires a connection, ioredis instance
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const queue = new Queue('ingestion-queue', { connection });

async function checkIngestion() {
    console.log('--- Verifying Ingestion Status ---');
    console.log(`Redis: ${redisUrl}`);

    try {
        // 1. Check Queue Status
        const counts = await queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed');
        console.log('Queue Counts:', counts);

        if (counts.failed > 0) {
            const failed = await queue.getFailed(0, 5);
            console.log('\n❌ FAILED JOBS (Latest 5):');
            for (const job of failed) {
                console.log(`- Job ${job.id} (${job.name}):`);
                console.log(`  Reason: ${job.failedReason}`);
                console.log(`  Data: ${JSON.stringify(job.data)}`);
            }
        }

        if (counts.completed > 0) {
            console.log('\n✅ COMPLETED JOBS (Latest 1):');
            const completed = await queue.getCompleted(0, 1);
            if (completed.length > 0) {
                console.log(`- Job ${completed[0].id}: ${JSON.stringify(completed[0].returnvalue)}`);
            }
        }

        // 2. Check total count in DB
        const { count, error: countError } = await supabase
            .from('mentions')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error counting mentions:', countError.message);
        } else {
            console.log(`\nTotal Mentions in DB: ${count}`);
        }

        // 3. Check last 5 mentions
        const { data: mentions, error: fetchError } = await supabase
            .from('mentions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (fetchError) {
            console.error('Error fetching mentions:', fetchError.message);
        } else if (!mentions || mentions.length === 0) {
            console.log('No mentions found in Database.');
        } else {
            console.log('\nLatest Mentions in DB:');

            // Show only the latest 1
            if (mentions.length > 0) {
                const m = mentions[0];
                console.log(`- [${m.created_at}] ID: ${m.id}`);
                console.log(`  External ID: ${m.external_id}`);
                console.log(`  Source: ${m.source_id}`);
                console.log(`  Status: ${m.status || 'N/A'}`);
                console.log(`  Risk Score: ${m.risk_score !== null ? m.risk_score : 'PENDING'}`);
                console.log(`  Narrative: ${m.narrative || 'N/A'}`);
                if (m.classification_metadata) {
                    console.log(`  Reasoning: ${m.classification_metadata.reasoning || 'N/A'}`);
                    console.log(`  Provider: ${m.classification_metadata.provider || 'N/A'}`);
                }
                console.log('---');
            }
        }

    } catch (err: any) {
        console.error("Script Error:", err.message);
    } finally {
        await queue.close();
        await connection.quit();
    }
}

checkIngestion();
