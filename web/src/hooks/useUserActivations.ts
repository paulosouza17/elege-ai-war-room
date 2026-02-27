import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivationInfo {
    id: string;
    name: string;
    people_of_interest?: string[];
    keywords?: string[];
}

/**
 * Returns the activations the current user has access to.
 * Admin sees all active activations.
 * Non-admin sees only activations they created or were shared with via activation_users.
 */
export function useUserActivations() {
    const [activations, setActivations] = useState<ActivationInfo[]>([]);
    const [activationIds, setActivationIds] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const admin = profile?.role === 'admin';
            setIsAdmin(admin);

            if (admin) {
                const { data } = await supabase
                    .from('activations')
                    .select('id, name, people_of_interest, keywords')
                    .eq('status', 'active')
                    .order('name');
                const result = data || [];
                setActivations(result);
                setActivationIds(result.map(a => a.id));
            } else {
                // Non-admin: ONLY activations explicitly shared via activation_users
                const { data: sharedRows } = await supabase
                    .from('activation_users')
                    .select('activation_id')
                    .eq('user_id', user.id);

                const sharedIds = (sharedRows || []).map(r => r.activation_id);

                let result: ActivationInfo[] = [];
                if (sharedIds.length > 0) {
                    const { data } = await supabase
                        .from('activations')
                        .select('id, name, people_of_interest, keywords')
                        .eq('status', 'active')
                        .in('id', sharedIds)
                        .order('name');
                    result = data || [];
                }

                setActivations(result);
                setActivationIds(result.map(a => a.id));
            }
        } catch (err) {
            console.error('Error in useUserActivations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { activations, activationIds, isAdmin, loading, refresh };
}
