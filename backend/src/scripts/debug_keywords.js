require('dotenv').config();
const sb = require('@supabase/supabase-js');
const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    // Get the MOST RECENT execution with its logs
    const { data: execs } = await supabase.from('flow_executions')
        .select('id, execution_log, activation_id, status, parent_execution_id')
        .not('parent_execution_id', 'is', null)
        .order('started_at', { ascending: false })
        .limit(3);

    for (const exec of execs || []) {
        console.log('\n=== Child:', exec.id.slice(0, 8), '| Status:', exec.status, '===');
        const logs = exec.execution_log || [];
        for (const l of logs) {
            if (l.nodeId === 'node-2' && l.status === 'completed') {
                const out = l.output || {};
                console.log('  keyword_matches:', JSON.stringify(out.keyword_matches));
                console.log('  people_matches:', JSON.stringify(out.people_matches));
                console.log('  found:', out.found);
                console.log('  title:', (out.title || '').substring(0, 100));
            }
        }
    }

    // Now check ALL recent parent executions for trigger data
    const { data: parents } = await supabase.from('flow_executions')
        .select('id, execution_log, activation_id')
        .is('parent_execution_id', null)
        .order('started_at', { ascending: false })
        .limit(2);

    for (const p of parents || []) {
        console.log('\n=== Parent:', p.id.slice(0, 8), '| Activation:', p.activation_id?.slice(0, 8), '===');
        const logs = p.execution_log || [];
        for (const l of logs) {
            if (l.nodeId === 'trigger-1' && l.status === 'completed') {
                const td = l.output || {};
                console.log('  trigger keywords:', td.keywords);
                console.log('  trigger people:', td.people_of_interest);
                console.log('  trigger entities:', td.entities);
            }
        }

        // Check what the actual activation has
        if (p.activation_id) {
            const { data: act } = await supabase.from('activations')
                .select('keywords, entities, analysis_instructions')
                .eq('id', p.activation_id)
                .single();
            if (act) {
                console.log('  DB activation keywords:', act.keywords);
                console.log('  DB activation entities:', JSON.stringify(act.entities)?.substring(0, 200));
            }
        }
    }
}

main().then(() => process.exit(0));
