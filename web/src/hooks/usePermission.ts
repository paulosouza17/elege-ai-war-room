import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Role = 'admin' | 'analyst' | 'operator' | 'viewer';

export const usePermission = () => {
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const userRole = user.user_metadata?.role as Role || 'viewer';
                setRole(userRole);
            }
            setLoading(false);
        };

        fetchRole();
    }, []);

    const hasRole = (allowedRoles: Role[]) => {
        if (!role) return false;
        return allowedRoles.includes(role);
    };

    return { role, loading, hasRole };
};
