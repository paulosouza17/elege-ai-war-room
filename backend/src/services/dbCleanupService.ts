import { SupabaseClient } from '@supabase/supabase-js';

const COMPLETED_RETENTION_DAYS = 7;
const FAILED_RETENTION_DAYS = 10;
const CANCELLED_RETENTION_DAYS = 7;

export class DbCleanupService {
    private supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    async runCleanup(): Promise<{ deleted: number; cleared: number }> {
        const now = new Date();
        let totalDeleted = 0;
        let totalCleared = 0;

        // 1. Delete completed executions older than 7 days
        const completedCutoff = new Date(now.getTime() - COMPLETED_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { data: deletedCompleted, error: errCompleted } = await this.supabase
            .from('flow_executions')
            .delete()
            .eq('status', 'completed')
            .lt('created_at', completedCutoff)
            .select('id');

        if (errCompleted) {
            console.error('[DbCleanup] Error deleting completed executions:', errCompleted.message);
        } else {
            totalDeleted += deletedCompleted?.length || 0;
            if (deletedCompleted?.length) {
                console.log(`[DbCleanup] Deleted ${deletedCompleted.length} completed executions (older than ${COMPLETED_RETENTION_DAYS}d)`);
            }
        }

        // 2. Delete failed executions older than 10 days
        const failedCutoff = new Date(now.getTime() - FAILED_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { data: deletedFailed, error: errFailed } = await this.supabase
            .from('flow_executions')
            .delete()
            .eq('status', 'failed')
            .lt('created_at', failedCutoff)
            .select('id');

        if (errFailed) {
            console.error('[DbCleanup] Error deleting failed executions:', errFailed.message);
        } else {
            totalDeleted += deletedFailed?.length || 0;
            if (deletedFailed?.length) {
                console.log(`[DbCleanup] Deleted ${deletedFailed.length} failed executions (older than ${FAILED_RETENTION_DAYS}d)`);
            }
        }

        // 3. Delete cancelled executions older than 7 days
        const cancelledCutoff = completedCutoff;
        const { data: deletedCancelled, error: errCancelled } = await this.supabase
            .from('flow_executions')
            .delete()
            .eq('status', 'cancelled')
            .lt('created_at', cancelledCutoff)
            .select('id');

        if (errCancelled) {
            console.error('[DbCleanup] Error deleting cancelled executions:', errCancelled.message);
        } else {
            totalDeleted += deletedCancelled?.length || 0;
            if (deletedCancelled?.length) {
                console.log(`[DbCleanup] Deleted ${deletedCancelled.length} cancelled executions (older than ${CANCELLED_RETENTION_DAYS}d)`);
            }
        }

        // 4. Clear heavy JSON columns from finished executions (keep metadata lean)
        const { data: cleared, error: errClear } = await this.supabase
            .from('flow_executions')
            .update({ resume_context: null })
            .in('status', ['completed', 'failed', 'cancelled'])
            .not('resume_context', 'is', null)
            .select('id');

        if (errClear) {
            console.error('[DbCleanup] Error clearing resume_context:', errClear.message);
        } else {
            totalCleared += cleared?.length || 0;
            if (cleared?.length) {
                console.log(`[DbCleanup] Cleared resume_context from ${cleared.length} finished executions`);
            }
        }

        if (totalDeleted === 0 && totalCleared === 0) {
            console.log('[DbCleanup] Nothing to clean — database is lean ✅');
        } else {
            console.log(`[DbCleanup] Summary: ${totalDeleted} deleted, ${totalCleared} resume_context cleared`);
        }

        return { deleted: totalDeleted, cleared: totalCleared };
    }
}
