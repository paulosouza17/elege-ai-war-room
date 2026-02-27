import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import {
    LayoutDashboard,
    AlertTriangle,
    FileText,
    Settings,
    ShieldAlert,
    BrainCircuit,
    Database,
    Zap,
    Webhook,
    TrendingUp,
    ChevronDown,
    ChevronRight,
    List,
    Sparkles,
    History,

    Workflow,
    Users,
    Tv,
    Server
} from 'lucide-react';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
    const [automationsOpen, setAutomationsOpen] = useState(true);
    const { role } = usePermission();

    const navItems = [
        { icon: LayoutDashboard, label: 'Visão Geral', to: '/', roles: ['admin', 'analyst', 'operator', 'viewer'] },
        { icon: TrendingUp, label: 'Feed Inteligente', to: '/feed', roles: ['admin', 'analyst', 'operator', 'viewer'] },
        { icon: Database, label: 'Input Manual', to: '/manual-ingest', roles: ['admin', 'analyst', 'operator'] },
        { icon: Zap, label: 'Ativações', to: '/activations', roles: ['admin', 'analyst', 'operator', 'viewer'] },
        { icon: AlertTriangle, label: 'Gestão de Crise', to: '/crisis', roles: ['admin', 'analyst', 'operator', 'viewer'] },
        { icon: Users, label: 'Alvos Monitorados', to: '/entities', roles: ['admin', 'analyst'] },
        { icon: BrainCircuit, label: 'Cenários', to: '/scenarios', roles: ['admin', 'analyst'] },
        { icon: ShieldAlert, label: 'Ameaças', to: '/threats', roles: ['admin', 'analyst', 'operator', 'viewer'] },
        { icon: Database, label: 'Fontes de Dados', to: '/sources', roles: ['admin', 'analyst'] },
        { icon: Tv, label: 'Veículos de Mídia', to: '/media-outlets', roles: ['admin'] },
        { icon: FileText, label: 'Relatórios', to: '/reports', roles: ['admin', 'analyst', 'operator', 'viewer'] },
        { icon: BrainCircuit, label: 'Modelos de IA', to: '/settings/ai', roles: ['admin'] },
        { icon: Settings, label: 'Configurações', to: '/settings', roles: ['admin'] },
        { icon: Server, label: 'Servidor', to: '/server', roles: ['admin'] },
    ];

    const automationSubmenu = [
        { icon: List, label: 'Meus Flows', to: '/flows', roles: ['admin', 'analyst', 'operator'] },
        { icon: Workflow, label: 'Builder', to: '/flows/builder', roles: ['admin', 'analyst'] },
        { icon: Sparkles, label: 'Saída de Flows', to: '/flows/outputs', roles: ['admin', 'analyst', 'operator', 'viewer'] },
        { icon: History, label: 'Histórico', to: '/flows/history', roles: ['admin', 'analyst', 'operator'] },
    ];

    // Helper to check if item should be shown
    const shouldShow = (itemRoles: string[]) => {
        if (!role) return false;
        // @ts-ignore
        return itemRoles.includes(role);
    };

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-20">
            <div className="p-6 flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-danger" />
                <span className="text-xl font-bold tracking-wider text-white">WAR ROOM</span>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.filter(i => shouldShow(i.roles)).map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200',
                                isActive
                                    ? 'bg-primary/20 text-primary border-r-2 border-primary'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            )
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}

                {/* Automações submenu - Show if user has access to at least one submenu item */}
                {automationSubmenu.some(i => shouldShow(i.roles)) && (
                    <div>
                        <button
                            onClick={() => setAutomationsOpen(!automationsOpen)}
                            className="flex items-center justify-between w-full gap-3 px-4 py-3 rounded-md transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <Webhook className="w-5 h-5" />
                                <span className="font-medium">Automações (Beta)</span>
                            </div>
                            {automationsOpen ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>

                        {automationsOpen && (
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-800">
                                {automationSubmenu.filter(i => shouldShow(i.roles)).map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            clsx(
                                                'flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200 text-sm',
                                                isActive
                                                    ? 'bg-primary/20 text-primary border-r-2 border-primary'
                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                            )
                                        }
                                    >
                                        <item.icon className="w-4 h-4" />
                                        <span className="font-medium">{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="text-xs text-slate-500 font-mono">
                    STATUS SISTEMA: ONLINE<br />
                    DATA: {new Date().toLocaleDateString()}<br />
                    USER: {role?.toUpperCase() || '...'}
                </div>
            </div>
        </aside>
    );
};
