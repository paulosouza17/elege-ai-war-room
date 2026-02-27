import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const targetId = '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523';

async function syncRole() {
    console.log(`🔄 Syncing role for User: ${targetId}`);

    const { data: user, error } = await supabase.auth.admin.updateUserById(
        targetId,
        { user_metadata: { role: 'admin' } }
    );

    if (error) {
        console.error('❌ Error updating user metadata:', error.message);
    } else {
        console.log('✅ User metadata updated successfully.');
        console.log('New Metadata:', user.user.user_metadata);
    }
}

syncRole();
