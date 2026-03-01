import React, { useEffect, useState } from 'react';
import { Bell, User, Search, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUser(user);
        });
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-10 transition-all">
            <div></div>

            <div className="flex items-center gap-6">
                <button className="relative text-slate-400 hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full animate-pulse"></span>
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-700">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-medium text-white">{user?.user_metadata?.full_name || user?.email || 'Usuário'}</div>
                        <div className="text-xs text-slate-500 capitalize">{user?.user_metadata?.role || 'Viewer'}</div>
                    </div>
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
                        <User className="w-4 h-4 text-slate-300" />
                    </div>

                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors ml-2"
                        title="Sair do Sistema"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};
