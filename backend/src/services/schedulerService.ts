import { SupabaseClient } from '@supabase/supabase-js';
import { FlowService } from './flowService';
import cronParser from 'cron-parser';

export class SchedulerService {
    private supabase: SupabaseClient;
    private flowService: FlowService;
    private checkInterval: NodeJS.Timeout | null = null;
    private isProcessing: boolean = false;

    constructor(supabaseClient: SupabaseClient, flowService: FlowService) {
        this.supabase = supabaseClient;
        this.flowService = flowService;
    }

    start(intervalMs: number = 60000) {
        if (this.checkInterval) {
            console.warn('[Scheduler] Service already started.');
            return;
        }

        console.log('[Scheduler] Service started. Checking every ' + intervalMs + 'ms');

        // Initial check immediately
        this.handleTick();

        this.checkInterval = setInterval(() => {
            this.handleTick();
        }, intervalMs);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('[Scheduler] Service stopped.');
        }
    }

    private async handleTick() {
        if (this.isProcessing) {
            console.log('[Scheduler] Skip tick, previous tick still processing.');
            return;
        }

        this.isProcessing = true;

        try {
            await this.cleanupStaleExecutions();
            await this.processDueSchedules();
        } catch (error) {
            console.error('[Scheduler] Error in handleTick:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Cleanup executions stuck in 'running' for more than STALE_THRESHOLD_MINUTES.
     * This prevents resource exhaustion from hung executions (e.g., unreachable APIs).
     */
    private async cleanupStaleExecutions() {
        const STALE_THRESHOLD_MINUTES = 10;
        const cutoff = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60_000).toISOString();

        const { data: staleExecs, error } = await this.supabase
            .from('flow_executions')
            .select('id')
            .eq('status', 'running')
            .lt('started_at', cutoff);

        if (error || !staleExecs || staleExecs.length === 0) return;

        console.warn(`[Scheduler] Found ${staleExecs.length} stale executions (running > ${STALE_THRESHOLD_MINUTES}min). Marking as failed.`);

        const { error: updateError } = await this.supabase
            .from('flow_executions')
            .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
            })
            .eq('status', 'running')
            .lt('started_at', cutoff);

        if (updateError) {
            console.error('[Scheduler] Failed to cleanup stale executions:', updateError.message);
        } else {
            console.log(`[Scheduler] Cleaned up ${staleExecs.length} stale executions.`);
        }
    }

    private async processDueSchedules() {
        const now = new Date().toISOString();

        // 1. Fetch due schedules
        const { data: schedules, error } = await this.supabase
            .from('flow_schedules')
            .select('*')
            .eq('active', true)
            .lte('next_run_at', now);

        if (error) {
            console.error('[Scheduler] Failed to fetch schedules:', error);
            return;
        }

        if (!schedules || schedules.length === 0) {
            // console.debug('[Scheduler] No due schedules.');
            return;
        }

        console.log(`[Scheduler] Found ${schedules.length} due schedules.`);

        // 2. Process each schedule
        for (const schedule of schedules) {
            await this.processSchedule(schedule);
        }
    }

    private async processSchedule(schedule: any) {
        console.log(`[Scheduler] Processing schedule ${schedule.id} (Flow: ${schedule.flow_id})`);

        // CHECK: Is the flow itself active?
        const { data: flow, error: flowError } = await this.supabase
            .from('flows')
            .select('id, active, name')
            .eq('id', schedule.flow_id)
            .single();

        if (flowError || !flow) {
            console.warn(`[Scheduler] Flow ${schedule.flow_id} not found. Skipping schedule ${schedule.id}.`);
            return;
        }

        if (!flow.active) {
            console.warn(`[Scheduler] Flow "${flow.name}" (${flow.id}) is INACTIVE. Skipping schedule ${schedule.id}.`);
            return;
        }
        try {
            const { data: execution, error: execError } = await this.supabase
                .from('flow_executions')
                .insert({
                    flow_id: schedule.flow_id,
                    status: 'pending',
                    context: {
                        title: `Disparo Agendado (CRON)`,
                        description: `Expressão: ${schedule.cron_expression}`,
                        source: 'scheduler',
                        scheduleId: schedule.id,
                        cronExpression: schedule.cron_expression,
                        triggeredAt: new Date().toISOString()
                    },
                    user_id: schedule.created_by || null,
                    execution_log: [],
                })
                .select('id')
                .single();

            if (execError) {
                console.error(`[Scheduler] Failed to create execution for schedule ${schedule.id}:`, execError);
            } else {
                console.log(`[Scheduler] Execution ${execution?.id} queued for flow ${schedule.flow_id}`);
            }
        } catch (err) {
            console.error(`[Scheduler] Failed to execute flow for schedule ${schedule.id}:`, err);
        }

        // 2. Calculate Next Run
        try {
            const options = {
                currentDate: new Date(),
                tz: schedule.timezone || 'America/Sao_Paulo'
            };

            const interval = cronParser.parseExpression(schedule.cron_expression, options);
            const nextRun = interval.next().toDate();

            // 3. Update DB
            const { error } = await this.supabase
                .from('flow_schedules')
                .update({
                    next_run_at: nextRun.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', schedule.id);

            if (error) {
                console.error(`[Scheduler] Failed to update next_run_at for schedule ${schedule.id}:`, error);
            } else {
                console.log(`[Scheduler] Schedule ${schedule.id} executed. Next run: ${nextRun.toISOString()}`);
            }

        } catch (err) {
            console.error(`[Scheduler] Failed to calculate next run for schedule ${schedule.id}:`, err);
        }
    }
}
