import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Plus, Filter, Clock, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CrisisPacket } from '@/types/crisis';
import { useNavigate } from 'react-router-dom';
import { useUserActivations } from '@/hooks/useUserActivations';

export const CrisisList: React.FC = () => {
    const navigate = useNavigate();
    const [crises, setCrises] = useState<CrisisPacket[]>([]);
    const [loading, setLoading] = useState(true);
    const { activationIds, loading: activationsLoading } = useUserActivations();

    useEffect(() => {
        if (activationsLoading) return;

        // No activations = no access to crises
        if (activationIds.length === 0) {
            setCrises([]);
            setLoading(false);
            return;
        }

        fetchCrises();

        const subscription = supabase
            .channel('crisis_list_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'crisis_packets' }, () => {
                if (!activationsLoading) fetchCrises();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [activationIds, activationsLoading]);

    const fetchCrises = async () => {
        if (activationsLoading) return;
        try {
            const { data, error } = await supabase
                .from('crisis_packets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCrises(data || []);
        } catch (error) {
            console.error('Error fetching crises:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'border-l-purple-500 bg-purple-500/10 text-purple-500';
            case 'high': return 'border-l-red-500 bg-red-500/10 text-red-500';
            case 'medium': return 'border-l-amber-500 bg-amber-500/10 text-amber-500';
            case 'low': return 'border-l-blue-500 bg-blue-500/10 text-blue-500';
            default: return 'border-l-slate-500 bg-slate-500/10 text-slate-500';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Gestão de Crise</h1>
                    <p className="text-slate-400">Gerenciamento de pacotes de crise e resposta a incidentes.</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Pacote de Crise
                </Button>
            </div>

            <div className="flex gap-4 items-center bg-surface p-4 rounded-lg border border-slate-700/60">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por título, ID ou tag..."
                        className="pl-10 bg-slate-900 border-slate-700"
                    />
                </div>
                <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                </Button>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-500">Carregando crises...</div>
                ) : crises.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        Nenhuma crise encontrada.
                    </div>
                ) : (
                    crises.map((crisis) => (
                        <Card
                            key={crisis.id}
                            className={`border-l-4 transition-all cursor-pointer group hover:bg-slate-800/50 ${crisis.severity === 'high' ? 'border-l-red-500' :
                                crisis.severity === 'medium' ? 'border-l-amber-500' :
                                    'border-l-blue-500'
                                }`}
                            onClick={() => navigate(`/crisis/${crisis.id}`)}
                        >
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={crisis.severity === 'high' ? 'danger' : 'warning'}>
                                                {crisis.severity.toUpperCase()} SEVERIDADE
                                            </Badge>
                                            <span className="text-xs text-slate-500 font-mono">ID: {crisis.id.slice(0, 8)}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                                            {crisis.title}
                                        </h3>
                                        <p className="text-slate-400 text-sm max-w-2xl line-clamp-2">
                                            {crisis.description}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end text-slate-400 gap-1 mb-1">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-sm font-bold">{new Date(crisis.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {new Date(crisis.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex gap-4 text-sm text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <span className={`w-2 h-2 rounded-full ${crisis.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                            Status: <span className="text-white font-medium capitalize">{crisis.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="primary" size="sm" onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/crisis/${crisis.id}`);
                                        }}>
                                            Acessar War Room
                                            <Eye className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
