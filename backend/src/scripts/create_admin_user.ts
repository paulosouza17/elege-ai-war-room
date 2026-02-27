import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const email = 'paulosouza17@gmail.com';
const password = 'Proi933819391!';

async function createAdmin() {
    console.log(`🚀 Creating/Updating admin user: ${email}`);

    // 1. Create or Get User
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Paulo Souza (Super Admin)' }
    });

    let userId = user?.user?.id;

    if (createError) {
        if (createError.message.includes('already registered')) {
            console.log('⚠️ User already exists. Fetching ID...');
            const { data: listUsers } = await supabase.auth.admin.listUsers();
            const existingUser = listUsers.users.find(u => u.email === email);
            if (existingUser) {
                userId = existingUser.id;
                // Update password just in case
                await supabase.auth.admin.updateUserById(userId, { password });
                console.log('✅ Password updated.');
            } else {
                console.error('❌ Could not find existing user ID.');
                process.exit(1);
            }
        } else {
            console.error('❌ Error creating user:', createError.message);
            process.exit(1);
        }
    } else {
        console.log('✅ User created successfully.');
    }

    if (!userId) {
        console.error('❌ No User ID found.');
        process.exit(1);
    }

    // 2. Assign Role in 'profiles' table
    // Check if profile exists
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profile) {
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);

        if (updateError) console.error('❌ Error updating profile role:', updateError);
        else console.log('✅ Profile role updated to ADMIN.');
    } else {
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                full_name: 'Paulo Souza (Super Admin)',
                role: 'admin',
                created_at: new Date().toISOString()
            });

        if (insertError) console.error('❌ Error creating profile:', insertError);
        else console.log('✅ Profile created with ADMIN role.');
    }
}

createAdmin();
