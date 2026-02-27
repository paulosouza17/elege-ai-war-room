import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const FILE_ID = 'cb520588-a0b7-414e-b2d0-d0d5a8ba700e';

async function reset() {
    console.log(`--- RESETTING STUCK FILE: ${FILE_ID} ---`);

    // 1. Reset Activation File
    const { error: fileError } = await supabase
        .from('activation_files')
        .update({ status: 'pending', processing_result: null })
        .eq('id', FILE_ID);

    if (fileError) console.error('Error resetting file:', fileError.message);
    else console.log('✅ File reset to pending.');

    // 2. Reset associated Execution(s)
    const { data: executions } = await supabase
        .from('flow_executions')
        .select('id')
        .contains('context', { file_id: FILE_ID });

    if (executions && executions.length > 0) {
        for (const exec of executions) {
            await supabase
                .from('flow_executions')
                .update({
                    status: 'pending',
                    started_at: null,
                    completed_at: null,
                    execution_log: null
                })
                .eq('id', exec.id);
            console.log(`✅ Execution ${exec.id} reset to pending.`);
        }
    }
}

reset();
