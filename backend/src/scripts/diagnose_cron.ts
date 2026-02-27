import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function diagnoseCron() {
    console.log('═══════════════════════════════════════════');
    console.log('  DIAGNÓSTICO DE FLUXOS COM CRON');
    console.log('  ' + new Date().toLocaleString('pt-BR'));
    console.log('═══════════════════════════════════════════\n');

    // 1. Find all active flows with schedule triggers
    const { data: flows, error } = await supabase
        .from('flows')
        .select('id, name, active, nodes, created_at, updated_at')
        .eq('active', true);

    if (error) { console.error('Error fetching flows:', error.message); return; }

    const cronFlows = (flows || []).filter(flow => {
        const triggerNode = flow.nodes?.find((n: any) => n.type === 'trigger');
        return triggerNode?.data?.triggerType === 'schedule' || triggerNode?.data?.triggerType === 'cron';
    });

    console.log(`[1] FLUXOS ATIVOS COM CRON: ${cronFlows.length} de ${flows?.length || 0} total\n`);

    for (const flow of cronFlows) {
        const trigger = flow.nodes.find((n: any) => n.type === 'trigger');
        const cronExpr = trigger?.data?.schedule || trigger?.data?.cron || 'N/A';
        const interval = trigger?.data?.interval || 'N/A';

        console.log(`  📋 ${flow.name}`);
        console.log(`     ID: ${flow.id}`);
        console.log(`     Cron/Schedule: ${cronExpr} | Interval: ${interval}`);
        console.log(`     Active: ${flow.active}`);
        console.log(`     Trigger Data: ${JSON.stringify(trigger?.data || {})}`);

        // Check recent executions for this flow
        const { data: execs } = await supabase
            .from('flow_executions')
            .select('id, status, created_at, completed_at')
            .eq('flow_id', flow.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (execs && execs.length > 0) {
            console.log(`     Últimas execuções: ${execs.length}`);
            for (const e of execs) {
                const age = Math.round((Date.now() - new Date(e.created_at).getTime()) / 60000);
                console.log(`       - ${e.status} | ${age}min atrás | ${e.id.substring(0, 8)}...`);
            }
        } else {
            console.log(`     ⚠ NENHUMA EXECUÇÃO encontrada para este fluxo!`);
        }
        console.log('');
    }

    // 2. Check scheduled_tasks table  
    const { data: tasks } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log(`[2] TABELA scheduled_tasks: ${tasks?.length || 0} registros`);
    if (tasks?.length) {
        for (const t of tasks) {
            console.log(`  - ID: ${t.id?.substring(0, 8)}... | Flow: ${t.flow_id?.substring(0, 8)}... | Status: ${t.status} | Schedule: ${t.schedule || t.cron} | Next: ${t.next_run || 'N/A'} | Last: ${t.last_run || 'nunca'}`);
        }
    } else {
        console.log('  ⚠ Tabela vazia — NENHUMA tarefa agendada!');
    }

    // 3. Check scheduler code — look for what creates scheduled_tasks
    console.log(`\n[3] SERVIDOR — SCHEDULER STATUS:`);

    // Ping the API to check if it's alive
    try {
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/v1/health`);
        console.log(`  API health: ${response.status}`);
    } catch {
        try {
            const response = await fetch(`http://localhost:${process.env.PORT || 3000}/`);
            console.log(`  API root: ${response.status}`);
        } catch {
            console.log('  ⚠ API não respondendo!');
        }
    }

    // 4. Check inactive flows with schedule triggers too
    const { data: inactiveFlows } = await supabase
        .from('flows')
        .select('id, name, active, nodes')
        .eq('active', false);

    const inactiveCronFlows = (inactiveFlows || []).filter(flow => {
        const triggerNode = flow.nodes?.find((n: any) => n.type === 'trigger');
        return triggerNode?.data?.triggerType === 'schedule' || triggerNode?.data?.triggerType === 'cron';
    });

    if (inactiveCronFlows.length > 0) {
        console.log(`\n[4] FLUXOS INATIVOS COM CRON: ${inactiveCronFlows.length}`);
        for (const f of inactiveCronFlows) {
            console.log(`  - ${f.name} (INATIVO)`);
        }
    }

    console.log('\n═══════════════════════════════════════════');
}

diagnoseCron();
