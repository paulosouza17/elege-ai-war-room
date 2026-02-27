import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const FILE_ID = 'cb520588-a0b7-414e-b2d0-d0d5a8ba700e';

async function check() {
    console.log(`--- CHECKING STUCK FILE: ${FILE_ID} ---`);

    // 1. Check File Status
    const { data: file } = await supabase
        .from('activation_files')
        .select('*')
        .eq('id', FILE_ID)
        .single();

    console.log('File Status:', file?.status);

    // 2. Check Execution
    const { data: executions } = await supabase
        .from('flow_executions')
        .select('*')
        .contains('context', { file_id: FILE_ID })
        .order('created_at', { ascending: false })
        .limit(1);

    if (executions && executions.length > 0) {
        const exec = executions[0];
        console.log(`Execution ID: ${exec.id}`);
        console.log(`Status: ${exec.status}`);
        console.log(`Started: ${exec.started_at}`);
        console.log(`Current Time: ${new Date().toISOString()}`);

        if (exec.started_at) {
            const start = new Date(exec.started_at).getTime();
            const now = Date.now();
            const duration = (now - start) / 1000;
            console.log(`Running Duration: ${duration}s`);
        }
    } else {
        console.log('No execution found for this file.');
    }
}

check();
