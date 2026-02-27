
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixModel() {
    console.log('--- Fixing AI Model Config ---');

    const clientId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    const newModel = 'gemini-2.0-flash'; // Confirmed valid from list_all_models.ts

    const { data, error } = await supabase
        .from('ai_configs')
        .update({ model: newModel })
        .eq('client_id', clientId)
        .select();

    if (error) {
        console.error('Error updating config:', error.message);
    } else {
        console.log('Successfully updated config:', data);
    }
}

fixModel();
