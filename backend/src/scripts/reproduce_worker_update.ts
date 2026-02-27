import { supabase } from '../config/supabase';

async function reproduce() {
    const FILE_ID = 'cb520588-a0b7-414e-b2d0-d0d5a8ba700e';
    console.log(`[Repro] Attempting to update file: ${FILE_ID}`);

    // 1. Check if visible
    const { data: check, error: checkError } = await supabase
        .from('activation_files')
        .select('id, status')
        .eq('id', FILE_ID)
        .single();

    if (checkError) console.error('[Repro] Read Error:', checkError);
    else console.log('[Repro] Current State:', check);

    // 2. Attempt Update
    const { data: update, error: updateError } = await supabase
        .from('activation_files')
        .update({ status: 'processing', processing_result: { debug: true } })
        .eq('id', FILE_ID)
        .select();

    if (updateError) console.error('[Repro] Update Error:', updateError);
    else console.log('[Repro] Update Result:', update);

}

reproduce();
