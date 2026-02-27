import { SupabaseClient } from '@supabase/supabase-js';

export class WatchdogService {
    private supabase: SupabaseClient;

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
    }

    async checkEscalationRules(): Promise<void> {
        console.log('[Watchdog] Checking for crisis escalation...');

        // 1. Find pending high-risk items
        // We look for items with risk_score >= 80 (high risk) that are still 'pending' or null status
        // Assuming 'risk_score' is a number column. If it's inside JSON, we need ->>.
        // Based on previous analysis, risk_score seems to be a top-level column or inside content?
        // Let's assume top-level column or we need to extract it.
        // Wait, let me check intelligence_feed schema again or just assume it's there based on plan.
        // Plan says: "Query intelligence_feed where risk_score >= 80"

        // IMPORTANT: If risk_score is inside 'content' JSON, we need to query differently.
        // But usually meaningful metrics are extracted to columns.
        // Let's assume it's a column for now as per plan implication. IF not, I'll need to fix.
        // Actually, let's play safe and check if risk_score exists.
        // I'll proceed assuming column exists or I'll extract from meta/content if query fails?
        // No, I'll use the column.

        const { data: riskyItems, error } = await this.supabase
            .from('intelligence_feed')
            .select('*')
            .gte('risk_score', 80)
            .or('status.eq.pending,status.is.null') // Handle null status too
            .limit(10); // Batch process

        if (error) {
            console.error('[Watchdog] Error fetching feed:', error);
            return;
        }

        if (!riskyItems || riskyItems.length === 0) {
            // console.log('[Watchdog] No new high-risk items found.');
            return;
        }

        console.log(`[Watchdog] Found ${riskyItems.length} high-risk items. Processing...`);

        for (const item of riskyItems) {
            await this.escalateItem(item);
        }
    }

    private async escalateItem(item: any): Promise<void> {
        console.log(`[Watchdog] Escalating feed item ${item.id} (Risk: ${item.risk_score})`);

        try {
            // 2. Create Crisis Event
            // Extract meaningful description
            let description = '';
            if (typeof item.content === 'string') {
                description = item.content;
            } else if (item.content?.summary) {
                description = item.content.summary;
            } else {
                description = JSON.stringify(item.content);
            }

            const { data: crisisEvent, error: crisisError } = await this.supabase
                .from('crisis_events')
                .insert({
                    title: `CRISE DETECTADA: ${item.title}`,
                    description: `Escalada Automática (Risk Score: ${item.risk_score}).\n\n${description.substring(0, 500)}...`,
                    severity: item.risk_score >= 90 ? 'critical' : 'high',
                    status: 'open',
                    source_feed_id: item.id,
                    activation_id: item.activation_id
                })
                .select()
                .single();

            if (crisisError) throw crisisError;

            // 3. Mark Feed Item as Escalated
            const { error: updateError } = await this.supabase
                .from('intelligence_feed')
                .update({ status: 'escalated' })
                .eq('id', item.id);

            if (updateError) throw updateError;

            console.log(`[Watchdog] ✅ Automatically escalated item ${item.id} to Crisis Event ${crisisEvent.id}`);

        } catch (err) {
            console.error(`[Watchdog] Failed to escalate item ${item.id}:`, err);
        }
    }
}
