import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [approvalStatus, setApprovalStatus] = useState<'approved' | 'pending' | 'checking'>('checking');
    const location = useLocation();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                checkApproval(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                checkApproval(session.user.id);
            } else {
                setLoading(false);
                setApprovalStatus('checking');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkApproval = async (userId: string) => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_approved, role')
                .eq('id', userId)
                .single();

            if (error || !profile) {
                // Profile not found or RLS blocks access — default to approved
                // This prevents locking out existing users if column doesn't exist yet
                console.warn('[RequireAuth] Profile query failed, defaulting to approved:', error?.message);
                setApprovalStatus('approved');
            } else if (profile.role === 'admin') {
                // Admins are always approved
                setApprovalStatus('approved');
            } else if (profile.is_approved === false) {
                // Only block when EXPLICITLY set to false
                setApprovalStatus('pending');
            } else {
                // true, null, undefined → all approved (backward compat)
                setApprovalStatus('approved');
            }
        } catch {
            // On any error, default to approved to not lock out users
            console.warn('[RequireAuth] Approval check failed, defaulting to approved');
            setApprovalStatus('approved');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (approvalStatus === 'pending') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 max-w-md text-center shadow-2xl">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="w-8 h-8 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Acesso Pendente</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Sua conta foi criada com sucesso, mas ainda não foi aprovada por um administrador.
                        Você receberá acesso assim que um admin autorizar.
                    </p>
                    <div className="bg-slate-950 rounded-lg p-4 mb-6">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Conta</p>
                        <p className="text-sm text-slate-300 font-mono">{session.user.email}</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => checkApproval(session.user.id)}
                            className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-sm font-medium transition-colors"
                        >
                            Verificar Novamente
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2.5 text-slate-500 hover:text-red-400 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
