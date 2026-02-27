import { supabase } from '../config/supabase';

async function main() {
    console.log('Fetching data sources...');
    const { data: sources, error } = await supabase.from('data_sources').select('*');

    if (error) {
        console.error('Error fetching sources:', error);
        return;
    }

    if (!sources || sources.length === 0) {
        console.log('No sources found.');
        return;
    }

    console.log(`Found ${sources.length} sources.`);

    const groups: Record<string, any[]> = {};

    sources.forEach(s => {
        // Group by name
        // Some might differ by type, but usually name is unique enough for integrations list
        const key = s.name;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });

    for (const key in groups) {
        const group = groups[key];
        if (group.length > 1) {
            console.log(`Duplicate found for ${key}: ${group.length} items`);

            // Prioritize keeping active ones, then most config, then oldest
            group.sort((a, b) => {
                // Active first
                if (a.is_active !== b.is_active) return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);

                // More config keys first
                const configKeysA = Object.keys(a.config || {}).length;
                const configKeysB = Object.keys(b.config || {}).length;
                if (configKeysA !== configKeysB) return configKeysB - configKeysA;

                // Oldest first (presumed ID order if created_at missing, but let's just pick one)
                return 0;
            });

            const toKeep = group[0];
            const toDelete = group.slice(1);

            console.log(`Keeping ${toKeep.id} (Active: ${toKeep.is_active}, Config keys: ${Object.keys(toKeep.config || {}).length})`);

            for (const item of toDelete) {
                console.log(`Deleting ${item.id}...`);
                const { error: delError } = await supabase.from('data_sources').delete().eq('id', item.id);
                if (delError) console.error(`Failed to delete ${item.id}:`, delError);
                else console.log(`Deleted ${item.id}`);
            }
        }
    }

    console.log('Deduplication complete.');
}

main();
