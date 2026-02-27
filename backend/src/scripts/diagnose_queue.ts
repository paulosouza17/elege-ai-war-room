import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function diagnose() {
    console.log('--- DIAGNOSIS START ---');

    // 1. Check Activation Files
    const { data: files, error: filesError } = await supabase
        .from('activation_files')
        .select('id, original_name, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`\n📂 Pending Files (${files?.length || 0}):`);
    files?.forEach(f => console.log(` - [${f.status}] ${f.original_name} (${f.id})`));

    // 2. Check Flow Executions
    const { data: executions, error: execError } = await supabase
        .from('flow_executions')
        .select('id, status, error_message, created_at, context')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`\n⚙️ Recent Executions:`);
    executions?.forEach(e => {
        const ctx = typeof e.context === 'string' ? JSON.parse(e.context) : e.context;
        console.log(` - [${e.status}] ID: ${e.id} | File: ${ctx?.original_name || 'N/A'} | Err: ${e.error_message || 'None'}`);
    });

    // 3. Check for Stale Executions (Running for > 10m)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stale } = await supabase
        .from('flow_executions')
        .select('id')
        .eq('status', 'running')
        .lt('started_at', tenMinsAgo);

    if (stale && stale.length > 0) {
        console.log(`\n⚠️ Found ${stale.length} STALE 'running' executions. Worker might be stuck/crashed.`);
    }

    console.log('\n--- DIAGNOSIS END ---');
}

diagnose();
