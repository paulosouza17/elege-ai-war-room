import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGateProps {
    children: React.ReactNode;
    roles: ('admin' | 'analyst' | 'operator' | 'viewer')[];
    fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ children, roles, fallback = null }) => {
    const { role, loading } = usePermission();

    if (loading) return null; // Or a skeleton

    if (!role || !roles.includes(role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
