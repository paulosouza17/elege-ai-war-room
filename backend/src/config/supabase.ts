import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL or Key missing in environment variables.');
    // In production, this should likely throw error, but for dev we might warn
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseKey || '',
    {
        db: {
            schema: 'public', // CRITICAL: Enables Realtime broadcasts
        },
        auth: {
            persistSession: false, // Service role integration normally doesn't need session persistence
            autoRefreshToken: false,
        },
    }
);

