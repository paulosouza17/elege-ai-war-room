import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Users, X, UserPlus } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

interface ActivationSharingProps {
    activationId: string;
    activationName: string;
}

interface SharedUser {
    id: string;
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    email: string;
    full_name: string;
}

export const ActivationSharing: React.FC<ActivationSharingProps> = ({ activationId, activationName }) => {
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('viewer');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSharedUsers();
        fetchAvailableUsers();
    }, [activationId]);

    const fetchSharedUsers = async () => {
        try {
            // First, get activation_users
            const { data: sharesData, error: sharesError } = await supabase
                .from('activation_users')
                .select('id, user_id, role')
                .eq('activation_id', activationId);

            if (sharesError) throw sharesError;

            if (!sharesData || sharesData.length === 0) {
                setSharedUsers([]);
                return;
            }

            // Then, get user profiles for those user_ids
            const userIds = sharesData.map(share => share.user_id);
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            // Merge the data
            const formattedUsers = sharesData.map((share: any) => {
                const profile = profilesData?.find(p => p.id === share.user_id);
                return {
                    id: share.id,
                    user_id: share.user_id,
                    role: share.role,
                    email: profile?.email || 'Unknown',
                    full_name: profile?.full_name || 'Unknown User'
                };
            });

            setSharedUsers(formattedUsers);
        } catch (error) {
            console.error('Error fetching shared users:', error);
        }
    };

    const fetchAvailableUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, role')
                .neq('role', 'admin'); // Admins don't need explicit sharing

            if (error) throw error;
            setAvailableUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleAddUser = async () => {
        if (!selectedUserId) {
            alert('Selecione um usuário');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('activation_users')
                .insert({
                    activation_id: activationId,
                    user_id: selectedUserId,
                    role: selectedRole
                });

            if (error) throw error;

            alert('Usuário adicionado com sucesso!');
            setSelectedUserId('');
            setSelectedRole('viewer');
            fetchSharedUsers();
        } catch (error: any) {
            console.error('Error adding user:', error);
            alert('Erro ao adicionar usuário: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveUser = async (shareId: string) => {
        if (!confirm('Remover acesso deste usuário?')) return;

        try {
            const { error } = await supabase
                .from('activation_users')
                .delete()
                .eq('id', shareId);

            if (error) throw error;

            alert('Acesso removido!');
            fetchSharedUsers();
        } catch (error: any) {
            console.error('Error removing user:', error);
            alert('Erro ao remover acesso: ' + error.message);
        }
    };

    const getRoleBadge = (role: string) => {
        const colors = {
            owner: 'bg-primary/20 text-primary border-primary/30',
            editor: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
            viewer: 'bg-slate-700 text-slate-300 border-slate-600'
        };
        return colors[role as keyof typeof colors] || colors.viewer;
    };

    return (
        <PermissionGate roles={['admin']}>
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Compartilhar Ativação: {activationName}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Add User Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-white">Adicionar Usuário</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                <option value="">Selecione um usuário...</option>
                                {availableUsers
                                    .filter(u => !sharedUsers.some(su => su.user_id === u.id))
                                    .map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.full_name || user.email} ({user.role})
                                        </option>
                                    ))}
                            </select>

                            <select
                                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as 'editor' | 'viewer')}
                            >
                                <option value="viewer">Viewer (Leitura)</option>
                                <option value="editor">Editor (Edição)</option>
                            </select>

                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAddUser}
                                disabled={loading || !selectedUserId}
                                className="w-full"
                            >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Adicionar
                            </Button>
                        </div>
                    </div>

                    {/* Shared Users List */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-white">Usuários com Acesso ({sharedUsers.length})</h4>
                        {sharedUsers.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">Nenhum usuário compartilhado ainda.</p>
                        ) : (
                            <div className="space-y-2">
                                {sharedUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-white">{user.full_name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs px-2 py-1 rounded border ${getRoleBadge(user.role)}`}>
                                                {user.role === 'owner' ? 'Dono' : user.role === 'editor' ? 'Editor' : 'Visualizador'}
                                            </span>
                                            {user.role !== 'owner' && (
                                                <button
                                                    onClick={() => handleRemoveUser(user.id)}
                                                    className="text-slate-500 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <p className="text-xs text-slate-500">
                            <strong>Dica:</strong> Admins sempre têm acesso total a todas as ativações, sem necessidade de compartilhamento explícito.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </PermissionGate>
    );
};
