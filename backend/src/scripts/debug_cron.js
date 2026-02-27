require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
    const FLOW_ID = '8c01fd71-4c83-49f9-987c-d6e81322bc63';
    const now = new Date();

    // 1. Current schedule state
    console.log('=== SCHEDULE STATE ===');
    console.log('Current time (UTC):', now.toISOString());
    console.log('Current time (BRT):', now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

    const { data: sch } = await s.from('flow_schedules')
        .select('*')
        .eq('flow_id', FLOW_ID)
        .single();

    if (!sch) { console.log('NO SCHEDULE for this flow!'); process.exit(0); }

    console.log('Schedule ID:', sch.id);
    console.log('Cron:', sch.cron_expression);
    console.log('Active:', sch.active);
    console.log('Timezone:', sch.timezone);
    console.log('Next run at:', sch.next_run_at);
    console.log('Updated at:', sch.updated_at);

    const nextRunDate = new Date(sch.next_run_at);
    const diffMs = nextRunDate.getTime() - now.getTime();
    console.log('Time until next run:', Math.round(diffMs / 1000), 'seconds');
    console.log('Next run is in the', diffMs > 0 ? 'FUTURE' : 'PAST (should fire!)');

    // 2. Recent executions for THIS flow
    console.log('\n=== RECENT EXECUTIONS FOR THIS FLOW ===');
    const { data: execs } = await s.from('flow_executions')
        .select('id, status, started_at, context')
        .eq('flow_id', FLOW_ID)
        .is('parent_execution_id', null)
        .order('started_at', { ascending: false })
        .limit(10);

    if (!execs || execs.length === 0) {
        console.log('NO EXECUTIONS found for this flow!');
    } else {
        for (const ex of execs) {
            const ctx = ex.context || {};
            console.log(`  ${ex.id.slice(0, 8)} | ${ex.status.padEnd(10)} | Source: ${(ctx.source || 'N/A').padEnd(25)} | ${ex.started_at?.slice(0, 19)}`);
        }
    }

    // 3. Check the flow's active status
    const { data: flow } = await s.from('flows')
        .select('id, active, name')
        .eq('id', FLOW_ID)
        .single();
    console.log('\n=== FLOW STATUS ===');
    console.log('Name:', flow.name);
    console.log('Active:', flow.active);

    // 4. Check if our processSchedule fix blocks this
    // The fix checks flow.active — if flow is active AND schedule is active, it should fire
    console.log('\n=== WILL SCHEDULER FIRE? ===');
    console.log('flow.active:', flow.active);
    console.log('schedule.active:', sch.active);
    console.log('next_run_at <= now:', nextRunDate <= now);
    console.log('VERDICT:', flow.active && sch.active && nextRunDate <= now ? 'YES - should fire' : 'NO - will not fire because: ' +
        (!flow.active ? 'flow inactive' : !sch.active ? 'schedule inactive' : 'next_run_at is in the future'));

    // 5. Check server logs for scheduler messages
    console.log('\n=== SCHEDULER TICK INTERVAL ===');
    // Check the interval from server.ts
    console.log('Default interval: 60000ms (1 minute)');
    console.log('Scheduler calls handleTick every interval, which calls processDueSchedules');
    console.log('processDueSchedules queries: flow_schedules WHERE active=true AND next_run_at <= NOW');

    process.exit(0);
})();
