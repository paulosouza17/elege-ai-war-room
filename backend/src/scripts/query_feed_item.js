const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kgemupuutkhxjfhxasbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590'
);

async function main() {
    // 1) Query the specific feed item
    const { data: feedItem, error: feedErr } = await supabase
        .from('intelligence_feed')
        .select('*')
        .eq('id', '8bcccc0b-ab98-4565-a45a-4bad3d0bacc8')
        .single();

    if (feedErr) {
        console.error("Feed item error:", feedErr);
    } else {
        console.log("=== FEED ITEM ===");
        console.log(JSON.stringify(feedItem, null, 2));
    }

    // 2) Query activation keywords and monitored people
    if (feedItem && feedItem.activation_id) {
        const { data: activation, error: actErr } = await supabase
            .from('activations')
            .select('*, activation_people(*, people(*))')
            .eq('id', feedItem.activation_id)
            .single();

        if (actErr) {
            console.error("Activation error:", actErr);
        } else {
            console.log("\n=== ACTIVATION ===");
            console.log(JSON.stringify(activation, null, 2));
        }
    }

    // 3) Check flow definitions that may relate to portal monitoring
    const { data: flows, error: flowErr } = await supabase
        .from('flow_definitions')
        .select('id, name, trigger_type, nodes')
        .ilike('name', '%portal%');

    if (flowErr) {
        console.error("Flow error:", flowErr);
    } else {
        console.log("\n=== PORTAL FLOWS ===");
        console.log(JSON.stringify(flows, null, 2));
    }
}

main().catch(console.error);
