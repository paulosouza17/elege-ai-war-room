import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function retry() {
    console.log('--- RETRYING STUCK FILES ---');

    // 1. Find Pending Files
    const { data: files, error } = await supabase
        .from('activation_files')
        .select('*')
        .eq('status', 'pending');

    if (error || !files || files.length === 0) {
        console.log('No pending files found to retry.');
        return;
    }

    console.log(`Found ${files.length} pending files.`);

    for (const file of files) {
        // 2. Find associated COMPLETED execution to reset
        // We look for executions where context->file_id matches
        const { data: executions } = await supabase
            .from('flow_executions')
            .select('id, status')
            .contains('context', { file_id: file.id })
            .eq('status', 'completed'); // Only retry if it "finished" without updating file

        if (executions && executions.length > 0) {
            console.log(`Re-queueing execution(s) for file: ${file.original_name} (${file.id})`);

            for (const exec of executions) {
                // Reset execution to pending
                await supabase
                    .from('flow_executions')
                    .update({
                        status: 'pending',
                        started_at: null,
                        completed_at: null,
                        execution_log: null
                    })
                    .eq('id', exec.id);

                console.log(` -> Reset Execution ID: ${exec.id}`);
            }
        }
    }
    console.log('--- DONE ---');
}

retry();
