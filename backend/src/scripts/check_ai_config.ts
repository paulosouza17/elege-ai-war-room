
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

async function checkConfig() {
    console.log('--- Checking AI Config ---');

    // 1. Check AI Configs table
    const { data: configs, error } = await supabase
        .from('ai_configs')
        .select('*');

    if (error) {
        console.error('Error fetching ai_configs:', error.message);
        return;
    }

    if (!configs || configs.length === 0) {
        console.log('No AI configurations found in DB.');
    } else {
        console.log('Found AI Configs:', configs);
    }
}

checkConfig();
