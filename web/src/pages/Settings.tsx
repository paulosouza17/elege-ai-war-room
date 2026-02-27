import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Users as UsersIcon, BookUser, Shield } from 'lucide-react';
import { CrisisParameters } from './settings/CrisisParameters';
import { Integrations } from './settings/Integrations';
import { Users } from './settings/Users';
import { EntityWatchlist } from './EntityWatchlist';
import { NeutralityPolicy } from './settings/NeutralityPolicy';

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'users' | 'crisis' | 'entities' | 'neutrality'>('crisis');

    return (
        <div className="flex h-screen bg-slate-950">
            {/* Sidebar Navigation for Settings */}
            <div className="w-64 border-r border-slate-800 bg-slate-900/50 p-6">
                <h1 className="text-2xl font-bold text-white mb-8">Configurações</h1>

                <nav className="space-y-2">
                    <button
                        onClick={() => setActiveTab('crisis')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'crisis' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <SettingsIcon className="w-5 h-5" />
                        <span className="font-medium">Calibração de Crise</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('entities')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'entities' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <BookUser className="w-5 h-5" />
                        <span className="font-medium">Entidades Cadastradas</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('neutrality')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'neutrality' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Shield className="w-5 h-5" />
                        <span className="font-medium">Neutralidade IA</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('general')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'general' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <SettingsIcon className="w-5 h-5" />
                        <span className="font-medium">Geral</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <UsersIcon className="w-5 h-5" />
                        <span className="font-medium">Usuários</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('integrations')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'integrations' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Database className="w-5 h-5" />
                        <span className="font-medium">Integrações de Dados</span>
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-8">
                <div className="max-w-5xl mx-auto">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white">Configurações Gerais</h2>
                            <p className="text-slate-400">Configurações do sistema.</p>
                        </div>
                    )}

                    {activeTab === 'users' && <Users />}

                    {activeTab === 'integrations' && <Integrations />}

                    {activeTab === 'crisis' && <CrisisParameters />}

                    {activeTab === 'entities' && <EntityWatchlist />}

                    {activeTab === 'neutrality' && <NeutralityPolicy />}
                </div>
            </div>
        </div>
    );
};

