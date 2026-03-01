const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kgemupuutkhxjfhxasbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590'
);

async function main() {
    // 1) Find the flow execution(s) around the time the feed item was created (19:01:17 UTC)
    const { data: executions, error: execErr } = await supabase
        .from('flow_executions')
        .select('id, flow_id, status, started_at, completed_at, execution_log, context')
        .eq('user_id', '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523')
        .gte('started_at', '2026-03-01T18:50:00+00:00')
        .lte('started_at', '2026-03-01T19:10:00+00:00')
        .order('started_at', { ascending: true });

    if (execErr) {
        console.error("Execution query error:", execErr);
        return;
    }

    console.log(`Found ${executions?.length || 0} executions around the article's creation time\n`);

    for (const exec of (executions || [])) {
        console.log(`=== Execution ${exec.id} ===`);
        console.log(`Flow: ${exec.flow_id} | Status: ${exec.status}`);
        console.log(`Started: ${exec.started_at} | Completed: ${exec.completed_at}`);

        // Check if context mentions the article URL or Bolsa Família
        const contextStr = JSON.stringify(exec.context || {});
        if (contextStr.includes('bolsa') || contextStr.includes('Bolsa') || contextStr.includes('8bcccc0b')) {
            console.log('>>> THIS EXECUTION MATCHES THE ARTICLE <<<');
            console.log('Context:', JSON.stringify(exec.context, null, 2));
        }

        // Check execution_log for AnalysisHandler entries
        const logs = exec.execution_log || [];
        const analysisLogs = logs.filter((l) =>
            (l.message || l.log || JSON.stringify(l)).includes('AnalysisHandler') ||
            (l.message || l.log || JSON.stringify(l)).includes('detected_entities') ||
            (l.message || l.log || JSON.stringify(l)).includes('Bolsa')
        );

        if (analysisLogs.length > 0) {
            console.log(`\nRelevant logs (${analysisLogs.length}):`);
            for (const log of analysisLogs) {
                console.log(`  ${JSON.stringify(log)}`);
            }
        }
        console.log('---\n');
    }

    // 2) Look at the flow definition for portal monitoring
    const { data: flows } = await supabase
        .from('flows')
        .select('id, name, trigger_type, nodes')
        .or('name.ilike.%portal%,name.ilike.%monit%');

    console.log(`\n=== FLOWS (portal/monitor) ===`);
    if (flows && flows.length > 0) {
        for (const flow of flows) {
            console.log(`Flow: ${flow.name} (${flow.id})`);
            console.log(`Trigger: ${flow.trigger_type}`);
            // Show node types
            if (flow.nodes && Array.isArray(flow.nodes)) {
                const nodeTypes = flow.nodes.map(n => `${n.id || n.type}: ${n.type || n.data?.type}`);
                console.log(`Nodes: ${nodeTypes.join(' → ')}`);
            }
            console.log('---');
        }
    } else {
        console.log('No flows found with portal/monitor in name');
        // Try listing all flows
        const { data: allFlows } = await supabase
            .from('flows')
            .select('id, name, trigger_type');
        console.log('\nAll flows:');
        console.log(JSON.stringify(allFlows, null, 2));
    }
}

main().catch(console.error);
