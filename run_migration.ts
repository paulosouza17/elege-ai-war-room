import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Changed from SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in backend/.env');
    console.error('URL:', supabaseUrl);
    console.error('Key (exists):', !!supabaseKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    // Get file from args or default
    const fileName = process.argv[2] || 'add_manus_key.sql';
    const sqlPath = path.join(__dirname, fileName);

    if (!fs.existsSync(sqlPath)) {
        console.error(`Migration file not found: ${sqlPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`Running migration from ${fileName}...`);

    // Split by semicolons to handle multiple statements if needed, 
    // but supabase.rpc 'exec_sql' is the standard way if available.
    // Since we don't have that RPC enabled by default, lets try to use the REST API 
    // to just run a dummy selection to verify auth, then print instructions if we can't run DDL.
    // BUT! I see "create_flow_assignments.sql" has DDL. The JS client cannot execute DDL directly 
    // without a specific Postgres connection or an RPC wrapper.

    // Let's assume we can't run DDL via supabase-js client directly on the public interface 
    // unless we use the PG library.

    // Since I installed 'pg', let's use it!

    const { Client } = require('pg');
    // Construct connection string if not in env
    // connectionString is usually postgres://postgres:[password]@db.supabase.co:5432/postgres
    // We don't have the password in the .env file shown! 
    // We only have the service key.

    // If we only have the service key, we are limited to the API.
    // We can try to use the REST API to insert, but creating tables is DDL.

    console.log("---------------------------------------------------");
    console.log("⚠️ AUTOMATED MIGRATION VIA JS CLIENT IS LIMITED ⚠️");
    console.log("Please run the following SQL in the Supabase SQL Editor:");
    console.log("---------------------------------------------------");
    console.log(sql);
    console.log("---------------------------------------------------");
}

runMigration();
