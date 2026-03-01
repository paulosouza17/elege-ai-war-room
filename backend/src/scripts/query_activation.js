const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kgemupuutkhxjfhxasbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590'
);

async function main() {
    // 1) Activation details
    const { data: activation, error: actErr } = await supabase
        .from('activations')
        .select('*')
        .eq('id', 'a7f6f2d7-4bc9-496c-a1e2-6560c4c52ae0')
        .single();

    if (actErr) {
        console.error("Activation error:", actErr);
    } else {
        console.log("=== ACTIVATION ===");
        console.log(JSON.stringify(activation, null, 2));
    }

    // 2) Monitored entities for user 3b6eebdb-7d79-4ad2-9d6e-76a8d9435523
    const { data: entities, error: entErr } = await supabase
        .from('monitored_entities')
        .select('*')
        .eq('user_id', '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523');

    if (entErr) {
        console.error("Entities error:", entErr);
    } else {
        console.log("\n=== MONITORED ENTITIES ===");
        console.log(JSON.stringify(entities, null, 2));
    }

    // 3) Activation files / people linked
    const { data: files } = await supabase
        .from('activation_files')
        .select('*')
        .eq('activation_id', 'a7f6f2d7-4bc9-496c-a1e2-6560c4c52ae0');
    console.log("\n=== ACTIVATION FILES ===");
    console.log(JSON.stringify(files, null, 2));

    // 4) People table
    const { data: people } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523');
    console.log("\n=== PEOPLE ===");
    console.log(JSON.stringify(people, null, 2));

    // 5) Flow executions related  
    const { data: flowExecs } = await supabase
        .from('flow_executions')
        .select('id, flow_id, status, started_at, completed_at')
        .eq('user_id', '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523')
        .order('started_at', { ascending: false })
        .limit(5);
    console.log("\n=== RECENT FLOW EXECUTIONS ===");
    console.log(JSON.stringify(flowExecs, null, 2));
}

main().catch(console.error);
