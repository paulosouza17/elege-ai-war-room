const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kgemupuutkhxjfhxasbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590'
);

async function main() {
    // Get the full flow with all nodes
    const { data: flow } = await supabase
        .from('flows')
        .select('nodes')
        .eq('id', '8c01fd71-4c83-49f9-987c-d6e81322bc63')
        .single();

    if (!flow || !flow.nodes) { console.log('No flow found'); return; }

    // Show each node's id, type, and key data fields
    for (const node of flow.nodes) {
        console.log(`=== Node: ${node.id} ===`);
        console.log(`  Type: ${node.type}`);
        console.log(`  Label: ${node.data?.label || 'N/A'}`);
        console.log(`  IconType: ${node.data?.iconType || 'N/A'}`);
        // Show relevant config
        const { label, color, ...config } = node.data || {};
        const relevantKeys = Object.keys(config).filter(k =>
            !['position', 'positionAbsolute', 'width', 'height', 'selected', 'dragging'].includes(k)
        );
        if (relevantKeys.length > 0) {
            const subset = {};
            for (const k of relevantKeys) {
                const v = config[k];
                if (typeof v === 'string' && v.length > 200) {
                    subset[k] = v.substring(0, 200) + '...';
                } else {
                    subset[k] = v;
                }
            }
            console.log(`  Config: ${JSON.stringify(subset, null, 4)}`);
        }
        console.log('');
    }
}

main().catch(console.error);
