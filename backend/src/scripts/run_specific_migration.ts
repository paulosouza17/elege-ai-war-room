import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

const MIGRATION_FILE = path.resolve(__dirname, '../../../migrations/fix_realtime_rls.sql');

async function run() {
    console.log(`🚀 Running migration: ${MIGRATION_FILE}`);

    try {
        const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

        // Split by semicolon to run statements individually if needed, 
        // but Postgres/Supabase RPC usually handles blocks.
        // For simplicity via RPC:
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('❌ RPC Error:', error);
            console.log('⚠️ Attempting direct SQL execution via postgres connection would be better, but restricted here. Please run via Supabase Dashboard SQL Editor.');
            console.log('\n--- SQL TO RUN ---\n');
            console.log(sql);
            console.log('\n------------------\n');
        } else {
            console.log('✅ Migration executed successfully via RPC.');
        }

    } catch (err) {
        console.error('❌ Script Error:', err);
    }
}

run();
