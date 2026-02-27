import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, ShieldX, Loader2 } from 'lucide-react';

interface ReportPasswordGateProps {
    token: string;
    onAuthenticated: (activationId: string) => void;
}

const API_BASE = '';

export const ReportPasswordGate: React.FC<ReportPasswordGateProps> = ({ token, onAuthenticated }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || loading) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/report/public/${token}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success) {
                onAuthenticated(data.activation_id);
            } else {
                setAttempts(prev => prev + 1);
                setError(data.message || 'Senha incorreta.');
                setPassword('');
            }
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const isBlocked = attempts >= 5;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img src="/elege-logo.png" alt="Elege.ai" className="h-10 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white">Relatório de Inteligência</h1>
                    <p className="text-slate-400 text-sm mt-1">Este relatório é protegido por senha</p>
                </div>

                {isBlocked ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
                        <ShieldX className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <h2 className="text-lg font-bold text-red-400 mb-2">Acesso Bloqueado</h2>
                        <p className="text-slate-400 text-sm">
                            Muitas tentativas incorretas. Aguarde ou solicite novo link ao responsável.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Lock className="w-4 h-4 inline mr-1.5" />
                                Senha de Acesso
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Digite a senha do relatório"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                                    disabled={loading}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                                {error}
                                {attempts > 2 && <span className="block text-xs text-red-500/70 mt-1">Tentativas restantes: {5 - attempts}</span>}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!password || loading}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Acessar Relatório
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <p className="text-center text-slate-600 text-xs mt-6">
                    Powered by Elege.ai — Plataforma de Inteligência
                </p>
            </div>
        </div>
    );
};
