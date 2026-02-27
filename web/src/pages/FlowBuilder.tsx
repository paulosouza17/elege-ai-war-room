import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FLOW_TEMPLATES } from '@/data/flowTemplates';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    Connection,
    Edge,
    Node,
    useNodesState,
    useEdgesState,
    Panel,
    BackgroundVariant,
    ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DeletableEdge } from '@/components/DeletableEdge';
import {
    Zap,
    Globe,
    MessageSquare,
    ArrowRight,
    Play,
    Save,
    MousePointer2,
    Box,
    Database,
    Webhook,

    Filter,
    X,
    BrainCircuit,
    Settings,
    Trash2,
    Loader2,
    Search,
    Upload,
    Twitter,
    Building,
    FileText,

    Users,
    CheckCircle2,
    Repeat,
    GitBranch,
    Tv,
    GitMerge,
    Link2,
    Bug,
    Share2,
    Brain,
    TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';

import TriggerNode from '../components/flow/TriggerNode';
import ActionNode from '../components/flow/ActionNode';
import ConditionNode from '../components/flow/ConditionNode';
import { ExecutionPanel } from '../components/ExecutionVisualization';

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

interface ActivationOption {
    id: string;
    name: string;
    status: string;
    description?: string;
    keywords?: string[];
    people_of_interest?: string[];
    category?: string;
}

interface FlowAssignment {
    id: string;
    flow_id: string;
    user_id: string | null;
    activation_id: string | null;
    assigned_at: string;
    user_name?: string;
    activation_name?: string;
}

const defaultNodes: Node[] = [];
const defaultEdges: Edge[] = [];

// Variable schema map — defines which variables each node type exposes
const NODE_VARIABLES: Record<string, { key: string; label: string; type: 'text' | 'list'; icon: string }[]> = {
    'trigger:activation': [
        { key: 'briefing', label: 'Briefing', type: 'text', icon: '📝' },
        { key: 'keywords', label: 'Palavras-chave', type: 'list', icon: '🏷' },
        { key: 'people_of_interest', label: 'Pessoas de Interesse', type: 'list', icon: '👥' },
        { key: 'monitored_media', label: 'Mídias Monitoradas', type: 'list', icon: '📺' },
        { key: 'activation_name', label: 'Nome da Ativação', type: 'text', icon: '📌' },
        { key: 'category', label: 'Categoria', type: 'text', icon: '📂' },
    ],
    'trigger:manual': [
        { key: 'extractedText', label: 'Texto Extraído', type: 'text', icon: '📄' },
        { key: 'originalName', label: 'Nome do Arquivo', type: 'text', icon: '📎' },
        { key: 'fileUrl', label: 'URL do Arquivo', type: 'text', icon: '🔗' },
    ],
    'ai': [
        { key: 'summary', label: 'Resumo IA', type: 'text', icon: '🧠' },
        { key: 'title', label: 'Título', type: 'text', icon: '📰' },
        { key: 'risk_score', label: 'Score de Risco', type: 'text', icon: '⚠️' },
        { key: 'sentiment', label: 'Sentimento', type: 'text', icon: '💬' },
        { key: 'source_name', label: 'Veículo', type: 'text', icon: '📺' },
        { key: 'content_type_detected', label: 'Tipo de Conteúdo', type: 'text', icon: '📁' },
        { key: 'keywords', label: 'Palavras-chave', type: 'list', icon: '🏷' },
        { key: 'entities', label: 'Entidades', type: 'list', icon: '👥' },
        { key: 'people_found', label: 'Pessoas Encontradas', type: 'list', icon: '🔍' },
        { key: 'keyword_matches', label: 'Keywords Detectadas', type: 'list', icon: '✅' },
        { key: 'context_analysis', label: 'Análise Contextual', type: 'list', icon: '📋' },
        { key: 'relevance_explanation', label: 'Relevância', type: 'text', icon: '💡' },
        { key: 'items', label: 'Itens Analisados', type: 'list', icon: '📊' },
        { key: 'count', label: 'Quantidade', type: 'text', icon: '#️⃣' },
    ],
    'httprequest': [
        { key: 'raw', label: 'Resposta Raw', type: 'text', icon: '📦' },
        { key: 'items', label: 'Itens da Resposta', type: 'list', icon: '📊' },
        { key: 'statusCode', label: 'Status Code', type: 'text', icon: '🔢' },
        { key: 'summary', label: 'Resumo', type: 'text', icon: '📝' },
    ],
    'manus': [
        { key: 'items', label: 'Resultados Manus', type: 'list', icon: '🔍' },
        { key: 'count', label: 'Quantidade', type: 'text', icon: '#️⃣' },
    ],
    'perplexity': [
        { key: 'items', label: 'Resultados Perplexity', type: 'list', icon: '🌐' },
        { key: 'count', label: 'Quantidade', type: 'text', icon: '#️⃣' },
    ],
    'publish': [
        { key: 'publishedCount', label: 'Itens Publicados', type: 'text', icon: '📤' },
    ],
    'loop': [
        { key: 'iterations', label: 'Total de Iterações', type: 'text', icon: '🔢' },
        { key: 'items', label: 'Lista Original', type: 'list', icon: '📋' },
        { key: 'currentItem', label: 'Item Atual', type: 'text', icon: '👉' },
    ],
    'triggerflow': [
        { key: 'triggered', label: 'Acionado', type: 'text', icon: '✅' },
        { key: 'executionId', label: 'ID da Execução', type: 'text', icon: '🆔' },
        { key: 'targetFlowName', label: 'Nome do Flow', type: 'text', icon: '📝' },
    ],
    'mediaoutlet': [
        { key: 'items', label: 'Veículos', type: 'list', icon: '📺' },
        { key: 'count', label: 'Quantidade', type: 'text', icon: '🔢' },
        { key: 'names', label: 'Nomes', type: 'list', icon: '📋' },
        { key: 'urls', label: 'URLs', type: 'list', icon: '🔗' },
        { key: 'cities', label: 'Cidades', type: 'list', icon: '🏙' },
        { key: 'types', label: 'Tipos', type: 'list', icon: '🏷' },
    ],
    'conditional': [
        { key: 'result', label: 'Resultado (true/false)', type: 'text', icon: '✅' },
        { key: 'resolvedValue', label: 'Valor Resolvido', type: 'text', icon: '📊' },
    ],
    'linkcheck': [
        { key: 'is_new', label: 'É Novo?', type: 'text', icon: '✅' },
        { key: 'url', label: 'URL Verificada', type: 'text', icon: '🔗' },
        { key: 'already_processed', label: 'Já Processado?', type: 'text', icon: '⚠️' },
    ],
    'set': [
        { key: '_dynamic', label: 'Campos Definidos', type: 'text', icon: '⚙️' },
    ],
    'script': [
        { key: 'result', label: 'Resultado', type: 'text', icon: '⚡' },
        { key: 'data', label: 'Dados', type: 'text', icon: '📦' },
        { key: 'logs', label: 'Logs', type: 'list', icon: '📋' },
    ],
    'twitter_search': [
        { key: 'items', label: 'Tweets', type: 'list', icon: '🐦' },
        { key: 'count', label: 'Quantidade', type: 'text', icon: '🔢' },
        { key: 'total_results', label: 'Total Resultados', type: 'text', icon: '📊' },
        { key: 'next_token', label: 'Next Token', type: 'text', icon: '➡️' },
        { key: 'summary', label: 'Resumo', type: 'text', icon: '📝' },
    ],
    'semrush': [
        { key: 'items', label: 'Resultados', type: 'list', icon: '📊' },
        { key: 'count', label: 'Quantidade', type: 'text', icon: '🔢' },
        { key: 'summary', label: 'Resumo', type: 'text', icon: '📝' },
        { key: 'domain', label: 'Domínio', type: 'text', icon: '🌐' },
        { key: 'rank', label: 'Rank', type: 'text', icon: '🏆' },
        { key: 'organic_keywords', label: 'Keywords Orgânicas', type: 'text', icon: '🔑' },
        { key: 'organic_traffic', label: 'Tráfego Orgânico', type: 'text', icon: '📈' },
        { key: 'total_backlinks', label: 'Backlinks', type: 'text', icon: '🔗' },
        { key: 'search_volume', label: 'Volume de Busca', type: 'text', icon: '🔍' },
        { key: 'traffic_change_pct', label: 'Variação Tráfego %', type: 'text', icon: '📉' },
    ],
    'buzzsumo': [
        { key: 'items', label: 'Artigos', type: 'list', icon: '📰' },
        { key: 'count', label: 'Quantidade', type: 'text', icon: '🔢' },
        { key: 'summary', label: 'Resumo', type: 'text', icon: '📝' },
        { key: 'total_shares', label: 'Total Shares', type: 'text', icon: '📈' },
        { key: 'avg_shares_per_article', label: 'Média Shares', type: 'text', icon: '📊' },
        { key: 'total_articles', label: 'Total Artigos', type: 'text', icon: '📰' },
        { key: 'top_domains', label: 'Top Domínios', type: 'list', icon: '🌐' },
        { key: 'top_authors', label: 'Top Autores', type: 'list', icon: '✍️' },
    ],
    'perplexity_search': [
        { key: 'answer', label: 'Resposta', type: 'text', icon: '💡' },
        { key: 'sources', label: 'Fontes', type: 'list', icon: '📚' },
        { key: 'citations', label: 'Citações', type: 'list', icon: '🔗' },
        { key: 'summary', label: 'Resumo', type: 'text', icon: '📝' },
        { key: 'model', label: 'Modelo Usado', type: 'text', icon: '⚙️' },
    ],
    'manus_agent': [
        { key: 'result', label: 'Resultado', type: 'text', icon: '🧠' },
        { key: 'sources', label: 'Fontes Pesquisadas', type: 'list', icon: '📚' },
        { key: 'files', label: 'Arquivos Gerados', type: 'list', icon: '📁' },
        { key: 'summary', label: 'Resumo', type: 'text', icon: '📝' },
        { key: 'status', label: 'Status da Tarefa', type: 'text', icon: '✅' },
    ],
    'google_trends': [
        { key: 'items', label: 'Série Temporal / Dados', type: 'list', icon: '📈' },
        { key: 'analysis', label: 'Análise por Keyword', type: 'list', icon: '📊' },
        { key: 'count', label: 'Data Points', type: 'text', icon: '🔢' },
        { key: 'keywords', label: 'Keywords', type: 'list', icon: '🔑' },
        { key: 'summary', label: 'Resumo', type: 'text', icon: '📝' },
    ],
};

const getNodeVariables = (node: any) => {
    // For trigger nodes, use triggerType-qualified key
    if (node.type === 'trigger') {
        const triggerType = node.data?.triggerType || node.data?.iconType || 'manual';
        return NODE_VARIABLES[`trigger:${triggerType}`] || [];
    }
    return NODE_VARIABLES[node.data?.iconType] || [];
};

// Helper Components
const ToolboxSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 px-2 tracking-wider">{title}</h3>
        <div className="space-y-1">{children}</div>
    </div>
);

const ToolboxItem = ({ type, iconType, icon: Icon, label, color }: { type: string, iconType: string, icon: any, label: string, color: string }) => (
    <div
        className="flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-800 cursor-grab active:cursor-grabbing transition-colors group border border-transparent hover:border-slate-700"
        draggable
        onDragStart={(event) => {
            event.dataTransfer.setData('application/reactflow/type', type);
            event.dataTransfer.setData('application/reactflow/label', label);
            event.dataTransfer.setData('application/reactflow/iconType', iconType);
            event.dataTransfer.effectAllowed = 'move';
        }}
    >
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
    </div>
);

