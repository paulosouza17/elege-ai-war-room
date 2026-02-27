import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const EMAIL = 'admin@warroom.ai';
const PASSWORD = 'admin-password-123'; // Temporary password
const FULL_NAME = 'Sistema Admin';

async function createAdminUser() {
    console.log(`🔨 Creating/Verifying Admin User: ${EMAIL}`);

    // Check if user exists (by email) - implicit check via createUser which fails if exists usually, 
    // or we can list users but that's paginated. 
    // createUser is easiest: if it fails with "User already registered", we just update it.

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
            full_name: FULL_NAME,
            role: 'admin'
        }
    });

    if (createError) {
        if (createError.message.includes('already registered') || createError.status === 422) {
            console.log('ℹ️ User already exists. Updating role to admin...');
            // Find user ID (we need to list to find ID by email)
            const { data: users, error: listError } = await supabase.auth.admin.listUsers();
            const user = users?.users.find(u => u.email === EMAIL);

            if (user) {
                const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
                    user_metadata: { ...user.user_metadata, role: 'admin' }
                });

                if (updateError) {
                    console.error('❌ Failed to update user role:', updateError);
                } else {
                    console.log('✅ User role updated to admin.');
                    console.log(`📧 Email: ${EMAIL}`);
                    console.log(`🔑 Password: ${PASSWORD} (Use the existing one if you changed it)`);
                }
            } else {
                console.error('❌ Could not find user to update.');
            }
        } else {
            console.error('❌ Failed to create user:', createError);
        }
    } else {
        console.log('✅ Admin user created successfully!');
        console.log(`📧 Email: ${EMAIL}`);
        console.log(`🔑 Password: ${PASSWORD}`);
        console.log(`🆔 ID: ${newUser.user.id}`);
    }
}

createAdminUser();
