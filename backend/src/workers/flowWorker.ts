import { supabase } from '../config/supabase';
import axios from 'axios';
import { FileExtractor } from '../services/FileExtractor';
import { AIService } from '../services/aiService';

const POLL_INTERVAL = 3000; // 3 seconds (faster pickup for parallel children)
const MAX_CONCURRENT = 5; // Max concurrent executions per poll cycle

console.log("🚀 Flow Worker Started. Polling for pending executions...");

// Global Error Handlers to prevent crash
process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    // Continue running if possible, or restart gracefully
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
});

const poll = async () => {
    try {
        // Claim multiple executions concurrently
        const claims = await Promise.all(
            Array.from({ length: MAX_CONCURRENT }, () =>
                supabase.rpc('claim_pending_execution')
            )
        );

        const executions = claims
            .filter(r => !r.error && r.data && r.data.length > 0)
            .flatMap(r => r.data);

        if (executions.length > 0) {
            console.log(`✅ Claimed ${executions.length} execution(s). Processing concurrently...`);

            // Process ALL claimed executions — use allSettled so one crash doesn't kill others
            const results = await Promise.allSettled(
                executions.map(execution => processExecution(execution))
            );

            for (let i = 0; i < results.length; i++) {
                if (results[i].status === 'rejected') {
                    const reason = (results[i] as PromiseRejectedResult).reason;
                    console.error(`❌ Execution ${executions[i]?.id} rejected:`, reason?.message || reason);
                    // Force-fail the execution if processExecution didn't catch it
                    try {
                        await supabase
                            .from('flow_executions')
                            .update({
                                status: 'failed',
                                completed_at: new Date().toISOString(),
                                error_message: `Worker crash: ${reason?.message || 'Unknown error'}`,
                            })
                            .eq('id', executions[i]?.id)
                            .eq('status', 'running');
                    } catch { /* ignore */ }
                }
            }
        }

        // Periodic cleanup: fail executions stuck in 'running' for > 10 minutes
        if (Math.random() < 0.05) { // ~5% of polls = every ~1 minute
            const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
            const { data: stale } = await supabase
                .from('flow_executions')
                .update({
                    status: 'failed',
                    completed_at: new Date().toISOString(),
                    error_message: 'Execution timed out (stuck in running for >10 minutes)',
                })
                .eq('status', 'running')
                .lt('created_at', tenMinAgo)
                .select('id');

            if (stale && stale.length > 0) {
                console.log(`🧹 Cleaned up ${stale.length} stale execution(s)`);
            }
        }
    } catch (err) {
        console.error("Critical Worker Error (poll loop):", err);
    }
};

// Helper: Broadcast Log to Realtime (Throttled)
let lastLogTime = 0;
const broadcastLog = async (message: string, executionId?: string) => {
    // Always log to console
    console.log(message);

    // Throttle Realtime logs to avoid flooding
    const now = Date.now();
    if (now - lastLogTime < 100) return; // Skip if less than 100ms since last log
    lastLogTime = now;

    try {
        await supabase.channel('worker-logs').send({
            type: 'broadcast',
            event: 'log',
            payload: {
                message: message.substring(0, 200), // Truncate long messages
                executionId,
                timestamp: new Date().toISOString()
            }
        });
    } catch (e) {
        // Ignore errors to avoid breaking worker
        console.warn('Realtime log failed:', e);
    }
};

const processExecution = async (execution: any) => {
    await broadcastLog(`[${execution.id}] Processing flow...`, execution.id);
    const startTime = Date.now();

    try {
        // Status is already 'running' from the atomic claim - no need to update again
        await broadcastLog(`[${execution.id}] Status: RUNNING (claimed atomically)`, execution.id);

        // --- NEW DYNAMIC EXECUTOR ---
        const { FlowExecutor } = require('../services/FlowExecutor');
        const executor = new FlowExecutor();

        // Define a logger for the context that broadcasts
        // We'll attach this via a modification to FlowExecutor or pass it if constructor allowed.
        // Since we didn't add logger to constructor, we might need to rely on the internal logging of Executor 
        // or refactor Executor to accept a logger.
        // For now, let's implement the log storage in Executor or let it be.
        // Actually, the Executor specific implementation I wrote 2 steps ago HAS a logger in Context!
        // But the `execute` method signature in my previous tool call didn't accept external logger override easily 
        // unless I change the `execute` method to accept it or valid Context.
        // Let's look at `FlowExecutor.ts` again. It creates its own context.
        // I should probably modify FlowExecutor to accept a logger or callback.

        // Use the executor
        const result = await executor.execute(execution.id, async (msg: string) => {
            await broadcastLog(msg, execution.id);
        });

        // --- END NEW DYNAMIC EXECUTOR ---

        await broadcastLog(`[${execution.id}] Completed successfully.`, execution.id);

    } catch (error: any) {
        console.error(`[${execution.id}] Failed:`, error);
        await broadcastLog(`[${execution.id}] FAILED: ${error.message}`, execution.id);

        // Read existing execution_log to PRESERVE per-node entries
        const { data: existingExec } = await supabase
            .from('flow_executions')
            .select('execution_log')
            .eq('id', execution.id)
            .maybeSingle();

        const existingLog = Array.isArray(existingExec?.execution_log) ? existingExec.execution_log : [];
        existingLog.push({
            nodeId: 'unknown',
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });

        await supabase
            .from('flow_executions')
            .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                execution_log: existingLog,
                error_message: error.message
            })
            .eq('id', execution.id);
    }
};

// Helper: Generate Semantic-like Data
const generateSyntheticData = (keywords: string[], count: number) => {
    const sources = ['Twitter', 'NewsAPI', 'Brandwatch', 'Blog'];
    const sentiments = ['positive', 'negative', 'neutral'];
    const actions = ['Lançou', 'Criticou', 'Anunciou', 'Debateu', 'Ignorou'];

    return Array.from({ length: count }).map(() => {
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];

        return {
            title: `${keyword}: ${action} nova medida polêmica em Brasília`,
            summary: `Monitoramento indica alta repercussão sobre ${keyword}. O termo foi citado 1500 vezes na última hora. Fonte principal: ${source}.`,
            url: `https://${source.toLowerCase()}.com/news/${Math.random().toString(36).substring(7)}`,
            source: source,
            source_type: source === 'Twitter' ? 'social_media' : 'news',
            published_at: new Date().toISOString(),
            risk_score: Math.floor(Math.random() * 100),
            sentiment: sentiment,
            keywords: [keyword, 'Política', 'Monitoramento'],
            classification_metadata: {
                confidence: 0.95,
                model: "gpt-4-synthetic"
            }
        };
    });
};

// Start Loop
setInterval(poll, POLL_INTERVAL);
poll(); // Initial run
