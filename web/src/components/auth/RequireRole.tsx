import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface RequireRoleProps {
    children: React.ReactNode;
    roles: ('admin' | 'analyst' | 'operator' | 'viewer')[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, roles }) => {
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const checkRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const userRole = session.user.user_metadata?.role || 'viewer';
            setRole(userRole);
            setLoading(false);
        };

        checkRole();
    }, []);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!role) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // @ts-ignore
    if (!roles.includes(role)) {
        return <Navigate to="/" replace />; // Unauthorized, go home or to 403 page
    }

    return <>{children}</>;
};
