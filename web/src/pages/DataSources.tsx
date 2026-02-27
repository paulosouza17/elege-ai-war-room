import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Database, Link as LinkIcon, FileText, Upload, Globe, Search, BarChart3, Radio, AlertCircle, MessageSquare, BrainCircuit } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

// Tipos baseados na solicitação
type SourceLayer = 1 | 2 | 3;
type IntegrationStatus = 'connected' | 'disconnected' | 'configuring';

interface DataSource {
    id: string;
    name: string;
    description: string;
    layer: SourceLayer;
    capabilities: {
        api: boolean;
        attachments: boolean; // jpg, png, pdf, doc
        textInput: boolean;
        webhook: boolean;
    };
    icon: React.ElementType;
    status: IntegrationStatus;
    config?: any; // Store specific config
}

const initialSources: DataSource[] = [
    // Camada 1 (Essencial)
    { id: 'manus', name: 'Manus AI (Research)', description: 'Pesquisa profunda de matérias e documentos', layer: 1, capabilities: { api: true, attachments: true, textInput: true, webhook: false }, icon: BrainCircuit, status: 'disconnected' },
    { id: 'perplexity', name: 'Perplexity AI', description: 'Busca em tempo real e síntese de notícias', layer: 1, capabilities: { api: true, attachments: false, textInput: true, webhook: false }, icon: Search, status: 'disconnected' },
    { id: 'google_trends', name: 'Google Trends', description: 'Volume de busca e tendências em tempo real', layer: 1, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: Search, status: 'connected' },
    { id: 'semrush', name: 'SEMrush', description: 'Inteligência competitiva e análise de tráfego', layer: 1, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: BarChart3, status: 'disconnected' },
    { id: 'buzzsumo', name: 'BuzzSumo', description: 'Conteúdo viral e influenciadores', layer: 1, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: Globe, status: 'disconnected' },
    { id: 'twitter', name: 'X (Twitter)', description: 'Monitoramento de mar aberto (Firehose)', layer: 1, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: MessageSquare, status: 'connected' },

    // Camada 2 (Intermediária)
    { id: 'brandwatch', name: 'Brandwatch', description: 'Social Listening Enterprise', layer: 2, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: Radio, status: 'disconnected' },
    { id: 'similarweb', name: 'SimilarWeb', description: 'Análise de tráfego web detalhada', layer: 2, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: Globe, status: 'disconnected' },

    // Camada 3 (Sofisticada)
    { id: 'ahrefs', name: 'Ahrefs', description: 'Análise profunda de backlinks e autoridade', layer: 3, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: LinkIcon, status: 'disconnected' },
    { id: 'tse', name: 'Dados TSE', description: 'Cruzamento com base oficial eleitoral', layer: 3, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: Database, status: 'connected' },

    // Outros / Internos
    { id: 'elege_ai', name: 'Elege.AI Core', description: 'Ingestão nativa do sistema', layer: 1, capabilities: { api: true, attachments: true, textInput: true, webhook: true }, icon: Database, status: 'connected' },
];

