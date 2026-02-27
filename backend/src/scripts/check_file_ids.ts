import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const FILE_IDS = [
    'cb520588-a0b7-414e-b2d0-d0d5a8ba700e',
    '7cb2f364-8091-4eac-af9c-252d93c81931',
    '8e7f31cd-c0e5-4b1c-8638-f94b5193e9fc'
];

async function check() {
    console.log('--- CHECKING SPECIFIC FILE IDs ---');

    const { data: files, error } = await supabase
        .from('activation_files')
        .select('*')
        .in('id', FILE_IDS);

    if (error) console.error('Error:', error);
    else {
        console.log(`Found ${files?.length} files matching execution contexts.`);
        files?.forEach(f => {
            console.log(`ID: ${f.id}`);
            console.log(`Activation ID: ${f.activation_id}`);
            console.log(`Original Name: ${f.original_name}`);
            console.log(`Status: ${f.status}`);
            console.log(`Processing Result:`, f.processing_result ? 'Has Data' : 'NULL');
            console.log('---');
        });
    }
}

check();
