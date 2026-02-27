import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
);

async function verify() {
    const { data: flow } = await supabase
        .from('flows')
        .select('id, name, nodes, edges')
        .eq('id', '7717a7a5-5e88-4656-a22d-c9f940559c91')
        .single();

    if (!flow) { console.log('❌ Flow not found'); return; }

    console.log(`✅ Flow: ${flow.name}`);
    console.log(`\n📋 Nodes (${flow.nodes.length}):`);
    flow.nodes.forEach((n: any) => {
        const extras = [];
        if (n.data.iconType === 'linkcheck') extras.push(`urlVariable=${n.data.urlVariable}`);
        if (n.data.iconType === 'mediaoutlet') extras.push(`mode=${n.data.outletFilterMode}, selected=[${(n.data.selectedOutletIds || []).join(',')}]`);
        if (n.data.iconType === 'conditional') extras.push(`source=${n.data.conditionSource}, op=${n.data.conditionOperator}`);
        console.log(`  ${n.id} | ${n.data.label} | type=${n.data.iconType || n.type}${extras.length ? ' | ' + extras.join(', ') : ''}`);
    });

    console.log(`\n🔗 Edges (${flow.edges.length}):`);
    flow.edges.forEach((e: any) => {
        console.log(`  ${e.source} → ${e.target}`);
    });
}

verify().catch(console.error);
