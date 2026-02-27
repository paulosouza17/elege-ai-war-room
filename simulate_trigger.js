// Script to simulate a data source trigger
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateTrigger() {
    console.log('--- Simulating Data Source Trigger ---');

    const triggerType = 'source:mentions';
    const payload = {
        source: 'twitter',
        external_id: `sim_${Date.now()}`,
        text: 'A crise hídrica está afetando o abastecimento na região norte. #crise #agua',
        author: 'SimulatedUser',
        url: 'https://twitter.com/sim/123',
        created_at: new Date().toISOString()
    };

    console.log(`Trigger Type: ${triggerType}`);
    console.log('Payload:', payload);

    // We can't directly call the backend service method here easily without setting up the whole NestJS context.
    // However, if we deployed an endpoint, we could hit it.
    // For now, let's just insert into the 'mentions' table and see if a flow *would* be triggered 
    // IF the ingestion service was listening.

    // BUT since we don't have the ingestion service running the 'triggerFlow' logic yet (it's in FlowService but not hooked up to DB events),
    // we need to call the FlowService logic.

    // Alternative: We can use the 'manual' trigger via API if we had one.

    // Let's rely on the fact that I implemented 'triggerFlow' in FlowService.
    // I will creating a small script that instantiates FlowService and calls it.

    console.log('To test this end-to-end, we need the backend running and an endpoint to receive this, or a script that imports FlowService.');
    console.log('Use: npx ts-node src/scripts/test-trigger.ts (if set up)');
}

simulateTrigger();
