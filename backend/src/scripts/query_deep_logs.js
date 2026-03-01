const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kgemupuutkhxjfhxasbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590'
);

async function main() {
    // Get all executions near feed item creation (19:01:17) with full context and log  
    const { data: executions } = await supabase
        .from('flow_executions')
        .select('id, flow_id, status, started_at, completed_at, execution_log, context')
        .eq('user_id', '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523')
        .gte('started_at', '2026-03-01T19:01:05+00:00')
        .lte('started_at', '2026-03-01T19:01:20+00:00')
        .order('started_at', { ascending: true });

    console.log(`Found ${executions?.length || 0} executions\n`);

    for (const exec of (executions || [])) {
        const contextStr = JSON.stringify(exec.context || {});
        const logStr = JSON.stringify(exec.execution_log || []);

        // Check if this execution is related to our article (Bolsa Família or the URL)
        const isMatch = contextStr.toLowerCase().includes('bolsa') ||
            contextStr.toLowerCase().includes('congresso') ||
            logStr.toLowerCase().includes('bolsa') ||
            logStr.toLowerCase().includes('congresso');

        if (isMatch) {
            console.log(`=== MATCHING Execution ${exec.id} ===`);
            console.log(`Status: ${exec.status}`);
            console.log(`Started: ${exec.started_at} | Completed: ${exec.completed_at}`);
            console.log('\n--- CONTEXT ---');
            console.log(JSON.stringify(exec.context, null, 2));
            console.log('\n--- EXECUTION LOG ---');
            const logs = exec.execution_log || [];
            for (const log of logs) {
                console.log(JSON.stringify(log));
            }
            console.log('\n===================\n');
        }
    }

    // Also check if there's a flow_nodes table with the actual flow definition
    const { data: flowDef } = await supabase
        .from('flows')
        .select('*')
        .eq('id', '8c01fd71-4c83-49f9-987c-d6e81322bc63')
        .single();

    if (flowDef) {
        console.log('\n=== FLOW DEFINITION ===');
        console.log(`Name: ${flowDef.name}`);
        console.log(`Trigger: ${flowDef.trigger_type}`);
        if (flowDef.nodes) {
            console.log(`Nodes: ${JSON.stringify(flowDef.nodes, null, 2).substring(0, 3000)}`);
        }
        if (flowDef.edges) {
            console.log(`Edges: ${JSON.stringify(flowDef.edges, null, 2)}`);
        }
    } else {
        // Try different table names
        for (const table of ['flow_definitions', 'flow_templates', 'workflow_definitions']) {
            const { data, error } = await supabase.from(table).select('id, name').limit(1);
            if (!error) console.log(`Table ${table} exists:`, data);
        }
    }
}

main().catch(console.error);