export const FlowBuilder: React.FC = () => {
    const nodeTypes = useMemo(() => ({
        trigger: TriggerNode,
        action: ActionNode,
        publish: ActionNode, // Use ActionNode for publish nodes
        condition: ConditionNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        deletable: DeletableEdge,
    }), []);

    const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
    const [flowName, setFlowName] = useState("Novo Fluxo de Crise");
    const [flowId, setFlowId] = useState<string | null>(null);
    const [flowDescription, setFlowDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignModalTab, setAssignModalTab] = useState<'users' | 'activations'>('users');
    const [assignSearch, setAssignSearch] = useState("");
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [allActivations, setAllActivations] = useState<ActivationOption[]>([]);
    const [existingAssignments, setExistingAssignments] = useState<FlowAssignment[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [selectedActivationIds, setSelectedActivationIds] = useState<Set<string>>(new Set());
    const [simulating, setSimulating] = useState(false);
    const [aiModels, setAiModels] = useState<any[]>([]);
    const [allFlows, setAllFlows] = useState<{ id: string; name: string }[]>([]);
    const [allMediaOutlets, setAllMediaOutlets] = useState<any[]>([]);
    const [outletSearchTerm, setOutletSearchTerm] = useState('');
    const [outletTab, setOutletTab] = useState('todos');

    // Execution tracking state
    const [currentExecution, setCurrentExecution] = useState<any | null>(null);
    const [showExecutionPanel, setShowExecutionPanel] = useState(false);
    const [debugFocusNodeId, setDebugFocusNodeId] = useState<string | null>(null);
    const executionSubscriptionRef = useRef<any>(null);

    useEffect(() => {
        // Check if editing an existing flow from URL
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const templateId = urlParams.get('template');

        if (id) {
            loadFlow(id);
        } else if (templateId) {
            const template = FLOW_TEMPLATES.find(t => t.id === templateId);
            if (template) {
                setNodes(template.nodes as any);
                setEdges(template.edges as any);
                setFlowName(template.name);
                setFlowDescription(template.description);
            }
        }

        // Fetch AI models (DB + hardcoded well-known models)
        const fetchAiModels = async () => {
            try {
                const { data, error } = await supabase
                    .from('ai_configs')
                    .select('id, model, provider')
                    .eq('is_active', true);

                // Well-known Gemini models always available
                const hardcodedModels = [
                    { id: '_gemini-2.5-flash', model: 'gemini-2.5-flash', provider: 'gemini' },
                    { id: '_gemini-2.5-flash-lite', model: 'gemini-2.5-flash-lite', provider: 'gemini' },
                    { id: '_gemini-2.5-pro', model: 'gemini-2.5-pro', provider: 'gemini' },
                ];

                const dbModels = (!error && data) ? data : [];
                // Merge: DB models first, then add hardcoded ones not already in DB
                const dbModelNames = new Set(dbModels.map((m: any) => m.model));
                const merged = [...dbModels, ...hardcodedModels.filter(h => !dbModelNames.has(h.model))];
                setAiModels(merged);
            } catch (err) {
                console.error('Error fetching AI models:', err);
            }
        };
        fetchAiModels();

        // Fetch real users from profiles
        const fetchUsers = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, email, full_name, role')
                    .order('full_name');
                setAllUsers(data || []);
            } catch (err) {
                console.error('Error fetching users:', err);
            }
        };
        fetchUsers();

        // Fetch activations
        const fetchActivations = async () => {
            try {
                const { data } = await supabase
                    .from('activations')
                    .select('id, name, status, description, keywords, people_of_interest, category')
                    .order('name');
                setAllActivations(data || []);
            } catch (err) {
                console.error('Error fetching activations:', err);
            }
        };
        fetchActivations();

        // Fetch all flows for trigger-flow node
        const fetchFlows = async () => {
            try {
                const { data } = await supabase
                    .from('flows')
                    .select('id, name')
                    .order('name');
                setAllFlows(data || []);
            } catch (err) {
                console.error('Error fetching flows:', err);
            }
        };
        fetchFlows();

        // Fetch media outlets for portal picker
        const fetchMediaOutlets = async () => {
            try {
                const { data } = await supabase
                    .from('media_outlets')
                    .select('id, name, type, url, city')
                    .order('name');
                setAllMediaOutlets(data || []);
            } catch (err) {
                console.error('Error fetching media outlets:', err);
            }
        };
        fetchMediaOutlets();
    }, []);

    // Update node execution status based on current execution
    useEffect(() => {
        if (!currentExecution) {
            // Clear all execution statuses
            setNodes((nds) =>
                nds.map((node) => ({
                    ...node,
                    data: { ...node.data, executionStatus: undefined }
                }))
            );
            return;
        }

        const executionLog = Array.isArray(currentExecution.execution_log) ? currentExecution.execution_log : [];

        setNodes((nds) =>
            nds.map((node) => {
                // Find all log entries for this node
                const nodeLogs = executionLog.filter((log: any) => log.nodeId === node.id);

                if (nodeLogs.length === 0) {
                    return { ...node, data: { ...node.data, executionStatus: undefined } };
                }

                // Prefer completed/failed entries over running — same logic as ExecutionVisualization
                const finalEntry = nodeLogs.find((l: any) => l.status === 'completed' || l.status === 'failed');
                const bestEntry = finalEntry || nodeLogs[nodeLogs.length - 1];

                let status: 'running' | 'completed' | 'failed' | undefined = undefined;

                if (bestEntry.status === 'completed') {
                    status = 'completed';
                } else if (bestEntry.status === 'failed') {
                    status = 'failed';
                } else if (bestEntry.status === 'running' && currentExecution.status === 'running') {
                    status = 'running';
                } else if (bestEntry.status === 'running' && currentExecution.status !== 'running') {
                    // Execution finished but node still shows 'running' — treat as completed
                    status = 'completed';
                }

                return {
                    ...node,
                    data: { ...node.data, executionStatus: status }
                };
            })
        );
    }, [currentExecution, setNodes]);

    // Load existing assignments when modal opens or flow changes
    const fetchExistingAssignments = useCallback(async (fId: string) => {
        try {
            const { data } = await supabase
                .from('flow_assignments')
                .select('id, flow_id, user_id, activation_id, assigned_at')
                .eq('flow_id', fId)
                .eq('active', true);

            if (data) {
                const enriched: FlowAssignment[] = data.map(a => {
                    const user = allUsers.find(u => u.id === a.user_id);
                    const activation = allActivations.find(act => act.id === a.activation_id);
                    return {
                        ...a,
                        user_name: user?.full_name || user?.email,
                        activation_name: activation?.name
                    };
                });
                setExistingAssignments(enriched);
            }
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    }, [allUsers, allActivations]);

    const filteredAssignUsers = useMemo(() => {
        const term = assignSearch.toLowerCase();
        return allUsers.filter(u => {
            const name = u.full_name || u.email || '';
            return name.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
        });
    }, [assignSearch, allUsers]);

    const filteredAssignActivations = useMemo(() => {
        const term = assignSearch.toLowerCase();
        return allActivations.filter(a =>
            a.name?.toLowerCase().includes(term)
        );
    }, [assignSearch, allActivations]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'deletable', animated: true, style: { stroke: '#64748b' } }, eds)), [setEdges]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        // In debug mode: open execution panel focused on this node
        if (currentExecution) {
            setDebugFocusNodeId(node.id);
            setShowExecutionPanel(true);
        }
    }, [currentExecution]);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow/type');
            const label = event.dataTransfer.getData('application/reactflow/label');
            const iconType = event.dataTransfer.getData('application/reactflow/iconType');

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // Find max existing numeric ID to avoid duplicates
            const existingIds = nodes
                .map(n => {
                    const match = n.id.match(/^node-(\d+)$/);
                    return match ? parseInt(match[1]) : 0;
                })
                .filter(id => id > 0);

            const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
            const numericId = maxId + 1;

            console.log(`🔍 [FlowBuilder] Creating new node - Existing IDs: [${existingIds.join(', ')}], Max: ${maxId}, New ID: ${numericId}`);

            // Use 'publish' type for publish nodes, otherwise use the original type
            const nodeType = iconType === 'publish' ? 'publish' : type;

            // Determine trigger type from iconType for better default state
            let initialTriggerType = 'manual';
            if (iconType === 'database') initialTriggerType = 'datasource';
            if (iconType === 'webhook') initialTriggerType = 'webhook';
            if (iconType === 'schedule') initialTriggerType = 'schedule';
            if (iconType === 'activation') initialTriggerType = 'activation';
            if (['twitter', 'brandwatch', 'buzzsumo'].includes(iconType)) initialTriggerType = 'social_monitor';

            const newNode: Node = {
                id: `node-${numericId}`,
                type: nodeType,
                position: position || { x: 0, y: 0 },
                data: { label: label, iconType: iconType, numericId, triggerType: initialTriggerType },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes, nodes]
    );

    const loadFlow = async (id: string) => {
        // setLoading(true); // Removed
        try {
            const { data, error } = await supabase
                .from('flows')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setFlowId(data.id);
                setFlowName(data.name || "Fluxo sem nome");
                setFlowDescription(data.description || "");
                setNodes(data.nodes || []);
                setEdges((data.edges || []).map((e: Edge) => ({ ...e, type: 'deletable' })));
            }
        } catch (error) {
            console.error('Error loading flow:', error);
            showToast.error('Erro ao carregar fluxo.');
        } finally {
            // setLoading(false); // Removed
        }
    };

    const saveFlow = async () => {
        setSaving(true);

        // Log for debugging
        console.log('Saving nodes:', nodes);
        console.log('Saving edges:', edges);

        if (nodes.length === 0) {
            showToast.warning('Adicione pelo menos um nó ao fluxo antes de salvar.');
            setSaving(false);
            return null;
        }

        try {
            if (flowId) {
                // UPDATE existing flow
                const { data, error } = await supabase
                    .from('flows')
                    .update({
                        name: flowName,
                        description: flowDescription,
                        nodes: nodes,
                        edges: edges,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', flowId)
                    .select()
                    .single();

                if (error) throw error;

                // Update Schedule
                await updateFlowSchedule(data.id, nodes);

                showToast.success('Fluxo atualizado!');
                return data.id;
            } else {
                // INSERT new flow
                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) {
                    showToast.error('Usuário não autenticado.');
                    setSaving(false);
                    return null;
                }

                const { data, error } = await supabase
                    .from('flows')
                    .insert({
                        name: flowName,
                        description: flowDescription,
                        nodes: nodes,
                        edges: edges,
                        active: true,
                        user_id: userData.user.id
                    })
                    .select()
                    .single();

                if (error) throw error;
                setFlowId(data.id); // Save the ID for future updates

                // Update Schedule
                await updateFlowSchedule(data.id, nodes);

                showToast.success('Fluxo salvo!');

                // Update URL with the new ID
                window.history.replaceState({}, '', `/flows/builder?id=${data.id}`);

                return data.id;
            }
        } catch (error: any) {
            console.error('Error saving flow:', error);
            showToast.error('Erro ao salvar fluxo.');
            return null;
        } finally {
            setSaving(false);
        }
    };

    // ── UNDO HISTORY ──
    const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const historyIndexRef = useRef(-1);
    const isUndoingRef = useRef(false);

    const pushHistory = useCallback(() => {
        if (isUndoingRef.current) return;
        const snapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
        };
        // Trim any future states after current index
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current.push(snapshot);
        if (historyRef.current.length > 30) historyRef.current.shift();
        historyIndexRef.current = historyRef.current.length - 1;
    }, [nodes, edges]);

    // Snapshot on node/edge changes (debounced)
    const pushHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (pushHistoryTimeoutRef.current) clearTimeout(pushHistoryTimeoutRef.current);
        pushHistoryTimeoutRef.current = setTimeout(() => {
            pushHistory();
        }, 500);
        return () => {
            if (pushHistoryTimeoutRef.current) clearTimeout(pushHistoryTimeoutRef.current);
        };
    }, [nodes, edges, pushHistory]);

    const undo = useCallback(() => {
        if (historyIndexRef.current <= 0) return;
        historyIndexRef.current -= 1;
        const snapshot = historyRef.current[historyIndexRef.current];
        if (snapshot) {
            isUndoingRef.current = true;
            setNodes(snapshot.nodes);
            setEdges(snapshot.edges);
            setTimeout(() => { isUndoingRef.current = false; }, 100);
        }
    }, [setNodes, setEdges]);

    // ── KEYBOARD SHORTCUTS ──
    const saveFlowRef = useRef(saveFlow);
    saveFlowRef.current = saveFlow;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if user is typing in an input/textarea
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const isMod = e.metaKey || e.ctrlKey;
            if (!isMod) return;

            if (e.key === 's') {
                e.preventDefault();
                saveFlowRef.current();
            } else if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo]);

    // Helper to update flow_schedules
    const updateFlowSchedule = async (flowId: string, nodes: Node[]) => {
        // Find activation trigger with cron configured
        const scheduleNode = nodes.find(n => n.data.triggerType === 'activation' && n.data.cronExpression);

        if (scheduleNode && scheduleNode.data.cronExpression) {
            const isActive = scheduleNode.data.scheduleActive !== false; // Default: active when cron is set
            const timezone = scheduleNode.data.scheduleTimezone || 'America/Sao_Paulo';
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id;

            if (!userId) {
                console.error('[Schedule] Cannot update schedule: no user_id');
                return;
            }

            console.log(`[Schedule] Updating for flow: ${flowId} (active: ${isActive}, cron: ${scheduleNode.data.cronExpression})`);

            // When activating, set next_run_at to NOW for immediate first fire
            const nextRunAt = isActive ? new Date().toISOString() : null;

            // Delete existing schedule first (avoids upsert issues with missing UNIQUE constraint)
            await supabase.from('flow_schedules').delete().eq('flow_id', flowId);

            // Insert new schedule
            const { error } = await supabase
                .from('flow_schedules')
                .insert({
                    flow_id: flowId,
                    cron_expression: scheduleNode.data.cronExpression,
                    timezone,
                    active: isActive,
                    next_run_at: nextRunAt,
                    user_id: userId,
                    created_by: userId,
                });

            if (error) {
                console.error('[Schedule] Error inserting schedule:', error.message, error.details, error.code);
                showToast.error('Erro ao salvar agendamento: ' + error.message);
            } else {
                console.log('[Schedule] Schedule saved successfully');
            }
        } else {
            // Remove schedule if no cron configured
            const { error } = await supabase
                .from('flow_schedules')
                .delete()
                .eq('flow_id', flowId);
            if (error) console.error('[Schedule] Error removing schedule:', error);
        }
    };

    const handleSimulate = async () => {
        if (!reactFlowInstance) return;

        // Save first to ensure flow exists and is up to date
        const flowId = await saveFlow(); // Use existing save flow logic
        if (!flowId) return;

        setSimulating(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            const { data: session } = await supabase.auth.getSession();
            const userResponse = await supabase.auth.getUser();
            const userId = userResponse.data.user?.id;

            const res = await fetch(`${backendUrl}/api/flows/${flowId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session?.access_token}`,
                },
                body: JSON.stringify({
                    title: 'Simulação Manual',
                    description: 'Execução iniciada pelo Flow Builder',
                    source: 'manual_simulation',
                    userId,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Erro ao executar');

            console.log('Simulation Started:', result);

            if (result.executionId) {
                setShowExecutionPanel(true);
                console.log('[ExecutionTracking] Starting tracking for:', result.executionId);
                subscribeToExecution(result.executionId);
            }
        } catch (error: any) {
            console.error('Simulation failed:', error);
            showToast.error(`Erro na simulação: ${error.message}`);
        } finally {
            setSimulating(false);
        }
    };

    // Real-time execution subscription
    const subscribeToExecution = useCallback((executionId: string) => {
        console.log('[ExecutionTracking] 🔔 Subscribing to execution:', executionId);

        // Unsubscribe from previous if exists
        if (executionSubscriptionRef.current) {
            console.log('[ExecutionTracking] Unsubscribing from previous channel');
            executionSubscriptionRef.current.unsubscribe();
        }

        const channelName = `execution-${executionId}`;
        console.log('[ExecutionTracking] Creating channel:', channelName);

        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'flow_executions',
                filter: `id=eq.${executionId}`
            }, (payload) => {
                console.log('[ExecutionTracking] 🎉 Realtime UPDATE received:', payload.new);
                setCurrentExecution(payload.new);

                // Auto-close panel when execution completes
                if (payload.new.status === 'completed' || payload.new.status === 'failed') {
                    // Clear execution visual FIRST (non-blocking)
                    setCurrentExecution(null);
                    setShowExecutionPanel(false);
                    // Then notify
                    setTimeout(() => {
                        if (payload.new.status === 'completed') {
                            showToast.success('Execução concluída!');
                        } else {
                            showToast.error(`Execução falhou: ${payload.new.error_message}`);
                        }
                    }, 100);
                }
            })
            .subscribe((status) => {
                console.log('[ExecutionTracking] 📡 Subscription status:', status);
            });

        executionSubscriptionRef.current = subscription;

        // Fetch initial execution data
        supabase
            .from('flow_executions')
            .select('*')
            .eq('id', executionId)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) {
                    console.warn('[ExecutionTracking] Failed to fetch execution:', error);
                    return;
                }
                if (data) {
                    console.log('[ExecutionTracking] Initial execution data loaded:', data.status);
                    setCurrentExecution(data);
                } else {
                    console.log('[ExecutionTracking] Execution not found yet, will poll for updates');
                }
            });

        // FALLBACK: Poll for updates every 2 seconds since Realtime not working with service_role
        console.log('[ExecutionTracking] ⏱️ Starting poll interval for', executionId);
        const pollInterval = setInterval(async () => {
            console.log('[ExecutionTracking] 🔄 Polling for update...');
            const { data, error } = await supabase
                .from('flow_executions')
                .select('*')
                .eq('id', executionId)
                .maybeSingle();

            if (error) {
                console.error('[ExecutionTracking] Poll error:', error);
                return;
            }

            if (data) {
                console.log('[ExecutionTracking] 📊 Poll update:', data.status);
                setCurrentExecution(data);

                // Stop polling when execution completes
                if (data.status === 'completed' || data.status === 'failed') {
                    console.log('[ExecutionTracking] ⏹️ Stopping poll - execution finished');
                    clearInterval(pollInterval);
                    // Clear execution visual FIRST (non-blocking)
                    setCurrentExecution(null);
                    setShowExecutionPanel(false);
                    // Then notify
                    setTimeout(() => {
                        if (data.status === 'completed') {
                            showToast.success('Execução concluída!');
                        } else {
                            showToast.error(`Execução falhou: ${data.error_message}`);
                        }
                    }, 100);
                }
            } else {
                console.log('[ExecutionTracking] Poll returned no data');
            }
        }, 2000);

        // Store interval ref to clear on unmount
        return () => clearInterval(pollInterval);
    }, []);

    const handleOpenAssignModal = async () => {
        setShowAssignModal(true);
        setAssignSearch('');
        setSelectedUserIds(new Set());
        setSelectedActivationIds(new Set());
        setAssignModalTab('users');

        if (flowId) {
            await fetchExistingAssignments(flowId);
        }
    };

    const toggleUserId = (id: string) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleActivationId = (id: string) => {
        setSelectedActivationIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleAssignFlow = async () => {
        if (selectedUserIds.size === 0 && selectedActivationIds.size === 0) {
            showToast.warning('Selecione pelo menos um usuário ou ativação.');
            return;
        }

        setAssigning(true);
        const savedFlowId = flowId || await saveFlow();

        if (savedFlowId) {
            try {
                const currentUserId = (await supabase.auth.getUser()).data.user?.id;
                const inserts: any[] = [];

                for (const uid of selectedUserIds) {
                    // Skip if already assigned
                    if (!existingAssignments.some(a => a.user_id === uid)) {
                        inserts.push({ flow_id: savedFlowId, user_id: uid, assigned_by: currentUserId });
                    }
                }

                for (const aid of selectedActivationIds) {
                    if (!existingAssignments.some(a => a.activation_id === aid)) {
                        inserts.push({ flow_id: savedFlowId, activation_id: aid, assigned_by: currentUserId });
                    }
                }

                if (inserts.length > 0) {
                    const { error } = await supabase
                        .from('flow_assignments')
                        .insert(inserts);
                    if (error) throw error;
                }

                showToast.success(`${inserts.length} atribuição(ões) adicionada(s)!`);
                await fetchExistingAssignments(savedFlowId);
                setSelectedUserIds(new Set());
                setSelectedActivationIds(new Set());
            } catch (error: any) {
                console.error('Error assigning flow:', error);
                showToast.error('Erro ao atribuir fluxo: ' + error.message);
            } finally {
                setAssigning(false);
            }
        } else {
            setAssigning(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        try {
            const { error } = await supabase
                .from('flow_assignments')
                .delete()
                .eq('id', assignmentId);
            if (error) throw error;
            setExistingAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch (error: any) {
            console.error('Error removing assignment:', error);
            showToast.error('Erro ao remover atribuição: ' + error.message);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-950 overflow-hidden">
            {/* Sidebar Toolbox */}
            <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col z-20 shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Box className="w-4 h-4" />
                        Componentes
                    </h2>
                </div>
                <div className="p-4 space-y-6 overflow-y-auto flex-1">
                    <ToolboxSection title="Gatilhos (Triggers)">

                        <ToolboxItem type="trigger" iconType="webhook" icon={Webhook} label="Webhook Web" color="text-amber-400" />
                        <ToolboxItem type="trigger" iconType="http" icon={Globe} label="HTTP Request" color="text-emerald-400" />
                        <ToolboxItem type="trigger" iconType="database" icon={Database} label="Novo Registro" color="text-blue-400" />
                        <ToolboxItem type="trigger" iconType="twitter" icon={Twitter} label="Novo Tweet" color="text-sky-500" />
                        <ToolboxItem type="trigger" iconType="brandwatch" icon={Building} label="Alerta Brandwatch" color="text-pink-500" />
                        <ToolboxItem type="trigger" iconType="buzzsumo" icon={FileText} label="Conteúdo Viral" color="text-orange-500" />
                        <ToolboxItem type="trigger" iconType="activation" icon={Zap} label="Evento de Ativação" color="text-yellow-400" />
                    </ToolboxSection>

                    <ToolboxSection title="Ações (Actions)">
                        <ToolboxItem type="action" iconType="manus" icon={Search} label="Consultar Manus" color="text-cyan-400" />
                        <ToolboxItem type="action" iconType="perplexity" icon={Globe} label="Consultar Perplexity" color="text-teal-400" />
                        <ToolboxItem type="action" iconType="ai" icon={BrainCircuit} label="Análise IA" color="text-purple-400" />
                        <ToolboxItem type="action" iconType="message" icon={MessageSquare} label="Enviar Notificação" color="text-pink-400" />
                        <ToolboxItem type="action" iconType="database" icon={Database} label="Atualizar Banco" color="text-slate-400" />
                        <ToolboxItem type="action" iconType="publish" icon={Upload} label="📤 Publicar no Feed" color="text-green-400" />
                        <ToolboxItem type="action" iconType="script" icon={Zap} label="Executar Script" color="text-red-400" />
                        <ToolboxItem type="action" iconType="httprequest" icon={Webhook} label="HTTP Request" color="text-orange-400" />
                        <ToolboxItem type="action" iconType="triggerflow" icon={GitBranch} label="Acionar Outro Flow" color="text-emerald-400" />
                        <ToolboxItem type="action" iconType="mediaoutlet" icon={Tv} label="Consultar Veículos" color="text-sky-400" />
                        <ToolboxItem type="action" iconType="twitter_search" icon={Twitter} label="🐦 Twitter/X" color="text-sky-500" />
                        <ToolboxItem type="action" iconType="semrush" icon={Search} label="📊 SEMrush" color="text-orange-500" />
                        <ToolboxItem type="action" iconType="buzzsumo" icon={Share2} label="🔥 BuzzSumo" color="text-rose-500" />
                        <ToolboxItem type="action" iconType="perplexity_search" icon={Search} label="🔮 Perplexity" color="text-teal-400" />
                        <ToolboxItem type="action" iconType="manus_agent" icon={Brain} label="🧠 Manus AI" color="text-violet-400" />
                        <ToolboxItem type="action" iconType="google_trends" icon={TrendingUp} label="📈 Google Trends" color="text-green-500" />
                        <ToolboxItem type="action" iconType="set" icon={Settings} label="Set (Preparar Dados)" color="text-amber-400" />
                    </ToolboxSection>

                    <ToolboxSection title="Controle de Fluxo">
                        <ToolboxItem type="condition" iconType="conditional" icon={GitMerge} label="Condicional (Se/Então)" color="text-indigo-400" />
                        <ToolboxItem type="condition" iconType="linkcheck" icon={Link2} label="Verificar Link" color="text-teal-400" />
                        <ToolboxItem type="condition" iconType="filter" icon={Filter} label="Filtro" color="text-cyan-400" />
                        <ToolboxItem type="condition" iconType="delay" icon={ArrowRight} label="Delay" color="text-slate-400" />
                        <ToolboxItem type="action" iconType="loop" icon={Repeat} label="Loop (Iteração)" color="text-amber-400" />
                    </ToolboxSection>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/30">
                    <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition-colors border border-slate-700">
                        Documentação da API
                    </button>
                </div>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 h-full w-full bg-slate-950">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    fitView
                    attributionPosition="bottom-left"
                >
                    <Background color="#334155" gap={20} variant={BackgroundVariant.Dots} />
                    <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />

                    {/* Debug Shortcut Button - Bottom Left */}
                    <Panel position="bottom-left" className="ml-12 mb-2">
                        <button
                            onClick={async () => {
                                const flowId = new URLSearchParams(window.location.search).get('id') || (currentExecution?.flow_id);
                                if (!flowId) {
                                    showToast.warning('Salve o fluxo primeiro para ver debug.');
                                    return;
                                }
                                // If we already have a currentExecution, just show it
                                if (currentExecution) {
                                    setShowExecutionPanel(true);
                                    return;
                                }
                                // Otherwise fetch the latest execution for this flow
                                const { data, error } = await supabase
                                    .from('flow_executions')
                                    .select('*')
                                    .eq('flow_id', flowId)
                                    .order('started_at', { ascending: false })
                                    .limit(1)
                                    .single();
                                if (error || !data) {
                                    showToast.info('Nenhuma execução encontrada para este fluxo.');
                                    return;
                                }
                                setCurrentExecution(data);
                                setShowExecutionPanel(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-sm border border-slate-700/60 hover:border-slate-600 text-slate-400 hover:text-amber-400 rounded-md text-xs font-medium transition-all shadow-lg group"
                            title="Abrir debug dos nós (última execução)"
                        >
                            <Bug className="w-3.5 h-3.5 group-hover:text-amber-400 transition-colors" />
                            <span className="hidden sm:inline">Debug</span>
                        </button>
                    </Panel>

                    <Panel position="top-center" className="bg-transparent pointer-events-none p-4 w-full">
                        <div className="flex justify-between items-center z-10 pointer-events-none w-full max-w-5xl mx-auto">
                            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1.5 rounded-lg flex items-center gap-1 pointer-events-auto shadow-2xl">
                                <div className="px-3 py-1.5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <input
                                        type="text"
                                        value={flowName}
                                        onChange={(e) => setFlowName(e.target.value)}
                                        className="bg-transparent text-sm font-medium text-slate-200 outline-none border-none placeholder-slate-500 w-48"
                                        placeholder="Nome do Fluxo"
                                    />
                                </div>
                                <div className="h-6 w-[1px] bg-slate-700 mx-1"></div>
                                <button className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"><MousePointer2 className="w-4 h-4" /></button>
                                <button className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"><Settings className="w-4 h-4" /></button>
                            </div>

                            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1.5 rounded-lg flex items-center gap-2 pointer-events-auto shadow-2xl">
                                <button
                                    onClick={handleSimulate}
                                    disabled={simulating}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 hover:border-slate-500 rounded-md text-sm font-medium transition-all"
                                >
                                    {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                    {simulating ? 'Rodando...' : 'Simular'}
                                </button>
                                <button
                                    onClick={handleOpenAssignModal}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <Users className="w-4 h-4" /> Atribuir
                                </button>
                                <button
                                    onClick={() => saveFlow()}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>

                        </div>

                        {/* Assignment Modal */}
                        {showAssignModal && (
                            <div className="absolute top-16 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-96 pointer-events-auto z-50">
                                <div className="flex justify-between items-center p-4 pb-3 border-b border-slate-800">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-400" /> Atribuir Fluxo
                                    </h3>
                                    <button onClick={() => setShowAssignModal(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                                </div>

                                {/* Existing assignments */}
                                {existingAssignments.length > 0 && (
                                    <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/30">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Atribuições Atuais</p>
                                        <div className="space-y-1.5 max-h-28 overflow-y-auto">
                                            {existingAssignments.map(a => (
                                                <div key={a.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded bg-slate-800/60 border border-slate-700/50">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${a.user_id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                                                            }`}>
                                                            {a.user_id ? '👤' : '📋'}
                                                        </span>
                                                        <span className="text-slate-300 truncate">{a.user_name || a.activation_name || '...'}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveAssignment(a.id)}
                                                        className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                                                        title="Remover"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tabs */}
                                <div className="flex border-b border-slate-800">
                                    <button
                                        onClick={() => { setAssignModalTab('users'); setAssignSearch(''); }}
                                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${assignModalTab === 'users'
                                            ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        👤 Usuários {selectedUserIds.size > 0 && <span className="bg-indigo-500/30 text-indigo-300 px-1.5 rounded-full text-[10px]">{selectedUserIds.size}</span>}
                                    </button>
                                    <button
                                        onClick={() => { setAssignModalTab('activations'); setAssignSearch(''); }}
                                        className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${assignModalTab === 'activations'
                                            ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        📋 Ativações {selectedActivationIds.size > 0 && <span className="bg-emerald-500/30 text-emerald-300 px-1.5 rounded-full text-[10px]">{selectedActivationIds.size}</span>}
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="p-3 pb-0">
                                    <input
                                        type="text"
                                        placeholder={assignModalTab === 'users' ? 'Buscar usuário...' : 'Buscar ativação...'}
                                        value={assignSearch}
                                        onChange={(e) => setAssignSearch(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                </div>

                                {/* List */}
                                <div className="p-3 space-y-1 max-h-52 overflow-y-auto">
                                    {assignModalTab === 'users' ? (
                                        filteredAssignUsers.length === 0 ? (
                                            <p className="text-xs text-slate-500 text-center py-3">Nenhum usuário encontrado.</p>
                                        ) : filteredAssignUsers.map(user => {
                                            const isSelected = selectedUserIds.has(user.id);
                                            const alreadyAssigned = existingAssignments.some(a => a.user_id === user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    onClick={() => !alreadyAssigned && toggleUserId(user.id)}
                                                    disabled={alreadyAssigned}
                                                    className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${alreadyAssigned ? 'opacity-40 cursor-not-allowed' :
                                                        isSelected ? 'bg-indigo-600/15 border border-indigo-500/40' :
                                                            'hover:bg-slate-800 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 border border-slate-700 shrink-0">
                                                        {user.full_name?.charAt(0) || user.email.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-slate-200 font-medium truncate">{user.full_name || user.email}</p>
                                                        <p className="text-[10px] text-slate-500 truncate">{user.email} · {user.role}</p>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                                                    {alreadyAssigned && <span className="text-[9px] text-slate-500 shrink-0">Já atribuído</span>}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        filteredAssignActivations.length === 0 ? (
                                            <p className="text-xs text-slate-500 text-center py-3">Nenhuma ativação encontrada.</p>
                                        ) : filteredAssignActivations.map(activation => {
                                            const isSelected = selectedActivationIds.has(activation.id);
                                            const alreadyAssigned = existingAssignments.some(a => a.activation_id === activation.id);
                                            const statusColor = activation.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                                activation.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-slate-500/20 text-slate-400';
                                            return (
                                                <button
                                                    key={activation.id}
                                                    onClick={() => !alreadyAssigned && toggleActivationId(activation.id)}
                                                    disabled={alreadyAssigned}
                                                    className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${alreadyAssigned ? 'opacity-40 cursor-not-allowed' :
                                                        isSelected ? 'bg-emerald-600/15 border border-emerald-500/40' :
                                                            'hover:bg-slate-800 border border-transparent'
                                                        }`}
                                                >
                                                    <div className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${statusColor}`}>
                                                        <Zap className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-slate-200 font-medium truncate">{activation.name}</p>
                                                        <p className="text-[10px] text-slate-500">{activation.status}</p>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                                                    {alreadyAssigned && <span className="text-[9px] text-slate-500 shrink-0">Já atribuído</span>}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Action */}
                                <div className="p-3 pt-0 border-t border-slate-800 mt-0">
                                    <button
                                        onClick={handleAssignFlow}
                                        disabled={assigning || (selectedUserIds.size === 0 && selectedActivationIds.size === 0)}
                                        className="w-full py-2.5 mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        {assigning ? 'Atribuindo...' : `Atribuir (${selectedUserIds.size + selectedActivationIds.size})`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </Panel>
                </ReactFlow>
            </div>

            {/* Properties Panel */}
            <div className={`w-80 bg-slate-900 border-l border-slate-800 flex flex-col transition-all duration-300 transform ${selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'} z-30 shadow-2xl`}>
                {selectedNode && (
                    <>
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configuração</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Editando {selectedNode.data.label}</p>
                            </div>
                            <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-5 text-slate-300 text-sm space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID do Nó</label>
                                <input type="text" value={selectedNode.id} disabled className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rótulo</label>
                                <input
                                    type="text"
                                    value={selectedNode.data.label}
                                    onChange={(e) => {
                                        setNodes((nds) =>
                                            nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n)
                                        );
                                        // Update local selected node state to reflect change immediately in UI if needed, 
                                        // but usually useNodesState sync is enough if we weren't depending on 'selectedNode' for value.
                                        // Since we are controlled, we need to update selectedNode too or just read from nodes.
                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: e.target.value } });
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white focus:border-primary outline-none"
                                />
                            </div>

                            {/* Node Disable Toggle */}
                            <div className="flex items-center justify-between gap-3 py-2 px-3 bg-slate-800/50 rounded-lg border border-slate-700/40">
                                <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Nó Desativado</span>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Fluxo passa direto sem executar</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const newDisabled = !selectedNode.data.nodeDisabled;
                                        setNodes((nds) =>
                                            nds.map((n) => n.id === selectedNode.id
                                                ? { ...n, data: { ...n.data, nodeDisabled: newDisabled } }
                                                : n
                                            )
                                        );
                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, nodeDisabled: newDisabled } });
                                    }}
                                    className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${selectedNode.data.nodeDisabled
                                        ? 'bg-red-500/60'
                                        : 'bg-slate-600'
                                        }`}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${selectedNode.data.nodeDisabled ? 'left-[18px]' : 'left-0.5'
                                        }`} />
                                </button>
                            </div>

                            <div className="pt-4 border-t border-slate-800 space-y-4">


                                {selectedNode.data.iconType === 'ai' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pré-Prompt (Instrução de Sistema)</label>
                                            <textarea
                                                rows={3}
                                                value={selectedNode.data.prePrompt || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, prePrompt: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, prePrompt: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                placeholder="Ex: Você é um analista de inteligência política..."
                                            />
                                            <p className="text-[10px] text-slate-600 mt-0.5">Contexto dado à IA antes do conteúdo</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prompt do Sistema</label>
                                            <textarea
                                                rows={4}
                                                value={selectedNode.data.prompt || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, prompt: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, prompt: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                placeholder="Descreva a instrução para a IA... Use {{node-1.summary}} para variáveis"
                                            />
                                            {/* Variable reference helper */}
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {nodes.filter(n => n.id !== selectedNode.id).map(n => {
                                                    const vars = getNodeVariables(n);
                                                    if (vars.length === 0) return null;
                                                    return vars.slice(0, 2).map(v => (
                                                        <button
                                                            key={`${n.id}-${v.key}`}
                                                            onClick={() => {
                                                                const ref = `{{${n.id}.${v.key}}}`;
                                                                const newPrompt = (selectedNode.data.prompt || '') + ref;
                                                                setNodes((nds) =>
                                                                    nds.map((nd) => nd.id === selectedNode.id ? { ...nd, data: { ...nd.data, prompt: newPrompt } } : nd)
                                                                );
                                                                setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, prompt: newPrompt } });
                                                            }}
                                                            className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700 hover:text-white hover:border-slate-500 transition-colors"
                                                            title={`Inserir {{${n.id}.${v.key}}}`}
                                                        >
                                                            {v.icon} {n.data.label?.substring(0, 8)}.{v.key}
                                                        </button>
                                                    ));
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Formato de Saída</label>
                                            <select
                                                value={selectedNode.data.outputFormat || 'json'}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, outputFormat: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, outputFormat: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="json">JSON Processado (default)</option>
                                                <option value="text">Texto Livre</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Links (URLs para contexto)</label>
                                            <textarea
                                                rows={2}
                                                value={selectedNode.data.contextLinks || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, contextLinks: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, contextLinks: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                placeholder="Uma URL por linha..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo de IA</label>
                                            <select
                                                value={selectedNode.data.aiConfigId || ''}
                                                onChange={(e) => {
                                                    const selectedModel = aiModels.find(m => m.id === e.target.value);
                                                    const updates = {
                                                        aiConfigId: e.target.value,
                                                        model: selectedModel?.model || '',
                                                        provider: selectedModel?.provider || ''
                                                    };
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, ...updates } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...updates } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="">Selecione um modelo</option>
                                                {aiModels.map(model => (
                                                    <option key={model.id} value={model.id}>
                                                        {model.model} ({model.provider})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temperatura (Criatividade)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={selectedNode.data.temperature || 0.7}
                                                onChange={(e) => {
                                                    const newVal = parseFloat(e.target.value);
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, temperature: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, temperature: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Limite de Tokens (Resposta)</label>
                                            <select
                                                value={selectedNode.data.maxOutputTokens || 800}
                                                onChange={(e) => {
                                                    const newVal = parseInt(e.target.value);
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, maxOutputTokens: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, maxOutputTokens: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value={300}>⚡ Rápida — 300 tokens (~tweets, triagem)</option>
                                                <option value={800}>📝 Padrão — 800 tokens (~resumo + score)</option>
                                                <option value={1400}>📊 Completa — 1.400 tokens (~análise detalhada)</option>
                                                <option value={2500}>🔬 Profunda — 2.500 tokens (~relatório completo)</option>
                                            </select>
                                            <p className="text-[10px] text-slate-600 mt-0.5">
                                                {(selectedNode.data.maxOutputTokens || 800) <= 300
                                                    ? '⚡ Ideal para tweets e triagem rápida. Resposta enxuta.'
                                                    : (selectedNode.data.maxOutputTokens || 800) <= 800
                                                        ? '📝 Bom equilíbrio velocidade/detalhe. Recomendado para fluxos automáticos.'
                                                        : (selectedNode.data.maxOutputTokens || 800) <= 1400
                                                            ? '📊 Análise completa com entidades, sentimento e contexto.'
                                                            : '🔬 Relatório completo com steelman e análise por entidade. Mais lento.'
                                                }
                                            </p>
                                        </div>
                                        <div className="pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNode.data.useActivationContext !== false}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked;
                                                        setNodes((nds) =>
                                                            nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, useActivationContext: newVal } } : n)
                                                        );
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, useActivationContext: newVal } });
                                                    }}
                                                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-300">Usar Contexto da Ativação</span>
                                                    <span className="text-[9px] text-slate-500">Inclui keywords da demanda no prompt</span>
                                                </div>
                                            </label>
                                        </div>
                                    </>
                                )}
                                {selectedNode.data.iconType === 'manus' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-cyan-400 uppercase mb-1">Pesquisa Profunda (Manus)</label>
                                            <p className="text-[10px] text-slate-500 mb-2">Consulta documentos internos, histórico e base de conhecimento.</p>

                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Termos de Busca</label>
                                            <textarea
                                                rows={2}
                                                value={selectedNode.data.query || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, query: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, query: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                placeholder="Ex: 'Histórico de crises 2024'..."
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNode.data.includeDocs !== false}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked;
                                                        setNodes((nds) =>
                                                            nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, includeDocs: newVal } } : n)
                                                        );
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, includeDocs: newVal } });
                                                    }}
                                                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <span className="text-xs text-slate-300">Incluir Documentos Anexados</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNode.data.useActivationContext !== false}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked;
                                                        setNodes((nds) =>
                                                            nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, useActivationContext: newVal } } : n)
                                                        );
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, useActivationContext: newVal } });
                                                    }}
                                                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-300">Usar Contexto da Ativação</span>
                                                    <span className="text-[9px] text-slate-500">Refina busca com keywords da demanda</span>
                                                </div>
                                            </label>
                                        </div>
                                    </>
                                )}

                                {selectedNode.data.iconType === 'perplexity' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-teal-400 uppercase mb-1">Pesquisa Web (Perplexity)</label>
                                            <p className="text-[10px] text-slate-500 mb-2">Consulta notícias em tempo real e fontes abertas.</p>

                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tópico / Pergunta</label>
                                            <textarea
                                                rows={2}
                                                value={selectedNode.data.query || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, query: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, query: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                placeholder="Ex: 'Últimas notícias sobre a PEC...'..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foco da Busca</label>
                                            <select
                                                value={selectedNode.data.focus || 'news'}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, focus: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, focus: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="news">Notícias (News)</option>
                                                <option value="web">Toda a Web</option>
                                                <option value="academic">Acadêmico</option>
                                                <option value="youtube">YouTube</option>
                                            </select>
                                        </div>
                                        <div className="pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNode.data.useActivationContext !== false}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked;
                                                        setNodes((nds) =>
                                                            nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, useActivationContext: newVal } } : n)
                                                        );
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, useActivationContext: newVal } });
                                                    }}
                                                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-300">Usar Contexto da Ativação</span>
                                                    <span className="text-[9px] text-slate-500">Refina busca com keywords da demanda</span>
                                                </div>
                                            </label>
                                        </div>
                                    </>
                                )}
                                {selectedNode.data.iconType === 'publish' && (
                                    <>
                                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded px-3 py-2 mb-3">
                                            <p className="text-xs text-cyan-400 font-mono">
                                                ID do nó: <span className="font-bold">{selectedNode.id}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Use este ID nos templates: <code className="text-cyan-400">{`{${selectedNode.id}}`}</code>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título do Feed</label>
                                            <input
                                                type="text"
                                                value={selectedNode.data.title || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, title: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, title: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                placeholder="Ex: Análise Completa da Crise"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                                            <select
                                                value={selectedNode.data.category || 'neutral'}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, category: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, category: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="neutral">Neutro</option>
                                                <option value="threat">Ameaça</option>
                                                <option value="opportunity">Oportunidade</option>
                                                <option value="crisis">Crise</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nós Fonte</label>
                                            <div className="bg-slate-900 border border-slate-700 rounded px-3 py-2">
                                                {(() => {
                                                    // Auto-detect connected source nodes
                                                    const connectedSources = edges
                                                        .filter(edge => edge.target === selectedNode.id)
                                                        .map(edge => edge.source);

                                                    if (connectedSources.length === 0) {
                                                        return (
                                                            <p className="text-xs text-slate-500 italic">
                                                                Nenhum nó conectado. Conecte nós para agregar dados.
                                                            </p>
                                                        );
                                                    }

                                                    // Auto-update sourceNodes
                                                    if (JSON.stringify(selectedNode.data.sourceNodes) !== JSON.stringify(connectedSources)) {
                                                        setTimeout(() => {
                                                            setNodes((nds) =>
                                                                nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, sourceNodes: connectedSources } } : n)
                                                            );
                                                            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, sourceNodes: connectedSources } });
                                                        }, 0);
                                                    }

                                                    return (
                                                        <div className="space-y-1">
                                                            {connectedSources.map((nodeId, idx) => {
                                                                const sourceNode = nodes.find(n => n.id === nodeId);
                                                                return (
                                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                                        <span className="text-cyan-400 font-mono">{nodeId}</span>
                                                                        <span className="text-slate-600">→</span>
                                                                        <span className="text-slate-400">{sourceNode?.data.label || 'Nó'}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                ✨ Detectado automaticamente via conexões
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template</label>
                                            <textarea
                                                rows={4}
                                                value={selectedNode.data.template || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, template: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, template: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                placeholder="Use {node-id} para inserir dados dos nós&#10;&#10;Exemplo:&#10;**Dados Manus:**&#10;{node-manus-123}&#10;&#10;**Análise IA:**&#10;{node-ai-456}"
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                Use placeholders {'{node-id}'} para inserir dados
                                            </p>
                                        </div>
                                    </>
                                )}
                                {selectedNode.data.iconType === 'search' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Termos de Busca</label>
                                            <textarea
                                                rows={2}
                                                value={selectedNode.data.query || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, query: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, query: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                placeholder="Ex: 'Eleições 2026', 'Escândalo X'..."
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                Deixe vazio para usar o contexto do gatilho anterior.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fontes de Pesquisa</label>
                                            <div className="space-y-2">
                                                {['manus', 'perplexity', 'google', 'twitter'].map((source) => (
                                                    <label key={source} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={(selectedNode.data.sources || []).includes(source)}
                                                            onChange={(e) => {
                                                                const currentSources = selectedNode.data.sources || [];
                                                                let newSources;
                                                                if (e.target.checked) {
                                                                    newSources = [...currentSources, source];
                                                                } else {
                                                                    newSources = currentSources.filter((s: string) => s !== source);
                                                                }

                                                                setNodes((nds) =>
                                                                    nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, sources: newSources } } : n)
                                                                );
                                                                setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, sources: newSources } });
                                                            }}
                                                            className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                                                        />
                                                        <span className="text-xs text-slate-300 capitalize">{source}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profundidade</label>
                                            <select
                                                value={selectedNode.data.depth || 'basic'}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, depth: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, depth: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="basic">Rápida (Basic)</option>
                                                <option value="deep">Profunda (Deep)</option>
                                            </select>
                                        </div>
                                        <div className="pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNode.data.useActivationContext !== false}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked;
                                                        setNodes((nds) =>
                                                            nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, useActivationContext: newVal } } : n)
                                                        );
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, useActivationContext: newVal } });
                                                    }}
                                                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-300">Usar Contexto da Ativação</span>
                                                    <span className="text-[9px] text-slate-500">Refina busca com keywords da demanda</span>
                                                </div>
                                            </label>
                                        </div>
                                    </>
                                )}

                                {selectedNode.data.iconType === 'httprequest' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL</label>
                                            <input
                                                type="text"
                                                value={selectedNode.data.url || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, url: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, url: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none font-mono"
                                                placeholder="https://api.example.com/endpoint"
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                Use <code className="text-orange-400">{'{node-id}'}</code> para interpolar dados de nós anteriores.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método HTTP</label>
                                            <select
                                                value={selectedNode.data.httpMethod || 'POST'}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, httpMethod: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, httpMethod: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="GET">GET</option>
                                                <option value="POST">POST</option>
                                                <option value="PUT">PUT</option>
                                                <option value="PATCH">PATCH</option>
                                                <option value="DELETE">DELETE</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Headers (JSON)</label>
                                            <textarea
                                                rows={3}
                                                value={selectedNode.data.httpHeaders || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, httpHeaders: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, httpHeaders: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none font-mono"
                                                placeholder='{&#10;  "Authorization": "Bearer token",&#10;  "Content-Type": "application/json"&#10;}'
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Body (JSON)</label>
                                            <textarea
                                                rows={4}
                                                value={selectedNode.data.httpBody || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, httpBody: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, httpBody: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none font-mono"
                                                placeholder='{&#10;  "data": "{node-id}",&#10;  "action": "notify"&#10;}'
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                Ignorado para requisições GET/DELETE.
                                            </p>
                                        </div>
                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-orange-400">
                                                ⚡ A resposta será disponibilizada para os próximos nós via <code className="font-bold">{`{${selectedNode.id}}`}</code>
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* === LOOP CONFIG === */}
                                {selectedNode.data.iconType === 'loop' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Variável para Iterar</label>
                                            <input
                                                type="text"
                                                value={selectedNode.data.loopVariable || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, loopVariable: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, loopVariable: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none font-mono"
                                                placeholder="nodeId.items"
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                Referência à lista: <code className="text-amber-400">nodeId.variável</code>
                                            </p>
                                            {/* Quick-pick from upstream variables */}
                                            {(() => {
                                                const upstreamIds = edges.filter(e => e.target === selectedNode.id).map(e => e.source);
                                                const upstreamWithLists = upstreamIds.flatMap(uid => {
                                                    const uNode = nodes.find(n => n.id === uid);
                                                    if (!uNode) return [];
                                                    const vars = getNodeVariables(uNode);
                                                    return vars.filter(v => v.type === 'list').map(v => ({ nodeId: uid, nodeLabel: uNode.data?.label, ...v }));
                                                });
                                                if (upstreamWithLists.length === 0) return null;
                                                return (
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-[10px] text-slate-500">Listas disponíveis:</p>
                                                        {upstreamWithLists.map((v, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => {
                                                                    const ref = `${v.nodeId}.${v.key}`;
                                                                    setNodes((nds) =>
                                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, loopVariable: ref } } : n)
                                                                    );
                                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, loopVariable: ref } });
                                                                }}
                                                                className="w-full text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center gap-2"
                                                            >
                                                                <span>{v.icon}</span>
                                                                <span className="font-mono text-amber-400">{v.nodeId}.{v.key}</span>
                                                                <span className="text-slate-500 ml-auto">{v.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alias do Item</label>
                                            <input
                                                type="text"
                                                value={selectedNode.data.itemAlias || 'currentItem'}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, itemAlias: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, itemAlias: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none font-mono"
                                                placeholder="currentItem"
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                Nome da variável que representará cada item da lista.
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                                            <div>
                                                <p className="text-xs font-medium text-slate-300">Executar apenas 1x</p>
                                                <p className="text-[10px] text-slate-500">Processa apenas o primeiro item (ideal para testes)</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newVal = !selectedNode.data.loopOnce;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, loopOnce: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, loopOnce: newVal } });
                                                }}
                                                className={`relative w-10 h-5 rounded-full transition-colors ${selectedNode.data.loopOnce ? 'bg-amber-500' : 'bg-slate-600'}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${selectedNode.data.loopOnce ? 'translate-x-5' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                                            <div>
                                                <p className="text-xs font-medium text-slate-300">⚡ Executar em paralelo</p>
                                                <p className="text-[10px] text-slate-500">Cada item vira uma execução independente (mais rápido)</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newVal = !selectedNode.data.loopParallel;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, loopParallel: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, loopParallel: newVal } });
                                                }}
                                                className={`relative w-10 h-5 rounded-full transition-colors ${selectedNode.data.loopParallel ? 'bg-cyan-500' : 'bg-slate-600'}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${selectedNode.data.loopParallel ? 'translate-x-5' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-amber-400">
                                                🔄 Os nós conectados abaixo serão executados <strong>{selectedNode.data.loopOnce ? 'apenas 1 vez (once)' : selectedNode.data.loopParallel ? 'em paralelo (cada item = execução separada)' : 'uma vez para cada item'}</strong> da lista.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* === TRIGGER FLOW CONFIG === */}
                                {selectedNode.data.iconType === 'triggerflow' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Flow a Acionar</label>
                                            <select
                                                value={selectedNode.data.targetFlowId || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, targetFlowId: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, targetFlowId: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="">Selecione um flow...</option>
                                                {allFlows.filter(f => f.id !== flowId).map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNode.data.passContext ?? true}
                                                    onChange={(e) => {
                                                        const newVal = e.target.checked;
                                                        setNodes((nds) =>
                                                            nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, passContext: newVal } } : n)
                                                        );
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, passContext: newVal } });
                                                    }}
                                                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-300">Passar Contexto</span>
                                                    <span className="text-[9px] text-slate-500">Envia dados dos nós anteriores como entrada do flow acionado</span>
                                                </div>
                                            </label>
                                        </div>
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-emerald-400">
                                                🔀 O flow será acionado como nova execução. O worker processará automaticamente.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* === MEDIA OUTLET CONFIG === */}
                                {selectedNode.data.iconType === 'mediaoutlet' && (() => {
                                    const OUTLET_TYPES = [
                                        { key: 'todos', label: 'Todos' },
                                        { key: 'portal', label: 'Portal' },
                                        { key: 'tv', label: 'TV' },
                                        { key: 'radio', label: 'Rádio' },
                                        { key: 'instagram', label: 'Instagram' },
                                        { key: 'twitter', label: 'Twitter/X' },
                                        { key: 'youtube', label: 'YouTube' },
                                        { key: 'tiktok', label: 'TikTok' },
                                        { key: 'facebook', label: 'Facebook' },
                                        { key: 'other', label: 'Outro' },
                                    ];
                                    const selectedIds: string[] = selectedNode.data.selectedOutletIds || [];
                                    const filteredOutlets = allMediaOutlets.filter(o => {
                                        const matchTab = outletTab === 'todos' || o.type === outletTab;
                                        const matchSearch = !outletSearchTerm || o.name?.toLowerCase().includes(outletSearchTerm.toLowerCase()) || o.url?.toLowerCase().includes(outletSearchTerm.toLowerCase());
                                        return matchTab && matchSearch;
                                    });
                                    const tabOutlets = allMediaOutlets.filter(o => outletTab === 'todos' || o.type === outletTab);
                                    const allTabSelected = tabOutlets.length > 0 && tabOutlets.every(o => selectedIds.includes(o.id));
                                    const allGlobalSelected = allMediaOutlets.length > 0 && allMediaOutlets.every(o => selectedIds.includes(o.id));
                                    const typeLabels: Record<string, string> = { tv: 'TV', radio: 'Rádio', portal: 'Portal', instagram: 'IG', tiktok: 'TT', youtube: 'YT', facebook: 'FB', twitter: 'X', other: '?' };

                                    const updateSelectedIds = (newIds: string[]) => {
                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, selectedOutletIds: newIds, outletFilterMode: 'selected' } } : n));
                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, selectedOutletIds: newIds, outletFilterMode: 'selected' } });
                                    };

                                    const toggleAll = (outlets: any[]) => {
                                        const ids = outlets.map(o => o.id);
                                        const allSelected = ids.every(id => selectedIds.includes(id));
                                        if (allSelected) {
                                            updateSelectedIds(selectedIds.filter(id => !ids.includes(id)));
                                        } else {
                                            updateSelectedIds([...new Set([...selectedIds, ...ids])]);
                                        }
                                    };

                                    return (
                                        <>
                                            {/* Header with count */}
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-bold text-slate-500 uppercase">Veículos de Mídia</label>
                                                <span className="text-[10px] font-mono text-primary">{selectedIds.length}/{allMediaOutlets.length}</span>
                                            </div>

                                            {/* Select All Global */}
                                            <button
                                                onClick={() => toggleAll(allMediaOutlets)}
                                                className={`w-full text-xs py-1.5 rounded border transition-colors font-medium ${allGlobalSelected
                                                    ? 'bg-primary/15 border-primary/40 text-primary'
                                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                                    }`}
                                            >
                                                {allGlobalSelected ? '✓ Todos selecionados' : 'Selecionar Todos'} ({allMediaOutlets.length})
                                            </button>

                                            {/* Tabs by Type */}
                                            <div className="flex flex-wrap gap-1">
                                                {OUTLET_TYPES.map(t => {
                                                    const count = t.key === 'todos' ? allMediaOutlets.length : allMediaOutlets.filter(o => o.type === t.key).length;
                                                    if (count === 0 && t.key !== 'todos') return null;
                                                    const isActive = outletTab === t.key;
                                                    return (
                                                        <button
                                                            key={t.key}
                                                            onClick={() => setOutletTab(t.key)}
                                                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${isActive
                                                                ? 'bg-primary/20 text-primary border border-primary/40'
                                                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                                                }`}
                                                        >
                                                            {t.label} <span className="opacity-60">{count}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Search */}
                                            <input
                                                type="text"
                                                placeholder="Buscar veículo..."
                                                value={outletSearchTerm}
                                                onChange={(e) => setOutletSearchTerm(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:border-primary outline-none placeholder:text-slate-600"
                                            />

                                            {/* Select All for current tab */}
                                            {outletTab !== 'todos' && tabOutlets.length > 0 && (
                                                <button
                                                    onClick={() => toggleAll(tabOutlets)}
                                                    className={`w-full text-[10px] py-1 rounded border transition-colors ${allTabSelected
                                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                                                        }`}
                                                >
                                                    {allTabSelected ? `✓ Todos ${OUTLET_TYPES.find(t => t.key === outletTab)?.label || ''} selecionados` : `Selecionar todos ${OUTLET_TYPES.find(t => t.key === outletTab)?.label || ''}`} ({tabOutlets.length})
                                                </button>
                                            )}

                                            {/* Outlet list */}
                                            {allMediaOutlets.length === 0 ? (
                                                <div className="text-xs text-slate-500 py-2">Carregando veículos...</div>
                                            ) : (
                                                <div className="space-y-0.5 max-h-60 overflow-y-auto pr-1">
                                                    {filteredOutlets.length === 0 ? (
                                                        <div className="text-xs text-slate-600 py-3 text-center">Nenhum veículo encontrado</div>
                                                    ) : filteredOutlets.map((outlet: any) => {
                                                        const isSelected = selectedIds.includes(outlet.id);
                                                        return (
                                                            <label key={outlet.id} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded transition-colors ${isSelected ? 'bg-primary/10 border border-primary/30' : 'border border-transparent hover:bg-slate-800'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => {
                                                                        const newIds = isSelected
                                                                            ? selectedIds.filter((id: string) => id !== outlet.id)
                                                                            : [...selectedIds, outlet.id];
                                                                        updateSelectedIds(newIds);
                                                                    }}
                                                                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary h-3.5 w-3.5 flex-shrink-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs text-white font-medium truncate">{outlet.name}</span>
                                                                        <span className="text-[9px] px-1 py-0.5 rounded bg-slate-700 text-slate-400 flex-shrink-0">{typeLabels[outlet.type] || outlet.type}</span>
                                                                    </div>
                                                                    {outlet.url && <span className="text-[10px] text-slate-500 truncate block">{outlet.url}</span>}
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {selectedIds.length > 0 && (
                                                <div className="text-[10px] text-primary font-medium">
                                                    ✅ {selectedIds.length} veículo(s) selecionado(s)
                                                </div>
                                            )}
                                            <div className="bg-sky-500/10 border border-sky-500/20 rounded px-3 py-2">
                                                <p className="text-[10px] text-sky-400">
                                                    📺 Consulta a tabela de veículos de mídia cadastrados. Os resultados ficam disponíveis como variáveis para os próximos nós.
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* === TWITTER/X CONFIG === */}
                                {selectedNode.data.iconType === 'twitter_search' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operação</label>
                                            <select
                                                value={selectedNode.data.twitterOperation || 'search_recent'}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, twitterOperation: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="search_recent">🔍 Busca Recente (7 dias)</option>
                                                <option value="search_all">📚 Busca Full-Archive (Pro/Enterprise)</option>
                                                <option value="user_timeline">👤 Timeline de Usuário</option>
                                                <option value="user_mentions">📢 Menções de Usuário</option>
                                                <option value="user_lookup">🔎 Consultar Perfil</option>
                                            </select>
                                        </div>

                                        {(selectedNode.data.twitterOperation === 'search_recent' || selectedNode.data.twitterOperation === 'search_all' || !selectedNode.data.twitterOperation) && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Query de Busca</label>
                                                <textarea
                                                    value={selectedNode.data.twitterQuery || ''}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, twitterQuery: e.target.value };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    placeholder='Ex: "Flavio Bolsonaro" OR "Senado" lang:pt -is:retweet'
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-y min-h-[60px]"
                                                    rows={3}
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    Deixe vazio para usar keywords do nó upstream. Suporta operadores: OR, AND, -is:retweet, lang:pt, has:media
                                                </p>
                                            </div>
                                        )}

                                        {(selectedNode.data.twitterOperation === 'user_timeline' || selectedNode.data.twitterOperation === 'user_mentions' || selectedNode.data.twitterOperation === 'user_lookup') && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                                    <input
                                                        type="text"
                                                        value={selectedNode.data.twitterUsername || ''}
                                                        onChange={(e) => {
                                                            const newData = { ...selectedNode.data, twitterUsername: e.target.value.replace('@', '') };
                                                            setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                            setSelectedNode({ ...selectedNode, data: newData });
                                                        }}
                                                        placeholder="Ex: FlavioBolsonaro"
                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                    />
                                                </div>
                                                {selectedNode.data.twitterOperation !== 'user_lookup' && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User ID (opcional)</label>
                                                        <input
                                                            type="text"
                                                            value={selectedNode.data.twitterUserId || ''}
                                                            onChange={(e) => {
                                                                const newData = { ...selectedNode.data, twitterUserId: e.target.value };
                                                                setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                                setSelectedNode({ ...selectedNode, data: newData });
                                                            }}
                                                            placeholder="Ex: 123456789 (resolve automaticamente do username)"
                                                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {selectedNode.data.twitterOperation !== 'user_lookup' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                    Máximo de Resultados: {selectedNode.data.twitterMaxResults || 10}
                                                </label>
                                                <input
                                                    type="range"
                                                    min="10"
                                                    max="100"
                                                    step="10"
                                                    value={selectedNode.data.twitterMaxResults || 10}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, twitterMaxResults: Number(e.target.value) };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    className="w-full accent-sky-500"
                                                />
                                                <div className="flex justify-between text-[9px] text-slate-600">
                                                    <span>10</span><span>50</span><span>100</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-sky-500/10 border border-sky-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-sky-400">
                                                🐦 Coleta dados diretamente da API oficial do X (Twitter v2). Credenciais devem ser configuradas em <strong>Configurações → Integrações → X (Twitter) Oficial</strong>.
                                            </p>
                                            <p className="text-[10px] text-sky-500 mt-1">
                                                Cada tweet retorna: texto, autor, métricas (likes, RTs, replies, impressões), URL, e data.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* === SEMRUSH CONFIG === */}
                                {selectedNode.data.iconType === 'semrush' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operação</label>
                                            <select
                                                value={selectedNode.data.semrushOperation || 'domain_overview'}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, semrushOperation: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <optgroup label="Domínio">
                                                    <option value="domain_overview">🌐 Visão Geral do Domínio</option>
                                                    <option value="domain_organic">🔑 Keywords Orgânicas do Domínio</option>
                                                    <option value="domain_competitors">⚔️ Concorrentes Orgânicos</option>
                                                    <option value="domain_vs_domain">🆚 Domínio vs Domínio</option>
                                                    <option value="traffic_summary">📈 Histórico de Tráfego (12 meses)</option>
                                                </optgroup>
                                                <optgroup label="Keyword">
                                                    <option value="keyword_overview">🔍 Visão Geral da Keyword</option>
                                                    <option value="keyword_related">🔗 Keywords Relacionadas</option>
                                                    <option value="keyword_questions">❓ Perguntas (People Also Ask)</option>
                                                </optgroup>
                                                <optgroup label="Backlinks">
                                                    <option value="backlinks_overview">🔗 Visão Geral de Backlinks</option>
                                                    <option value="backlinks_list">📋 Lista de Backlinks (Top)</option>
                                                </optgroup>
                                            </select>
                                        </div>

                                        {['domain_overview', 'domain_organic', 'domain_competitors', 'domain_vs_domain', 'traffic_summary', 'backlinks_overview', 'backlinks_list'].includes(selectedNode.data.semrushOperation || 'domain_overview') && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domínio</label>
                                                <input
                                                    type="text"
                                                    value={selectedNode.data.semrushDomain || ''}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, semrushDomain: e.target.value };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    placeholder="Ex: g1.globo.com ou candidato.com.br"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">Deixe vazio para usar o domínio padrão das configurações.</p>
                                            </div>
                                        )}

                                        {selectedNode.data.semrushOperation === 'domain_vs_domain' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domínio Concorrente</label>
                                                <input
                                                    type="text"
                                                    value={selectedNode.data.semrushCompetitorDomain || ''}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, semrushCompetitorDomain: e.target.value };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    placeholder="Ex: concorrente.com.br"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                />
                                            </div>
                                        )}

                                        {['keyword_overview', 'keyword_related', 'keyword_questions'].includes(selectedNode.data.semrushOperation || '') && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Keyword</label>
                                                <input
                                                    type="text"
                                                    value={selectedNode.data.semrushKeyword || ''}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, semrushKeyword: e.target.value };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    placeholder='Ex: "Flavio Bolsonaro" ou "reforma tributária"'
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">Deixe vazio para usar a primeira keyword da ativação upstream.</p>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Database (País)</label>
                                            <select
                                                value={selectedNode.data.semrushDatabase || 'br'}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, semrushDatabase: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="br">🇧🇷 Brasil</option>
                                                <option value="us">🇺🇸 Estados Unidos</option>
                                                <option value="pt">🇵🇹 Portugal</option>
                                                <option value="es">🇪🇸 Espanha</option>
                                                <option value="ar">🇦🇷 Argentina</option>
                                                <option value="mx">🇲🇽 México</option>
                                                <option value="co">🇨🇴 Colômbia</option>
                                            </select>
                                        </div>

                                        {!['domain_overview', 'keyword_overview', 'backlinks_overview', 'domain_vs_domain'].includes(selectedNode.data.semrushOperation || 'domain_overview') && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                    Máximo de Resultados: {selectedNode.data.semrushLimit || 20}
                                                </label>
                                                <input
                                                    type="range"
                                                    min="10"
                                                    max="100"
                                                    step="10"
                                                    value={selectedNode.data.semrushLimit || 20}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, semrushLimit: Number(e.target.value) };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    className="w-full accent-orange-500"
                                                />
                                                <div className="flex justify-between text-[9px] text-slate-600">
                                                    <span>10</span><span>50</span><span>100</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-orange-400">
                                                📊 Consulta a API do SEMrush para dados de SEO, tráfego e visibilidade digital. Configure credenciais em <strong>Configurações → Integrações → SEMrush</strong>.
                                            </p>
                                            <p className="text-[10px] text-orange-500 mt-1">
                                                Retorna: rank, keywords orgânicas, tráfego estimado, backlinks, concorrentes e tendências.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* === BUZZSUMO CONFIG === */}
                                {selectedNode.data.iconType === 'buzzsumo' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operação</label>
                                            <select
                                                value={selectedNode.data.buzzsumoOperation || 'top_content'}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, buzzsumoOperation: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="top_content">🔥 Conteúdo Mais Compartilhado</option>
                                                <option value="trending_now">📈 Trending Agora</option>
                                                <option value="top_sharers">👥 Top Compartilhadores</option>
                                                <option value="influencers">⭐ Influenciadores</option>
                                                <option value="content_analysis">📊 Análise de Conteúdo (Agregado)</option>
                                                <option value="backlinks">🔗 Backlinks de URL</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                {selectedNode.data.buzzsumoOperation === 'backlinks' ? 'URL para Análise' : 'Query de Busca'}
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedNode.data.buzzsumoQuery || ''}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, buzzsumoQuery: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                placeholder={selectedNode.data.buzzsumoOperation === 'backlinks' ? 'https://...' : 'Ex: "Flavio Bolsonaro" OR "eleição"'}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">Deixe vazio para usar keywords/pessoas da ativação upstream.</p>
                                        </div>

                                        {['top_content', 'content_analysis', 'top_sharers'].includes(selectedNode.data.buzzsumoOperation || 'top_content') && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Período: últimos {selectedNode.data.buzzsumoDays || 30} dias</label>
                                                <input
                                                    type="range" min="1" max="365" step="1"
                                                    value={selectedNode.data.buzzsumoDays || 30}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, buzzsumoDays: Number(e.target.value) };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    className="w-full accent-rose-500"
                                                />
                                                <div className="flex justify-between text-[9px] text-slate-600"><span>1d</span><span>30d</span><span>365d</span></div>
                                            </div>
                                        )}

                                        {selectedNode.data.buzzsumoOperation === 'top_content' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ordenar por</label>
                                                <select
                                                    value={selectedNode.data.buzzsumoSortBy || 'total_shares'}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, buzzsumoSortBy: e.target.value };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                >
                                                    <option value="total_shares">📊 Total de Shares</option>
                                                    <option value="facebook_shares">📘 Facebook Shares</option>
                                                    <option value="twitter_shares">🐦 Twitter Shares</option>
                                                    <option value="evergreen_score">🌿 Evergreen Score</option>
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Máximo de Resultados: {selectedNode.data.buzzsumoLimit || 20}</label>
                                            <input type="range" min="5" max="100" step="5" value={selectedNode.data.buzzsumoLimit || 20}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, buzzsumoLimit: Number(e.target.value) };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full accent-rose-500"
                                            />
                                        </div>

                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-rose-400">
                                                🔥 Descobre conteúdo viral, influenciadores e engagement. Configure credenciais em <strong>Configurações → Integrações → BuzzSumo</strong>.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* ═══ GOOGLE TRENDS CONFIG ═══ */}
                                {selectedNode.data.iconType === 'google_trends' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operação</label>
                                            <select
                                                value={selectedNode.data.trendsOperation || 'interestOverTime'}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, trendsOperation: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                                            >
                                                <option value="interestOverTime">📈 Interesse ao Longo do Tempo</option>
                                                <option value="interestByRegion">🗺️ Interesse por Região</option>
                                                <option value="relatedQueries">🔍 Queries Relacionadas</option>
                                                <option value="relatedTopics">💡 Tópicos Relacionados</option>
                                                <option value="dailyTrends">🔥 Trending do Dia</option>
                                            </select>
                                        </div>

                                        {selectedNode.data.trendsOperation !== 'dailyTrends' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                    Keywords (separadas por vírgula)
                                                </label>
                                                <input
                                                    value={selectedNode.data.trendsKeywords || ''}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, trendsKeywords: e.target.value };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    placeholder='Ex: Lula, Bolsonaro, Eleições'
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                                                />
                                                <p className="text-[10px] text-slate-600 mt-0.5">Máximo 5. Se vazio, usa keywords do trigger.</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">País/Região</label>
                                                <select
                                                    value={selectedNode.data.trendsGeo || 'BR'}
                                                    onChange={(e) => {
                                                        const newData = { ...selectedNode.data, trendsGeo: e.target.value };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                                                >
                                                    <option value="BR">🇧🇷 Brasil</option>
                                                    <option value="US">🇺🇸 EUA</option>
                                                    <option value="">🌍 Global</option>
                                                </select>
                                            </div>
                                            {selectedNode.data.trendsOperation === 'interestOverTime' && (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Período</label>
                                                    <select
                                                        value={selectedNode.data.trendsTimeRange || '7d'}
                                                        onChange={(e) => {
                                                            const newData = { ...selectedNode.data, trendsTimeRange: e.target.value };
                                                            setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                            setSelectedNode({ ...selectedNode, data: newData });
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-xs"
                                                    >
                                                        <option value="1d">Último dia</option>
                                                        <option value="7d">7 dias</option>
                                                        <option value="30d">30 dias</option>
                                                        <option value="90d">90 dias</option>
                                                        <option value="12m">12 meses</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-green-500/10 border border-green-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-green-400">
                                                📈 Dados do Google Trends (gratuito). Compara interesse de busca entre termos. Não requer API key.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* === PERPLEXITY CONFIG === */}
                                {selectedNode.data.iconType === 'perplexity_search' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo</label>
                                            <select
                                                value={selectedNode.data.perplexityModel || 'sonar'}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, perplexityModel: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="sonar">⚡ Sonar — Rápido ($1/1k queries)</option>
                                                <option value="sonar-pro">🔍 Sonar Pro — Profundo ($5/1k)</option>
                                                <option value="sonar-reasoning">🧠 Reasoning — Chain-of-Thought</option>
                                                <option value="sonar-reasoning-pro">🧠+ Reasoning Pro — Avançado</option>
                                                <option value="sonar-deep-research">🔬 Deep Research — Investigativo</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pergunta / Query</label>
                                            <textarea
                                                value={selectedNode.data.perplexityQuery || ''}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, perplexityQuery: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                placeholder='Ex: "O que saiu nas últimas 24h sobre {trigger-1.people_of_interest.first}?"'
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-y min-h-[80px]"
                                                rows={4}
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">Suporta variáveis de nós upstream: {'{'}nodeId.campo{'}'}</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foco de Busca</label>
                                            <select
                                                value={selectedNode.data.perplexitySearchDomain || ''}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, perplexitySearchDomain: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="">🌐 Web (todos os sites)</option>
                                                <option value="news">📰 Foco em Notícias</option>
                                                <option value="academic">📚 Foco Acadêmico</option>
                                            </select>
                                        </div>

                                        <div className="bg-teal-500/10 border border-teal-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-teal-400">
                                                🔮 Pesquisa a web em tempo real e retorna respostas com <strong>fontes citadas</strong>. Ideal para briefings, fact-check e contextualização. Configure em <strong>Configurações → Integrações → Perplexity AI</strong>.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* === MANUS AI CONFIG === */}
                                {selectedNode.data.iconType === 'manus_agent' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Agente</label>
                                            <select
                                                value={selectedNode.data.manusAgentType || 'research'}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, manusAgentType: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="research">🔍 Pesquisa Investigativa</option>
                                                <option value="web_browsing">🌐 Navegação Web</option>
                                                <option value="data_analysis">📊 Análise de Dados</option>
                                                <option value="document_processing">📄 Processamento de Documentos</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição da Tarefa</label>
                                            <textarea
                                                value={selectedNode.data.manusTaskDescription || ''}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, manusTaskDescription: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                placeholder={'Ex: "Gere dossiê completo sobre {trigger-1.people_of_interest.first}: processos judiciais, patrimônio declarado, doadores de campanha, votações polêmicas"'}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-y min-h-[100px]"
                                                rows={5}
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">Quanto mais detalhada a instrução, melhor o resultado. Suporta variáveis de nós upstream.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Timeout (minutos)</label>
                                            <select
                                                value={selectedNode.data.manusTimeout || '10'}
                                                onChange={(e) => {
                                                    const newData = { ...selectedNode.data, manusTimeout: e.target.value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="5">5 min (tarefa simples)</option>
                                                <option value="10">10 min (padrão)</option>
                                                <option value="30">30 min (pesquisa média)</option>
                                                <option value="60">60 min (investigação profunda)</option>
                                            </select>
                                        </div>

                                        <div className="bg-violet-500/10 border border-violet-500/20 rounded px-3 py-2">
                                            <p className="text-[10px] text-violet-400">
                                                🧠 Agente autônomo que navega a web, investiga dados e gera dossiês. <strong>Execução assíncrona</strong> — pode levar minutos. Configure em <strong>Configurações → Integrações → Manus AI</strong>.
                                            </p>
                                            <p className="text-[10px] text-violet-500 mt-1">
                                                Ideal para: dossiês de pessoas, due diligence, monitoramento de diário oficial, mapeamento de redes.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {selectedNode.data.iconType === 'conditional' && (() => {
                                    const upstreamIds = edges.filter(e => e.target === selectedNode.id).map(e => e.source);
                                    const upstreamNodes = nodes.filter(n => upstreamIds.includes(n.id));
                                    const allUpstreamVars: { nodeId: string; nodeLabel: string; key: string; label: string }[] = [];
                                    upstreamNodes.forEach(un => {
                                        const vars = getNodeVariables(un);
                                        vars.forEach((v: any) => {
                                            allUpstreamVars.push({ nodeId: un.id, nodeLabel: un.data?.label || un.id, key: v.key, label: v.label });
                                        });
                                    });

                                    return (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Variável a Avaliar</label>
                                                <input
                                                    value={selectedNode.data.conditionSource || ''}
                                                    onChange={(e) => {
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, conditionSource: e.target.value } } : n));
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, conditionSource: e.target.value } });
                                                    }}
                                                    placeholder="ex: node-id.people_found"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                />
                                                {allUpstreamVars.length > 0 && (
                                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                                        {allUpstreamVars.map(v => (
                                                            <button
                                                                key={`${v.nodeId}.${v.key}`}
                                                                onClick={() => {
                                                                    const ref = `${v.nodeId}.${v.key}`;
                                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, conditionSource: ref } } : n));
                                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, conditionSource: ref } });
                                                                }}
                                                                className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded px-1.5 py-0.5 hover:bg-indigo-500/20 transition-colors"
                                                            >
                                                                {v.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operador</label>
                                                <select
                                                    value={selectedNode.data.conditionOperator || 'not_empty'}
                                                    onChange={(e) => {
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, conditionOperator: e.target.value } } : n));
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, conditionOperator: e.target.value } });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                >
                                                    <option value="exists">Existe (não é null)</option>
                                                    <option value="not_empty">Não está vazio</option>
                                                    <option value="equals">Igual a</option>
                                                    <option value="not_equals">Diferente de</option>
                                                    <option value="contains">Contém</option>
                                                    <option value="greater_than">Maior que</option>
                                                    <option value="less_than">Menor que</option>
                                                </select>
                                            </div>
                                            {['equals', 'not_equals', 'contains', 'greater_than', 'less_than'].includes(selectedNode.data.conditionOperator || '') && (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor de Comparação</label>
                                                    <input
                                                        value={selectedNode.data.conditionValue || ''}
                                                        onChange={(e) => {
                                                            setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, conditionValue: e.target.value } } : n));
                                                            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, conditionValue: e.target.value } });
                                                        }}
                                                        placeholder="Valor para comparar"
                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                    />
                                                </div>
                                            )}
                                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded px-3 py-2">
                                                <p className="text-[10px] text-indigo-400">
                                                    🔀 Se a condição for <strong>verdadeira</strong>, os nós conectados abaixo serão executados. Se <strong>falsa</strong>, a execução para neste ponto do ramo.
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* === LINK CHECK CONFIG === */}
                                {selectedNode.data.iconType === 'linkcheck' && (() => {
                                    const upstreamIds = edges.filter(e => e.target === selectedNode.id).map(e => e.source);
                                    const upstreamNodes = nodes.filter(n => upstreamIds.includes(n.id));
                                    const allUpstreamVars: { nodeId: string; nodeLabel: string; key: string; label: string }[] = [];
                                    upstreamNodes.forEach(un => {
                                        const vars = getNodeVariables(un);
                                        vars.forEach((v: any) => {
                                            allUpstreamVars.push({ nodeId: un.id, nodeLabel: un.data?.label || un.id, key: v.key, label: v.label });
                                        });
                                    });

                                    return (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL a Verificar</label>
                                                <select
                                                    value={selectedNode.data.urlVariable || ''}
                                                    onChange={(e) => {
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, urlVariable: e.target.value } } : n));
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, urlVariable: e.target.value } });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                >
                                                    <option value="">Selecione a variável com a URL</option>
                                                    {allUpstreamVars.map((v, i) => (
                                                        <option key={i} value={`${v.nodeId}.${v.key}`}>
                                                            {v.nodeLabel} → {v.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="bg-teal-500/10 border border-teal-500/20 rounded px-3 py-2">
                                                <p className="text-[10px] text-teal-400">
                                                    🔗 Verifica se a URL já foi processada anteriormente. Se <strong>já existe</strong>, os nós downstream serão ignorados. Se <strong>é nova</strong>, registra na base e continua.
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* === SET NODE CONFIG — Dynamic Field Mapping === */}
                                {selectedNode.data.iconType === 'set' && (() => {
                                    const setFields: Array<{ key: string; value: string; type: string }> = selectedNode.data.setFields || [];

                                    // Collect all upstream variables for the dropdown helper
                                    const upstreamIds = edges.filter(e => e.target === selectedNode.id).map(e => e.source);
                                    const upstreamNodes = nodes.filter(n => upstreamIds.includes(n.id));
                                    const allUpstreamVars: { nodeId: string; nodeLabel: string; key: string; label: string }[] = [];
                                    upstreamNodes.forEach(un => {
                                        const vars = getNodeVariables(un);
                                        vars.forEach((v: any) => {
                                            allUpstreamVars.push({ nodeId: un.id, nodeLabel: un.data?.label || un.id, key: v.key, label: v.label });
                                        });
                                    });

                                    const updateSetFields = (newFields: Array<{ key: string; value: string; type: string }>) => {
                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, setFields: newFields } } : n));
                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, setFields: newFields } });
                                    };

                                    const addField = () => {
                                        updateSetFields([...setFields, { key: '', value: '', type: 'string' }]);
                                    };

                                    const removeField = (index: number) => {
                                        updateSetFields(setFields.filter((_, i) => i !== index));
                                    };

                                    const updateField = (index: number, field: Partial<{ key: string; value: string; type: string }>) => {
                                        updateSetFields(setFields.map((f, i) => i === index ? { ...f, ...field } : f));
                                    };

                                    return (
                                        <>
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 mb-2">
                                                <p className="text-[10px] text-amber-400">
                                                    ⚙️ <strong>Set</strong> prepara e transforma dados. Defina os campos que serão repassados para os próximos nós. Use <code className="bg-slate-800 px-1 rounded text-amber-300">{'{'}{'{'} nodeId.variavel {'}'}{'}'}</code> para referenciar variáveis de nós anteriores.
                                                </p>
                                            </div>

                                            {/* Keep Upstream Toggle */}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNode.data.keepUpstream || false}
                                                    onChange={(e) => {
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, keepUpstream: e.target.checked } } : n));
                                                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, keepUpstream: e.target.checked } });
                                                    }}
                                                    className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                                                />
                                                <label className="text-xs text-slate-400">Manter dados de nós anteriores (adicionar campos)</label>
                                            </div>

                                            {/* Field Mappings */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Campos de Saída</label>
                                                <div className="space-y-2">
                                                    {setFields.map((field, index) => (
                                                        <div key={index} className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-slate-600 font-bold w-4">#{index + 1}</span>
                                                                <input
                                                                    type="text"
                                                                    placeholder="nome_do_campo"
                                                                    value={field.key}
                                                                    onChange={(e) => updateField(index, { key: e.target.value })}
                                                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-amber-500 outline-none font-mono"
                                                                />
                                                                <select
                                                                    value={field.type}
                                                                    onChange={(e) => updateField(index, { type: e.target.value })}
                                                                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-400 text-[10px] focus:border-amber-500 outline-none"
                                                                >
                                                                    <option value="string">Text</option>
                                                                    <option value="number">Num</option>
                                                                    <option value="boolean">Bool</option>
                                                                    <option value="json">JSON</option>
                                                                </select>
                                                                <button
                                                                    onClick={() => removeField(index)}
                                                                    className="text-slate-600 hover:text-red-400 transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="{{nodeId.variavel}} ou valor estático"
                                                                    value={field.value}
                                                                    onChange={(e) => updateField(index, { value: e.target.value })}
                                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-amber-500 outline-none font-mono placeholder-slate-600"
                                                                />
                                                            </div>
                                                            {/* Quick variable insert helper */}
                                                            {allUpstreamVars.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {allUpstreamVars.slice(0, 6).map((v, vi) => (
                                                                        <button
                                                                            key={vi}
                                                                            onClick={() => updateField(index, { value: `{{${v.nodeId}.${v.key}}}` })}
                                                                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[9px] text-slate-500 hover:text-amber-400 transition-colors font-mono truncate max-w-[120px]"
                                                                            title={`${v.nodeLabel} → ${v.label}`}
                                                                        >
                                                                            {v.nodeLabel.replace(/^[^\s]*\s/, '').substring(0, 8)}→{v.key}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={addField}
                                                    className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 border-dashed rounded text-xs text-slate-400 hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    + Adicionar Campo
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {selectedNode.data.iconType === 'script' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-red-400 uppercase mb-1">Script JavaScript</label>
                                            <p className="text-[10px] text-slate-500 mb-2">Executa código JS com acesso aos dados de nós anteriores.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo Pronto</label>
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    if (!e.target.value) return;
                                                    const templates: Record<string, string> = {
                                                        keyword_match: `// Busca palavras-chave da ativação nos conteúdos dos nós anteriores\n// context.activation contém: keywords, briefing, category, people_of_interest\nconst keywords = context.activation.keywords || [];\nconst allText = JSON.stringify(inputs).toLowerCase();\n\nconst matches = keywords.filter(kw => allText.includes(kw.toLowerCase()));\n\nlog('Keywords: ' + keywords.join(', '));\nlog('Matches: ' + matches.join(', '));\n\nresult = {\n    found: matches.length > 0,\n    matches,\n    total_keywords: keywords.length,\n    matched_count: matches.length,\n    _conditionResult: matches.length > 0\n};`,
                                                        keyword_in_content: `// Busca keywords no conteúdo de notícias (ideal dentro de loop)\nconst keywords = context.activation.keywords || [];\nconst people = context.activation.people_of_interest || [];\n\nlet title = '', content = '', url = '';\nfor (const [nodeId, data] of Object.entries(inputs)) {\n    if (data.response_title || data.title) title = data.response_title || data.title || '';\n    if (data.response_content || data.content) content = data.response_content || data.content || '';\n    if (data.response_url || data.url) url = data.response_url || data.url || '';\n}\n\nconst fullText = (title + ' ' + content).toLowerCase();\nconst kwMatches = keywords.filter(kw => fullText.includes(kw.toLowerCase()));\nconst peopleMatches = people.filter(p => fullText.includes(p.toLowerCase()));\n\nlog('Keywords: ' + (kwMatches.join(', ') || 'nenhuma'));\nlog('Pessoas: ' + (peopleMatches.join(', ') || 'nenhuma'));\n\nconst found = kwMatches.length > 0 || peopleMatches.length > 0;\nresult = { found, keyword_matches: kwMatches, people_matches: peopleMatches, title, url, _conditionResult: found };`,
                                                        extract_field: `// Extrair campo de um nó upstream\nconst nodeIds = Object.keys(inputs);\nlog('Nós disponíveis: ' + nodeIds.join(', '));\n\nconst sourceNode = nodeIds[nodeIds.length - 1];\nconst sourceData = inputs[sourceNode] || {};\nlog('Keys: ' + Object.keys(sourceData).join(', '));\n\nresult = { extracted: sourceData.items || sourceData.content || sourceData, sourceNode };`,
                                                        filter_items: `// Filtrar itens de um nó upstream\nlet items = [], sourceNode = '';\nfor (const [nodeId, data] of Object.entries(inputs)) {\n    if (data && Array.isArray(data.items) && data.items.length > 0) {\n        items = data.items; sourceNode = nodeId; break;\n    }\n}\n\nlog('Source: ' + sourceNode + ' (' + items.length + ' items)');\n\nconst searchTerm = 'política';\nconst filtered = items.filter(item => {\n    const text = (item.title || '') + ' ' + (item.content || '');\n    return text.toLowerCase().includes(searchTerm.toLowerCase());\n});\n\nlog('Filtrados: ' + filtered.length + ' de ' + items.length);\nresult = { items: filtered, count: filtered.length, original_count: items.length };`,
                                                        transform_json: `// Transformar dados de nós upstream\nconst summary = {};\nfor (const [nodeId, data] of Object.entries(inputs)) {\n    if (!data || data._skipped) continue;\n    summary[nodeId] = {\n        keys: Object.keys(data).filter(k => !k.startsWith('_')),\n        itemCount: Array.isArray(data.items) ? data.items.length : 0,\n    };\n}\nlog('Nós: ' + Object.keys(summary).length);\nresult = { merged: summary };`,
                                                    };
                                                    const code = templates[e.target.value] || '';
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, scriptCode: code } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, scriptCode: code } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                            >
                                                <option value="">Escolher template...</option>
                                                <option value="keyword_match">🏷 Buscar Palavra-chave (Geral)</option>
                                                <option value="keyword_in_content">🔍 Buscar Keywords no Conteúdo</option>
                                                <option value="extract_field">📤 Extrair Campo Específico</option>
                                                <option value="filter_items">🔍 Filtrar Itens por Critério</option>
                                                <option value="transform_json">🔄 Transformar JSON</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código</label>
                                            <textarea
                                                rows={12}
                                                value={selectedNode.data.scriptCode || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setNodes((nds) =>
                                                        nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, scriptCode: newVal } } : n)
                                                    );
                                                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, scriptCode: newVal } });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none font-mono leading-relaxed"
                                                placeholder={"// Variáveis disponíveis:\n// inputs — dados dos nós anteriores (inputs['nodeId'].campo)\n// context.activation — { keywords, briefing, category, people_of_interest }\n// log(msg) — gravar no log\n// result — atribuir o resultado aqui\n\nresult = inputs;"}
                                                spellCheck={false}
                                            />
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 text-slate-500 rounded border border-slate-700/50">inputs</span>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 text-slate-500 rounded border border-slate-700/50">context.activation</span>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 text-slate-500 rounded border border-slate-700/50">log()</span>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 text-slate-500 rounded border border-slate-700/50">result</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* === VARIÁVEIS DE ENTRADA (Shared for all action/publish nodes) === */}
                                {(selectedNode.type === 'action' || selectedNode.type === 'publish') && (() => {
                                    // Find upstream connected nodes
                                    const upstreamNodeIds = edges
                                        .filter(e => e.target === selectedNode.id)
                                        .map(e => e.source);
                                    const upstreamNodes = nodes.filter(n => upstreamNodeIds.includes(n.id));

                                    // Default to most recent (last in array) or configured source
                                    const selectedSourceId = selectedNode.data.sourceNodeId || (upstreamNodes.length > 0 ? upstreamNodes[upstreamNodes.length - 1].id : '');
                                    const selectedSourceNode = nodes.find(n => n.id === selectedSourceId);
                                    const sourceVars = selectedSourceNode ? getNodeVariables(selectedSourceNode) : [];

                                    return (
                                        <div className="pt-3 mt-3 border-t border-slate-800">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Variáveis de Entrada</label>

                                            {upstreamNodes.length === 0 ? (
                                                <p className="text-[10px] text-slate-600 italic">Conecte um nó anterior para ver variáveis disponíveis.</p>
                                            ) : (
                                                <>
                                                    <select
                                                        value={selectedSourceId}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            setNodes((nds) =>
                                                                nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, sourceNodeId: newVal } } : n)
                                                            );
                                                            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, sourceNodeId: newVal } });
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none mb-2"
                                                    >
                                                        {upstreamNodes.map(n => (
                                                            <option key={n.id} value={n.id}>
                                                                {n.data.label} ({n.id})
                                                            </option>
                                                        ))}
                                                    </select>

                                                    {sourceVars.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {sourceVars.map(v => (
                                                                <button
                                                                    key={v.key}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const tag = `{{${selectedSourceId}.${v.key}}}`;
                                                                        navigator.clipboard.writeText(tag);
                                                                        // Brief visual feedback
                                                                        const btn = document.activeElement as HTMLButtonElement;
                                                                        if (btn) {
                                                                            const orig = btn.textContent;
                                                                            btn.textContent = '✓ Copiado!';
                                                                            setTimeout(() => { btn.textContent = orig; }, 800);
                                                                        }
                                                                    }}
                                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer ${v.type === 'list'
                                                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
                                                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                                                        }`}
                                                                    title={`Clique para copiar: {{${selectedSourceId}.${v.key}}}`}
                                                                >
                                                                    <span>{v.icon}</span>
                                                                    <span>{v.label}</span>
                                                                    <span className="text-[8px] opacity-60">{v.type === 'list' ? '[]' : 'T'}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-600 italic">Nenhuma variável definida para este tipo de nó.</p>
                                                    )}

                                                    <p className="text-[9px] text-slate-600 mt-2">
                                                        💡 Clique na variável para copiar. Use no prompt, URL ou body.
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}

                                {selectedNode.type === 'trigger' && (() => {
                                    // Infer default trigger type based on iconType if not set
                                    const currentTriggerType = selectedNode.data.triggerType ||
                                        (selectedNode.data.iconType === 'database' ? 'datasource' :
                                            selectedNode.data.iconType === 'webhook' ? 'webhook' :
                                                selectedNode.data.iconType === 'schedule' ? 'schedule' :
                                                    selectedNode.data.iconType === 'activation' ? 'activation' : 'manual');

                                    return (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Gatilho</label>
                                                <select
                                                    value={currentTriggerType}
                                                    onChange={(e) => {
                                                        const type = e.target.value;
                                                        let iconType = 'http';
                                                        if (type === 'datasource') iconType = 'database';
                                                        if (type === 'webhook') iconType = 'webhook';
                                                        if (type === 'social_monitor') iconType = 'twitter';
                                                        if (type === 'activation') iconType = 'activation';
                                                        if (type === 'schedule') iconType = 'schedule';

                                                        const newData = { ...selectedNode.data, triggerType: type, iconType };

                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                >
                                                    <option value="manual">Manual (Start)</option>
                                                    <option value="activation">Evento de Ativação</option>
                                                    <option value="datasource">Fonte de Dados (Tabelas)</option>
                                                    <option value="webhook">Webhook Externo</option>
                                                    <option value="social_monitor">Monitoramento Social</option>
                                                </select>
                                            </div>

                                            {currentTriggerType === 'activation' && (() => {
                                                const triggerActivations = allActivations.filter(a => a.status === 'active' || a.status === 'pending');
                                                const selectedActivationId = selectedNode.data.activationId || '';
                                                const selectedActivationData = triggerActivations.find(a => a.id === selectedActivationId);
                                                const activationTab = selectedNode.data._uiTab || 'config';
                                                const setActivationTab = (tab: string) => {
                                                    const newData = { ...selectedNode.data, _uiTab: tab };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                };

                                                const cronPresets = [
                                                    { label: 'A cada 1min', cron: '* * * * *', desc: 'A cada 1 minuto' },
                                                    { label: 'A cada 5min', cron: '*/5 * * * *', desc: 'A cada 5 minutos' },
                                                    { label: 'A cada 15min', cron: '*/15 * * * *', desc: 'A cada 15 minutos' },
                                                    { label: 'A cada 30min', cron: '*/30 * * * *', desc: 'A cada 30 minutos' },
                                                    { label: 'A cada hora', cron: '0 * * * *', desc: 'Toda hora no minuto 0' },
                                                    { label: 'A cada 2h', cron: '0 */2 * * *', desc: 'A cada 2 horas' },
                                                    { label: 'A cada 6h', cron: '0 */6 * * *', desc: 'A cada 6 horas' },
                                                    { label: 'Diário 8h', cron: '0 8 * * *', desc: 'Todo dia às 08:00' },
                                                    { label: 'Diário 22h', cron: '0 22 * * *', desc: 'Todo dia às 22:00' },
                                                    { label: 'Seg-Sex 9h', cron: '0 9 * * 1-5', desc: 'Dias úteis às 09:00' },
                                                ];
                                                const currentCron = selectedNode.data.cronExpression || '';
                                                const timezones = [
                                                    'America/Sao_Paulo', 'America/Manaus', 'America/Bahia',
                                                    'America/Recife', 'America/Fortaleza', 'America/Belem',
                                                    'UTC', 'America/New_York', 'Europe/London'
                                                ];
                                                const updateCronField = (field: string, value: any) => {
                                                    const newData = { ...selectedNode.data, [field]: value };
                                                    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                    setSelectedNode({ ...selectedNode, data: newData });
                                                };
                                                const getCronDescription = (cron: string): string => {
                                                    const preset = cronPresets.find(p => p.cron === cron);
                                                    if (preset) return preset.desc;
                                                    const parts = cron.trim().split(/\s+/);
                                                    if (parts.length !== 5) return 'Expressão inválida';
                                                    const [min, hour, , , dow] = parts;
                                                    let desc = '';
                                                    if (min.startsWith('*/')) desc += `A cada ${min.slice(2)} minutos`;
                                                    else if (hour.startsWith('*/')) desc += `A cada ${hour.slice(2)} horas`;
                                                    else if (min !== '*' && hour !== '*') desc += `Às ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
                                                    else desc += 'Personalizado';
                                                    if (dow === '1-5') desc += ' (Seg-Sex)';
                                                    else if (dow === '0') desc += ' (Domingos)';
                                                    return desc;
                                                };

                                                return (
                                                    <div className="space-y-3">
                                                        {/* Tab Headers */}
                                                        <div className="flex border-b border-slate-700">
                                                            <button
                                                                type="button"
                                                                onClick={() => setActivationTab('config')}
                                                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${activationTab === 'config'
                                                                    ? 'text-primary border-b-2 border-primary'
                                                                    : 'text-slate-500 hover:text-slate-300'
                                                                    }`}
                                                            >
                                                                ⚙️ Configurações
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActivationTab('schedule')}
                                                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors relative ${activationTab === 'schedule'
                                                                    ? 'text-primary border-b-2 border-primary'
                                                                    : 'text-slate-500 hover:text-slate-300'
                                                                    }`}
                                                            >
                                                                ⏱ Agendamento
                                                                {currentCron && (
                                                                    <span className="ml-1.5 inline-flex w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* Tab: Configurações */}
                                                        {activationTab === 'config' && (
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ativação Vinculada</label>
                                                                    <select
                                                                        value={selectedActivationId}
                                                                        onChange={(e) => {
                                                                            const newData = { ...selectedNode.data, activationId: e.target.value || undefined };
                                                                            setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                                            setSelectedNode({ ...selectedNode, data: newData });
                                                                        }}
                                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:border-primary outline-none"
                                                                    >
                                                                        <option value="">— Selecione uma ativação —</option>
                                                                        {triggerActivations.map((a) => (
                                                                            <option key={a.id} value={a.id}>
                                                                                {a.name} ({a.status === 'active' ? 'Ativo' : 'Pendente'})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <p className="text-[10px] text-slate-600 mt-1">
                                                                        O fluxo será executado no contexto desta ativação.
                                                                    </p>
                                                                </div>

                                                                {selectedActivationData && (
                                                                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 space-y-2.5">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-bold text-white">{selectedActivationData.name}</span>
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${selectedActivationData.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                                                {selectedActivationData.status === 'active' ? 'ATIVO' : 'PENDENTE'}
                                                                            </span>
                                                                        </div>
                                                                        {selectedActivationData.description && (
                                                                            <div>
                                                                                <span className="text-[10px] text-slate-500 uppercase font-bold">Briefing</span>
                                                                                <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5 line-clamp-3">
                                                                                    {selectedActivationData.description}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                        {selectedActivationData.keywords && selectedActivationData.keywords.length > 0 && (
                                                                            <div>
                                                                                <span className="text-[10px] text-slate-500 uppercase font-bold">Palavras-chave</span>
                                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                                    {selectedActivationData.keywords.map((kw: string, i: number) => (
                                                                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">{kw}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {selectedActivationData.people_of_interest && selectedActivationData.people_of_interest.length > 0 && (
                                                                            <div>
                                                                                <span className="text-[10px] text-slate-500 uppercase font-bold">Pessoas de Interesse</span>
                                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                                    {selectedActivationData.people_of_interest.map((p: string, i: number) => (
                                                                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">{p}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {selectedActivationData.category && (
                                                                            <div className="text-[10px] text-slate-500">
                                                                                Categoria: <span className="text-slate-400">{selectedActivationData.category}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instruções para Análise (Padrão)</label>
                                                                    <textarea
                                                                        rows={3}
                                                                        value={selectedNode.data.analysisInstructions || ''}
                                                                        onChange={(e) => {
                                                                            const newVal = e.target.value;
                                                                            const newData = { ...selectedNode.data, analysisInstructions: newVal };
                                                                            setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                                            setSelectedNode({ ...selectedNode, data: newData });
                                                                        }}
                                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                                        placeholder="Instruções padrão para a IA (serão enviadas no contexto)..."
                                                                    />
                                                                    <p className="text-[10px] text-slate-600 mt-1">
                                                                        Define o contexto inicial para a análise de arquivos recebidos por este gatilho.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Tab: Agendamento */}
                                                        {activationTab === 'schedule' && (
                                                            <div className="space-y-4">
                                                                {/* Active Toggle */}
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-slate-500 uppercase">Agendamento Ativo</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newActive = selectedNode.data.scheduleActive === false ? true : false;
                                                                            updateCronField('scheduleActive', newActive);
                                                                            // Auto-save schedule toggle when flow already exists
                                                                            if (flowId && selectedNode.data.cronExpression) {
                                                                                const updatedNodes = nodes.map(n =>
                                                                                    n.id === selectedNode.id
                                                                                        ? { ...n, data: { ...n.data, scheduleActive: newActive } }
                                                                                        : n
                                                                                );
                                                                                updateFlowSchedule(flowId, updatedNodes);
                                                                            }
                                                                        }}
                                                                        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${selectedNode.data.scheduleActive !== false ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                                                    >
                                                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${selectedNode.data.scheduleActive !== false ? 'left-[18px]' : 'left-0.5'}`} />
                                                                    </button>
                                                                </div>

                                                                {/* Presets */}
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Periodicidade</label>
                                                                    <div className="grid grid-cols-2 gap-1.5">
                                                                        {cronPresets.map((preset) => (
                                                                            <button
                                                                                key={preset.cron}
                                                                                type="button"
                                                                                onClick={() => updateCronField('cronExpression', preset.cron)}
                                                                                className={`text-[11px] px-2 py-1.5 rounded border transition-colors text-left ${currentCron === preset.cron
                                                                                    ? 'bg-primary/15 border-primary/40 text-primary font-bold'
                                                                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                                                                                    }`}
                                                                            >
                                                                                {preset.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Manual Expression */}
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expressão CRON</label>
                                                                    <input
                                                                        type="text"
                                                                        value={currentCron}
                                                                        onChange={(e) => updateCronField('cronExpression', e.target.value)}
                                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:border-primary outline-none font-mono"
                                                                        placeholder="* * * * *"
                                                                    />
                                                                    <div className="flex items-center justify-between mt-1">
                                                                        <p className="text-[10px] text-slate-600">min hora dia mês dia-sem</p>
                                                                        {currentCron && (
                                                                            <p className="text-[10px] text-primary font-medium">{getCronDescription(currentCron)}</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Timezone */}
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuso Horário</label>
                                                                    <select
                                                                        value={selectedNode.data.scheduleTimezone || 'America/Sao_Paulo'}
                                                                        onChange={(e) => updateCronField('scheduleTimezone', e.target.value)}
                                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:border-primary outline-none"
                                                                    >
                                                                        {timezones.map(tz => (
                                                                            <option key={tz} value={tz}>{tz.replace('America/', '').replace('Europe/', '').replace('_', ' ')}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                {/* Summary */}
                                                                {currentCron && (
                                                                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                                                                        <span className="text-[10px] text-slate-500 uppercase font-bold">Resumo</span>
                                                                        <p className="text-xs text-slate-300 mt-1">{getCronDescription(currentCron)}</p>
                                                                        <p className="text-[10px] text-slate-600 mt-1 font-mono">
                                                                            {currentCron} • {selectedNode.data.scheduleTimezone || 'America/Sao_Paulo'}
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 mt-2">
                                                                            <span className={`w-2 h-2 rounded-full ${selectedNode.data.scheduleActive !== false ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                                                            <span className="text-[10px] text-slate-500">
                                                                                {selectedNode.data.scheduleActive !== false ? 'Ativo — será executado automaticamente' : 'Inativo — apenas execução manual'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {!currentCron && (
                                                                    <div className="text-center py-4">
                                                                        <p className="text-xs text-slate-500">Selecione uma periodicidade ou digite uma expressão CRON</p>
                                                                        <p className="text-[10px] text-slate-600 mt-1">Sem agendamento, o fluxo só executa manualmente.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}



                                            {currentTriggerType === 'manual' && (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instruções para Análise (Padrão)</label>
                                                    <textarea
                                                        rows={3}
                                                        value={selectedNode.data.analysisInstructions || ''}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            const newData = { ...selectedNode.data, analysisInstructions: newVal };
                                                            setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                            setSelectedNode({ ...selectedNode, data: newData });
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none resize-none"
                                                        placeholder="Instruções padrão para a IA (serão enviadas no contexto)..."
                                                    />
                                                    <p className="text-[10px] text-slate-600 mt-1">
                                                        Define o contexto inicial para a análise de arquivos recebidos por este gatilho.
                                                    </p>
                                                </div>
                                            )}

                                            {currentTriggerType === 'social_monitor' && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rede / Fonte</label>
                                                        <div className="flex gap-2">
                                                            {['twitter', 'brandwatch', 'buzzsumo'].map(source => (
                                                                <button
                                                                    key={source}
                                                                    onClick={() => {
                                                                        const newData = { ...selectedNode.data, iconType: source };
                                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                                    }}
                                                                    className={`p-2 rounded border transition-colors ${selectedNode.data.iconType === source ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                                                    title={source}
                                                                >
                                                                    {source === 'twitter' && <Twitter className="w-4 h-4" />}
                                                                    {source === 'brandwatch' && <Building className="w-4 h-4" />}
                                                                    {source === 'buzzsumo' && <FileText className="w-4 h-4" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Termo Monitorado</label>
                                                        <input
                                                            type="text"
                                                            value={selectedNode.data.keywords || ''}
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                const newData = { ...selectedNode.data, keywords: newVal };
                                                                setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                                setSelectedNode({ ...selectedNode, data: newData });
                                                            }}
                                                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                            placeholder="Ex: @candidato OR #eleicoes"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {currentTriggerType === 'datasource' && (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tabela Origem</label>
                                                    <select
                                                        value={selectedNode.data.sourceTable || 'mentions'}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const newData = { ...selectedNode.data, sourceTable: val, triggerType: 'datasource' };
                                                            setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                            setSelectedNode({ ...selectedNode, data: newData });
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                    >
                                                        <option value="mentions">Menções (mentions)</option>
                                                        <option value="intelligence_feed">Feed de Inteligência</option>
                                                        <option value="activations">Ativações/Demandas</option>
                                                    </select>
                                                    <p className="text-[10px] text-slate-600 mt-1">
                                                        Dispara o fluxo quando um novo registro é criado nesta tabela.
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                    {currentTriggerType === 'datasource' ? 'Filtro (Keywords Opcional)' : 'Palavras-chave (Monitoramento)'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedNode.data.keywords || ''}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        const newData = { ...selectedNode.data, keywords: newVal };
                                                        setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n));
                                                        setSelectedNode({ ...selectedNode, data: newData });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:border-primary outline-none"
                                                    placeholder={currentTriggerType === 'datasource' ? "Ex: urgente, politica (vazio = todos)" : "Ex: candidato, governo..."}
                                                />
                                            </div>

                                            {currentTriggerType === 'webhook' && (
                                                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[10px] font-mono text-slate-400 break-all">
                                                    POST /api/webhooks/flow/{selectedNode.id}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {selectedNode.data.iconType !== 'ai' && selectedNode.data.iconType !== 'manus' && selectedNode.data.iconType !== 'perplexity' && selectedNode.type !== 'trigger' && (
                                    <p className="text-xs text-slate-500">Mais propriedades seriam configuradas aqui dependendo do tipo de nó ({selectedNode.type}).</p>
                                )}
                            </div>
                        </div >
                        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-950/30">
                            <button
                                onClick={() => {
                                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                                    setSelectedNode(null);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md text-xs font-medium transition-colors border border-red-500/20"
                            >
                                <Trash2 className="w-4 h-4" /> Excluir Nó
                            </button>
                        </div>
                    </>
                )}
            </div >

            {/* ExecutionOverlay disabled - using integrated node indicators instead */}
            {/* {currentExecution && (
                <ExecutionOverlay execution={currentExecution} nodes={nodes} />
            )} */}

            {
                showExecutionPanel && currentExecution && (
                    <ExecutionPanel
                        execution={currentExecution}
                        focusNodeId={debugFocusNodeId}
                        onClose={() => {
                            setShowExecutionPanel(false);
                            setDebugFocusNodeId(null);
                            // Clear execution visual if not actively running
                            if (currentExecution?.status !== 'running' && currentExecution?.status !== 'pending') {
                                setCurrentExecution(null);
                            }
                        }}
                        onExecutionChange={(ex) => setCurrentExecution(ex)}
                    />
                )
            }
        </div >
    );
};


