const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kgemupuutkhxjfhxasbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590'
);

async function main() {
    const { data: flow } = await supabase
        .from('flows')
        .select('nodes')
        .eq('id', '8c01fd71-4c83-49f9-987c-d6e81322bc63')
        .single();

    if (!flow) return;

    // Find node-2 (Script) and node-3 (AI) - show full config
    for (const node of flow.nodes) {
        if (node.id === 'node-2' || node.id === 'node-3') {
            console.log(`\n=== ${node.id}: ${node.data?.label} ===\n`);
            if (node.id === 'node-2') {
                console.log('--- SCRIPT CODE ---');
                console.log(node.data?.scriptCode);
            }
            if (node.id === 'node-3') {
                console.log('--- PRE-PROMPT ---');
                console.log(node.data?.prePrompt);
                console.log('\n--- PROMPT ---');
                console.log(node.data?.prompt);
                console.log('\n--- MODEL ---');
                console.log(node.data?.model);
            }
        }
    }
}

main().catch(console.error);
