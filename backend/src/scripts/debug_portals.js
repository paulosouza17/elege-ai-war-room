require('dotenv').config();
const sb = require('@supabase/supabase-js');
const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
    // Get the most recent parent execution for this flow
    const { data: parents } = await supabase.from('flow_executions')
        .select('id, status, started_at, completed_at, execution_log, flow_id')
        .is('parent_execution_id', null)
        .order('started_at', { ascending: false })
        .limit(1);

    if (!parents || parents.length === 0) { console.log('No executions found'); return; }
    const parent = parents[0];
    console.log('=== PARENT EXECUTION:', parent.id.slice(0, 8), '| Status:', parent.status, '===');
    console.log('Started:', parent.started_at);
    console.log('Completed:', parent.completed_at);

    // Check what mediaoutlet-1 returned
    const logs = parent.execution_log || [];
    for (const l of logs) {
        if (l.nodeId === 'mediaoutlet-1' && l.status === 'completed') {
            const items = l.output?.items || [];
            console.log('\n📺 Veículos selecionados:', items.length);
            items.forEach((item, i) => {
                console.log(`  ${i + 1}. ${item.name} (${item.url})`);
            });
        }
        if (l.nodeId === 'loop-portais' && l.status === 'completed') {
            const loopItems = l.output?._loopItems || l.output?.items || [];
            console.log('\n🔄 Loop portais items:', loopItems.length);
        }
    }

    // Check children (for parallel loop on portais)
    const { data: portalChildren } = await supabase.from('flow_executions')
        .select('id, status, execution_log, resume_context')
        .eq('parent_execution_id', parent.id)
        .order('started_at', { ascending: true });

    if (portalChildren && portalChildren.length > 0) {
        console.log('\n=== PORTAL CHILDREN (from loop-portais):', portalChildren.length, '===');
        for (const child of portalChildren) {
            const rc = child.resume_context || {};
            const item = rc.loopItem;
            const portalName = item?.name || item?.url || JSON.stringify(item).substring(0, 60);
            const childLogs = child.execution_log || [];
            const nodeIds = [...new Set(childLogs.map(l => l.nodeId))];
            console.log(`  ${child.id.slice(0, 8)} | ${child.status} | Portal: ${portalName} | Nodes: ${nodeIds.join(',')}`);
        }
    } else {
        console.log('\nNo portal children (loop-portais might be sequential)');

        // Check http-news logs to see which portals were fetched
        for (const l of logs) {
            if (l.nodeId === 'http-news' && l.status === 'completed') {
                console.log('\n🌐 HTTP News summary:', l.output?.summary?.substring(0, 200));
            }
        }
    }

    // Also check grandchildren (loop-noticias children)
    if (portalChildren && portalChildren.length > 0) {
        for (const pc of portalChildren) {
            const { data: newsChildren } = await supabase.from('flow_executions')
                .select('id, status')
                .eq('parent_execution_id', pc.id);
            if (newsChildren && newsChildren.length > 0) {
                const statuses = {};
                newsChildren.forEach(nc => { statuses[nc.status] = (statuses[nc.status] || 0) + 1; });
                console.log(`    └─ News children: ${newsChildren.length} (${Object.entries(statuses).map(([k, v]) => k + ':' + v).join(', ')})`);
            }
        }
    }
}

main().then(() => process.exit(0));
