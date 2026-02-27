import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const FIXED_FLOW_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

async function ensureSystemFlow() {
    console.log('🔄 Ensuring System Manual Input Flow exists...');

    // 1. Get Admin User
    const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

    if (userError || !userData) {
        console.error('❌ Could not find an admin user to own the flow:', userError);
        process.exit(1);
    }

    const userId = userData.id;
    console.log(`👤 Assigning flow to Admin ID: ${userId}`);

    // 2. Upsert Flow with Fixed ID
    const { data: flow, error: flowError } = await supabase
        .from('flows')
        .upsert({
            id: FIXED_FLOW_ID,
            user_id: userId,
            name: 'Fluxo de Entrada Manual',
            description: 'Fluxo padrão para processamento de arquivos via upload manual.',
            active: true,
            nodes: [],
            edges: [],
            is_template: false
        })
        .select()
        .single();

    if (flowError) {
        console.error('❌ Error creating/updating flow:', flowError);
    } else {
        console.log('✅ System Flow Ready:', flow);
    }
}

ensureSystemFlow();