export const DataSources: React.FC = () => {
    const [sources, setSources] = useState<DataSource[]>(initialSources);
    const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Config States
    const [manusConfig, setManusConfig] = useState({ includeDocs: true, includeLinks: true, specialPrompt: '' });
    const [perplexityConfig, setPerplexityConfig] = useState({ realtime: true });

    const handleConfigure = (source: DataSource) => {
        setSelectedSource(source);
        setIsConfigOpen(true);
    };

    const handleSaveConfig = () => {
        const updatedSources = sources.map(s => {
            if (s.id === selectedSource?.id) {
                return { ...s, status: 'connected' as IntegrationStatus };
            }
            return s;
        });
        setSources(updatedSources);
        setIsConfigOpen(false);
        // Here you would also persist to DB via API
    };

    const renderConfigContent = () => {
        if (!selectedSource) return null;

        if (selectedSource.id === 'manus') {
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Opções de Resposta</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="rounded bg-slate-900 border-slate-700"
                                    checked={manusConfig.includeDocs}
                                    onChange={(e) => setManusConfig({ ...manusConfig, includeDocs: e.target.checked })}
                                />
                                Documentos
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="rounded bg-slate-900 border-slate-700"
                                    checked={manusConfig.includeLinks}
                                    onChange={(e) => setManusConfig({ ...manusConfig, includeLinks: e.target.checked })}
                                />
                                Links
                            </label>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Prompt Especial (Contexto de Pesquisa)</label>
                        <textarea
                            className="w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-white text-sm focus:border-primary outline-none resize-none"
                            rows={4}
                            placeholder="Ex: Foque em matérias sobre segurança pública no estado de SP nos últimos 6 meses..."
                            value={manusConfig.specialPrompt}
                            onChange={(e) => setManusConfig({ ...manusConfig, specialPrompt: e.target.value })}
                        />
                    </div>
                </div>
            );
        }

        if (selectedSource.id === 'perplexity') {
            return (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <div>
                            <h4 className="font-medium text-white">Busca em Tempo Real</h4>
                            <p className="text-xs text-slate-400">Utilizar índice ao vivo da web para respostas.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={perplexityConfig.realtime}
                                onChange={(e) => setPerplexityConfig({ ...perplexityConfig, realtime: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center py-8 text-slate-500">
                Configurações padrão para {selectedSource.name}.
            </div>
        );
    };

    const renderLayer = (layer: SourceLayer, title: string, subtitle: string) => (
        <div className="space-y-4 mb-8">
            <div className="border-l-4 border-l-primary pl-4">
                <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-400">{subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sources.filter(s => s.layer === layer).map(source => (
                    <Card key={source.id} className="bg-slate-900 border-slate-700/60 hover:border-primary/50 transition-colors group">
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-slate-800 text-slate-300">
                                    <source.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base text-white">{source.name}</CardTitle>
                                    <div className="flex items-center gap-1 mt-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${source.status === 'connected' ? 'bg-success' : 'bg-slate-600'}`}></div>
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${source.status === 'connected' ? 'text-success' : 'text-slate-500'}`}>
                                            {source.status === 'connected' ? 'Conectado' : 'Desconectado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-400 mb-4 h-8 line-clamp-2">
                                {source.description}
                            </p>

                            <div className="flex gap-2 mb-4 border-t border-b border-slate-800 py-2">
                                <div className="flex flex-col items-center flex-1" title="API Support">
                                    <Database className={`w-3 h-3 mb-1 ${source.capabilities.api ? 'text-primary' : 'text-slate-600'}`} />
                                    <span className="text-[9px] text-slate-500">API</span>
                                </div>
                                <div className="flex flex-col items-center flex-1" title="Attachments Support">
                                    <Upload className={`w-3 h-3 mb-1 ${source.capabilities.attachments ? 'text-primary' : 'text-slate-600'}`} />
                                    <span className="text-[9px] text-slate-500">Anexo</span>
                                </div>
                                <div className="flex flex-col items-center flex-1" title="Webhook Support">
                                    <Globe className={`w-3 h-3 mb-1 ${source.capabilities.webhook ? 'text-primary' : 'text-slate-600'}`} />
                                    <span className="text-[9px] text-slate-500">Hook</span>
                                </div>
                                <div className="flex flex-col items-center flex-1" title="Text Input Support">
                                    <FileText className={`w-3 h-3 mb-1 ${source.capabilities.textInput ? 'text-primary' : 'text-slate-600'}`} />
                                    <span className="text-[9px] text-slate-500">Texto</span>
                                </div>
                            </div>

                            <Button
                                variant={source.status === 'connected' ? 'outline' : 'secondary'}
                                size="sm"
                                className="w-full"
                                onClick={() => handleConfigure(source)}
                            >
                                {source.status === 'connected' ? 'Configurar' : 'Conectar Fonte'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Database className="w-8 h-8 text-secondary" />
                        Fontes de Dados
                    </h1>
                    <p className="text-slate-400">Gerenciamento e configuração de entradas do sistema.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Importar Dados Manuais
                    </Button>
                    <Button variant="primary">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Diagnóstico de Conexão
                    </Button>
                </div>
            </div>

            <Card className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-500/30">
                <CardContent className="flex items-center justify-between p-6">
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-white">Objetivo: Radar de Narrativa Completo</h3>
                        <p className="text-sm text-blue-200">
                            Cruzamento ativo: <span className="font-bold text-white">Busca + Mídia + Social + Eleitoral</span>.
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-white">{sources.filter(s => s.status === 'connected').length}</span>
                            <span className="text-xs text-slate-400 uppercase">Fontes Ativas</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-success">98%</span>
                            <span className="text-xs text-slate-400 uppercase">Uptime</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {renderLayer(1, "Camada 1: Essencial", "Cobertura fundamental de Mar Aberto e tendências de busca principais.")}
            {renderLayer(2, "Camada 2: Governador / Presidencial", "Ferramentas Enterprise para análise de audiência e social listening avançado.")}
            {renderLayer(3, "Camada 3: Sofisticado (Deep Dive)", "Análise aprofundada de SEO, dados oficiais e inteligência cruzada.")}

            {/* Configuration Dialog */}
            <Dialog
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                title={`Configurar ${selectedSource?.name}`}
                description="Ajuste os parâmetros de conexão e coleta desta fonte."
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="ghost" onClick={() => setIsConfigOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveConfig} className="bg-success hover:bg-success/90 text-white">Salvar e Conectar</Button>
                    </div>
                }
            >
                {renderConfigContent()}
            </Dialog>

        </div>
    );
};
