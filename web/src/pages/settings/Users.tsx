import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Trash2, Loader2, User as UserIcon, CheckCircle, XCircle, Clock, ShieldCheck, Shield } from 'lucide-react';

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'analyst' | 'operator' | 'viewer';
    is_approved: boolean;
    created_at: string;
}

export const Users: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

    const [newUser, setNewUser] = useState({
        email: '',
        fullName: '',
        role: 'viewer',
        password: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, role, is_approved, created_at')
                .order('is_approved', { ascending: true }) // Pending first
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: newUser.email,
                password: newUser.password,
                options: {
                    data: {
                        full_name: newUser.fullName,
                        role: newUser.role
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Falha ao criar usuário');

            // Admin-created users are auto-approved
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: newUser.email,
                    full_name: newUser.fullName,
                    role: newUser.role,
                    is_approved: true
                }, { onConflict: 'id' });

            if (profileError) console.warn('Profile update warning:', profileError);

            setShowModal(false);
            setNewUser({ email: '', fullName: '', role: 'viewer', password: '' });
            setTimeout(fetchUsers, 500);

        } catch (error: any) {
            console.error('Error creating user:', error);
            alert('Erro: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleApproveUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_approved: true })
                .eq('id', userId);

            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u));
        } catch (error: any) {
            alert('Erro ao aprovar: ' + error.message);
        }
    };

    const handleRejectUser = async (userId: string) => {
        if (!confirm('Tem certeza que deseja rejeitar e remover este usuário?')) return;

        try {
            // Remove from profiles
            await supabase.from('profiles').delete().eq('id', userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error: any) {
            alert('Erro ao rejeitar: ' + error.message);
        }
    };

    const handleRevokeAccess = async (userId: string) => {
        if (!confirm('Revogar acesso? O usuário não poderá mais entrar.')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_approved: false })
                .eq('id', userId);

            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: false } : u));
        } catch (error: any) {
            alert('Erro: ' + error.message);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Remover permanentemente este usuário?')) return;

        try {
            await supabase.from('profiles').delete().eq('id', userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error: any) {
            alert('Erro: ' + error.message);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
        } catch (error: any) {
            alert('Erro: ' + error.message);
        }
    };

    const getRoleBadge = (role: string) => {
        const styles: Record<string, string> = {
            admin: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
            analyst: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
            operator: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
            viewer: 'bg-slate-500/20 text-slate-400 border-slate-500/50'
        };
        const style = styles[role] || styles.viewer;
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${style}`}>
                {role}
            </span>
        );
    };

    const getStatusBadge = (isApproved: boolean) => {
        if (isApproved) {
            return (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                    <CheckCircle className="w-3 h-3" /> Ativo
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse">
                <Clock className="w-3 h-3" /> Pendente
            </span>
        );
    };

    const pendingCount = users.filter(u => !u.is_approved).length;
    const filteredUsers = filter === 'all' ? users
        : filter === 'pending' ? users.filter(u => !u.is_approved)
            : users.filter(u => u.is_approved);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <UserIcon className="w-6 h-6 text-indigo-400" />
                        Gerenciamento de Usuários
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Gerencie acesso, permissões e aprovações da equipe.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <UserPlus className="w-4 h-4" />
                    Novo Usuário
                </button>
            </div>

            {/* Pending Alert */}
            {pendingCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-300">
                            {pendingCount} usuário{pendingCount > 1 ? 's' : ''} aguardando aprovação
                        </p>
                        <p className="text-xs text-amber-400/60 mt-0.5">
                            Aprove ou rejeite os cadastros pendentes abaixo.
                        </p>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 w-fit">
                {[
                    { key: 'all' as const, label: 'Todos', count: users.length },
                    { key: 'pending' as const, label: 'Pendentes', count: pendingCount },
                    { key: 'approved' as const, label: 'Ativos', count: users.length - pendingCount },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2 ${filter === tab.key
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === tab.key ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 flex justify-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        {filter === 'pending' ? 'Nenhuma aprovação pendente. 🎉' : 'Nenhum usuário encontrado.'}
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Criado em</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className={`hover:bg-slate-800/50 transition-colors ${!user.is_approved ? 'bg-amber-500/5' : ''}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${!user.is_approved
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                                }`}>
                                                {user.full_name?.charAt(0) || user.email.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-slate-200">{user.full_name || 'Sem nome'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-400 font-mono">{user.email}</td>
                                    <td className="p-4">
                                        {user.is_approved ? (
                                            <select
                                                value={user.role}
                                                onChange={e => handleRoleChange(user.id, e.target.value)}
                                                className="bg-transparent border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="operator">Operator</option>
                                                <option value="analyst">Analyst</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        ) : (
                                            getRoleBadge(user.role)
                                        )}
                                    </td>
                                    <td className="p-4">{getStatusBadge(user.is_approved)}</td>
                                    <td className="p-4 text-sm text-slate-500">
                                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {!user.is_approved ? (
                                                <>
                                                    <button
                                                        onClick={() => handleApproveUser(user.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-xs font-medium transition-all"
                                                        title="Aprovar"
                                                    >
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectUser(user.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs font-medium transition-all"
                                                        title="Rejeitar"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Rejeitar
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleRevokeAccess(user.id)}
                                                            className="text-slate-500 hover:text-amber-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                                                            title="Revogar acesso"
                                                        >
                                                            <Shield className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                                                        title="Remover usuário"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-white mb-1">Adicionar Novo Usuário</h3>
                        <p className="text-xs text-slate-500 mb-4">Usuários criados por admin são aprovados automaticamente.</p>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.fullName}
                                    onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"
                                    placeholder="joao@campaign.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Temporária</label>
                                <input
                                    type="password"
                                    required
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função (Role)</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"
                                >
                                    <option value="viewer">Viewer (Observador)</option>
                                    <option value="operator">Operator (Operacional)</option>
                                    <option value="analyst">Analyst (Analista)</option>
                                    <option value="admin">Admin (Estrategista)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Criar Usuário
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
