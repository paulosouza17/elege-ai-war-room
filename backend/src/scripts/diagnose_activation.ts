import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const TARGET_ID = "981c9405-cb9e-4950-a049-200382d64b35";

async function diagnose() {
    console.log(`--- DIAGNOSIS FOR ACTIVATION: ${TARGET_ID} ---`);

    // 1. Check Activation
    const { data: activation, error: actError } = await supabase
        .from('activations')
        .select('name, status')
        .eq('id', TARGET_ID)
        .single();

    if (actError) console.error('Error fetching activation:', actError.message);
    else console.log(`Activation: ${activation?.name} [${activation?.status}]`);

    // 2. Check Files
    const { data: files, error: filesError } = await supabase
        .from('activation_files')
        .select('*')
        .eq('activation_id', TARGET_ID)
        .order('created_at', { ascending: false });

    console.log(`\n📂 Files Found (${files?.length || 0}):`);
    files?.forEach(f => {
        console.log(` - ID: ${f.id}`);
        console.log(`   Name: ${f.original_name}`);
        console.log(`   Status: ${f.status}`);
        console.log(`   Results: ${f.processing_result ? 'Yes' : 'No'}`);
        console.log('   ---');
    });

    // 3. Check Executions
    // Note: We need to filter context JSONB. 
    // Supabase JS allows filter on JSONB columns.
    const { data: executions, error: execError } = await supabase
        .from('flow_executions')
        .select('*')
        .contains('context', { activation_id: TARGET_ID })
        .order('created_at', { ascending: false });

    console.log(`\n⚙️ Related Executions (${executions?.length || 0}):`);
    executions?.forEach(e => {
        console.log(` - Exec ID: ${e.id}`);
        console.log(`   Status: ${e.status}`);
        console.log(`   Created At: ${e.created_at}`);
        console.log(`   Started At: ${e.started_at || 'N/A'}`);
        console.log(`   Completed At: ${e.completed_at || 'N/A'}`);
        console.log(`   Error: ${e.error_message || 'None'}`);
        console.log(`   Context File ID: ${e.context?.file_id}`);
        console.log('   ---');
    });

    console.log('\n--- END ---');
}

diagnose();
