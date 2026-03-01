const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kgemupuutkhxjfhxasbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590'
);

async function main() {
    console.log('=== Running role migration ===\n');

    // Step 1: Check if column already exists
    const { data: test } = await supabase
        .from('monitored_entities')
        .select('id, name, role')
        .limit(1);

    if (test && test[0] && 'role' in test[0]) {
        console.log('Column "role" already exists. Checking current values...\n');
    } else {
        console.log('Column "role" does NOT exist yet. Please run the SQL migration in Supabase dashboard:\n');
        console.log(`ALTER TABLE monitored_entities
ADD COLUMN role TEXT DEFAULT 'neutral'
CHECK (role IN ('target', 'adversary', 'ally', 'neutral'));`);
        console.log('\nAfter running the SQL, re-run this script to update roles.\n');
        return;
    }

    // Step 2: Update roles
    const updates = [
        { name: 'Flavio Bolsonaro', role: 'target' },
        { name: 'Luiz Inácio Lula da Silva', role: 'adversary' },
        { name: 'GDF', role: 'adversary' },
        { name: 'Jair Bolsonaro', role: 'ally' },
    ];

    for (const { name, role } of updates) {
        const { data, error } = await supabase
            .from('monitored_entities')
            .update({ role })
            .eq('name', name)
            .select('id, name, role');

        if (error) {
            console.error(`❌ Failed to update "${name}":`, error.message);
        } else if (data && data.length > 0) {
            console.log(`✅ ${name} → ${role}`);
        } else {
            console.log(`⚠ "${name}" not found in database`);
        }
    }

    // Step 3: Verify
    console.log('\n=== Current entities with roles ===\n');
    const { data: entities } = await supabase
        .from('monitored_entities')
        .select('id, name, role, type')
        .order('name');

    if (entities) {
        for (const e of entities) {
            const emoji = { target: '🎯', adversary: '⚔️', ally: '🤝', neutral: '🔘' }[e.role] || '❓';
            console.log(`  ${emoji} ${e.name} (${e.type}) → ${e.role}`);
        }
    }
}

main().catch(console.error);
