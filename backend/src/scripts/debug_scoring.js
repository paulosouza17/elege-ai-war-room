require('dotenv').config();
const sb = require('@supabase/supabase-js');
const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    const { data: flows } = await supabase.from('flows')
        .select('nodes')
        .ilike('name', '%Teste completo Flavio%');

    const nodes = flows[0].nodes;

    // Show all nodes in order
    const relevantNodes = ['trigger-1', 'mediaoutlet-1', 'loop-portais', 'http-news', 'loop-noticias',
        'http-content', 'node-2', 'linkcheck-1', 'node-4', 'node-3', 'publish-1'];

    for (const id of relevantNodes) {
        const n = nodes.find(nd => nd.id === id);
        if (n) {
            console.log('---', n.id, '|', n.data.label, '| type:', n.data.iconType);
            // For AI node, show the prompt
            if (n.data.iconType === 'ai' || n.id === 'node-3') {
                console.log('  aiPrompt:', (n.data.aiPrompt || '').substring(0, 300));
                console.log('  aiModel:', n.data.aiModel);
            }
            // For conditional node
            if (n.data.iconType === 'conditional' || n.id === 'node-4') {
                console.log('  conditionField:', n.data.conditionField);
                console.log('  conditionOperator:', n.data.conditionOperator);
                console.log('  conditionValue:', n.data.conditionValue);
                console.log('  All data:', JSON.stringify(n.data).substring(0, 400));
            }
        }
    }

    // Also check the AI analysis handler to understand the flow
    // Check which child had the Cuba article 
    const { data: parents } = await supabase.from('flow_executions')
        .select('id')
        .is('parent_execution_id', null)
        .order('started_at', { ascending: false })
        .limit(2);

    for (const parent of parents) {
        const { data: children } = await supabase.from('flow_executions')
            .select('id, execution_log')
            .eq('parent_execution_id', parent.id);

        for (const child of children || []) {
            const logs = child.execution_log || [];
            const scriptLog = logs.find(l => l.nodeId === 'node-2' && l.status === 'completed');
            if (!scriptLog || !scriptLog.output) continue;

            const title = scriptLog.output.title || '';
            if (title.includes('embaixada') || title.includes('Estados Unidos reab')) {
                console.log('\n=== CUBA ARTICLE FOUND ===');
                console.log('Child:', child.id.slice(0, 8));
                console.log('Title:', title);
                console.log('Script reason:', scriptLog.output.reason);
                console.log('Script kw:', scriptLog.output.keyword_matches);

                // Check ALL nodes in this child
                for (const l of logs) {
                    console.log('  Node:', l.nodeId, '| Status:', l.status);
                    if (l.output) {
                        const out = JSON.stringify(l.output).substring(0, 200);
                        console.log('    Output:', out);
                    }
                }
            }
        }
    }
}

main().then(() => process.exit(0));
