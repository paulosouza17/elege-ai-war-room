import React from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global ErrorBoundary — catches any unhandled JS error in the React tree
 * and shows a recovery UI instead of a white screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0a0f1e',
                    color: '#e2e8f0',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                    <div style={{
                        maxWidth: 480,
                        textAlign: 'center',
                        padding: 40,
                        borderRadius: 16,
                        background: 'rgba(15,23,42,0.8)',
                        border: '1px solid rgba(100,116,139,0.2)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#f8fafc' }}>
                            Algo deu errado
                        </h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 24 }}>
                            Ocorreu um erro inesperado. Tente recarregar a página.
                        </p>
                        <details style={{
                            textAlign: 'left',
                            fontSize: 11,
                            color: '#64748b',
                            background: 'rgba(2,6,23,0.5)',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 24,
                            border: '1px solid rgba(100,116,139,0.15)',
                        }}>
                            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Detalhes do erro</summary>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontFamily: 'monospace',
                                fontSize: 10,
                            }}>
                                {this.state.error?.message}
                                {'\n'}
                                {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
                            </pre>
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '10px 32px',
                                borderRadius: 8,
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: 'pointer',
                                transition: 'opacity 0.2s',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
