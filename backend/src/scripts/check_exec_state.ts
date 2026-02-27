import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
    console.log('--- Checking Last Flow Execution ---');
    const { data: executions, error } = await supabase
        .from('flow_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching executions:', error);
        return;
    }

    if (executions && executions.length > 0) {
        const exec = executions[0];
        console.log(`ID: ${exec.id}`);
        console.log(`Status: ${exec.status}`);
        console.log(`Context:`, exec.context);

        if (exec.context && exec.context.file_id) {
            console.log(`--- Checking File ID: ${exec.context.file_id} ---`);
            const { data: file, error: fileError } = await supabase
                .from('activation_files')
                .select('*')
                .eq('id', exec.context.file_id)
                .single();

            if (fileError) console.error('Error fetching file:', fileError);
            else console.log('File Status:', file.status);
        } else {
            console.log('⚠️ No file_id in context.');
        }
    } else {
        console.log('No executions found.');
    }
}

check();
