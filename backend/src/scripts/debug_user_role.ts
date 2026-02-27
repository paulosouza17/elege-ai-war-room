import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const targetId = '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523';

async function inspectUser() {
    console.log(`🔍 Inspecting User: ${targetId}`);

    // 1. Check Auth User Metadata
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(targetId);
    if (authError) console.error('Auth Error:', authError.message);
    else {
        console.log('--- Auth Metadata ---');
        console.log('Email:', user?.email);
        console.log('Role (JWT):', user?.role); // This is usually 'authenticated'
        console.log('User Metadata:', user?.user_metadata);
    }

    // 2. Check Public Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

    if (profileError) console.error('Profile Error:', profileError.message);
    else {
        console.log('--- Public Profile ---');
        console.log(profile);
    }
}

inspectUser();
