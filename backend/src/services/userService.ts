import { SupabaseClient } from '@supabase/supabase-js';

export class UserService {
    private supabase: SupabaseClient;

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
    }

    async createUser(email: string, fullName: string, role: string, password?: string) {
        console.log(`[UserService] Creating user: ${email} (Role: ${role})`);

        // 1. Create User in Auth
        const { data: user, error } = await this.supabase.auth.admin.createUser({
            email,
            password: password || undefined, // If undefined, Supabase generates one or sends magic link (if config allows)
            // Ideally we want to set a temp password or rely on email confirm. 
            // For this MVP, let's require password or generate a random one.
            email_confirm: true, // Auto confirm since admin is creating
            user_metadata: {
                full_name: fullName,
                role: role
            }
        });

        if (error) {
            console.error('[UserService] Failed to create user:', error);
            throw new Error(`Failed to create user: ${error.message}`);
        }

        if (!user.user) {
            throw new Error('User creation returned no user object.');
        }

        // 2. Profile Sync (Handled by Trigger, but we can verify or update if needed)
        // Since we passed metadata, the trigger should have set the role.

        return user.user;
    }

    async listUsers() {
        // Use profiles table for listing as it has the role
        const { data: profiles, error } = await this.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to list users: ${error.message}`);
        }
        return profiles;
    }

    async updateUserRole(userId: string, role: string) {
        // Update auth metadata
        await this.supabase.auth.admin.updateUserById(userId, {
            user_metadata: { role }
        });

        // Update profile
        const { error } = await this.supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId);

        if (error) throw error;
        return true;
    }

    async deleteUser(userId: string) {
        const { error } = await this.supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
        return true;
    }
}
