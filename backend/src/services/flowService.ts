import { SupabaseClient } from '@supabase/supabase-js';
import { AIService } from './aiService';

interface FlowNode {
    id: string;
    type: string;
    data: any;
}

interface FlowEdge {
    source: string;
    target: string;
}

interface FlowContext {
    initialData: any;
    nodeOutputs: Map<string, any>; // Store output from each node by ID
    [key: string]: any;
}

export class FlowService {
    private supabase: SupabaseClient;
    private aiService: AIService;

    constructor(supabaseClient: SupabaseClient, aiService: AIService) {
        this.supabase = supabaseClient;
        this.aiService = aiService;
    }

    async executeFlow(flowId: string, initialData: any, userId?: string): Promise<any> {
        console.log(`[FlowService] Starting execution of Flow ID: ${flowId} (User: ${userId || 'System'})`);

        // 1. Fetch Flow
        const { data: flow, error } = await this.supabase
            .from('flows')
            .select('*')
            .eq('id', flowId)
            .single();

        if (error || !flow) {
            throw new Error(`Flow not found: ${error?.message}`);
        }

        if (!flow.active) {
            console.warn(`[FlowService] Flow ${flowId} is inactive. Skipping.`);
            return;
        }

        // 2. Create Demand (Traceability Start)
        console.log(`[FlowService] Creating Demand for Flow: ${flow.name}`);
        const { data: demand, error: demandError } = await this.supabase
            .from('demands')
            .insert({
                title: initialData?.title || `Execução: ${flow.name} - ${new Date().toLocaleString()}`,
                description: initialData?.description || 'Demanda gerada automaticamente pelo fluxo.',
                flow_id: flowId,
                status: 'active',
                created_by: userId // Attribution
            })
            .select()
            .single();

        if (demandError) {
            console.error('[FlowService] Error creating demand:', demandError);
        }

        const demandId = demand?.id;
        console.log(`[FlowService] Demand Created: ${demandId}`);

        // 3. Create Execution Record for tracking
        const { data: execution, error: execError } = await this.supabase
            .from('flow_executions')
            .insert({
                flow_id: flowId,
                demand_id: demandId,
                activation_id: initialData.activationId,
                status: 'running',
                execution_log: [],
                user_id: userId // Attribution
            })
            .select()
            .single();

        if (execError) {
            console.error('[FlowService] Failed to create execution record:', execError);
        }

        const executionId = execution?.id;
        console.log(`[FlowService] Execution record created: ${executionId}`);

        const nodes: FlowNode[] = flow.nodes;
        const edges: FlowEdge[] = flow.edges;

        // Context to carry data between nodes
        let context: FlowContext = {
            initialData,
            demandId,
            executionId,
            activationId: initialData?.activationId, // Pass Activation ID for context injection
            userId, // Store in context for nodes usage
            nodeOutputs: new Map()
        };

        // ... rest of traverse logic ...
        // (No changes needed in traversal until logging)

        // 3. Find Trigger Node (Start)
        const startNode = nodes.find(n => n.type === 'trigger');
        if (!startNode) {
            throw new Error('No trigger node found in flow.');
        }

        console.log(`[FlowService] Trigger found: ${startNode.data.label}`);

        let currentNode: FlowNode | undefined = startNode;
        let steps = 0;
        const MAX_STEPS = 50;

        while (currentNode && steps < MAX_STEPS) {
            steps++;
            console.log(`[FlowService] Executing Node: ${currentNode.type} (${currentNode.id})`);

            if (executionId) {
                await this.logNodeStart(executionId, currentNode);
            }

            const nodeStartTime = Date.now();

            try {
                const output = await this.processNode(currentNode, context);
                if (output !== undefined && output !== null) {
                    context.nodeOutputs.set(currentNode.id, output);
                }

                if (executionId) {
                    await this.logNodeComplete(executionId, currentNode, output, Date.now() - nodeStartTime);
                }
            } catch (err: any) {
                console.error(`[FlowService] Error at node ${currentNode.id}:`, err);

                if (executionId) {
                    await this.logNodeError(executionId, currentNode, err.message);
                }

                if (executionId) {
                    await this.supabase.rpc('update_execution_status', {
                        p_execution_id: executionId,
                        p_status: 'failed',
                        p_error_message: err.message
                    });
                }
                break;
            }

            const edge = edges.find(e => e.source === currentNode!.id);
            if (!edge) {
                console.log(`[FlowService] End of flow reached.`);
                if (demandId) {
                    await this.supabase.from('demands').update({ status: 'completed' }).eq('id', demandId);
                }
                if (executionId) {
                    await this.supabase.rpc('update_execution_status', {
                        p_execution_id: executionId,
                        p_status: 'completed'
                    });
                }
                break;
            }

            currentNode = nodes.find(n => n.id === edge.target);
        }

        return { context, executionId };
    }

    // Trigger a flow based on an event
    async triggerFlow(triggerType: string, payload: any, userId?: string): Promise<void> {
        console.log(`[FlowService] Triggering flows for type: ${triggerType} (User: ${userId})`, payload);

        const { data: flows, error } = await this.supabase
            .from('flows')
            .select('*')
            .eq('active', true);

        if (error || !flows) {
            console.error('[FlowService] Failed to fetch flows for trigger:', error);
            return;
        }

        const matchingFlows = flows.filter(flow => {
            const triggerNode = flow.nodes.find((n: any) => n.type === 'trigger');
            if (!triggerNode) return false;
            const config = triggerNode.data;
            if (!config) return false;

            if (triggerType === 'manual' && config.triggerType === 'manual') return true;
            // Note: cron schedules are handled directly by SchedulerService.processSchedule → executeFlow()

            if (triggerType.startsWith('source:')) {
                const tableName = triggerType.split(':')[1];
                return config.triggerType === 'datasource' && config.sourceTable === tableName;
            }

            if (triggerType === 'webhook' && config.triggerType === 'webhook') {
                return true;
            }

            return false;
        });

        console.log(`[FlowService] Found ${matchingFlows.length} matching flows.`);

        for (const flow of matchingFlows) {
            try {
                const initialData = {
                    title: `Disparo Automático: ${flow.name}`,
                    description: `Gatilho: ${triggerType}`,
                    source: payload.source || 'system',
                    ...payload
                };

                // Pass userId
                this.executeFlow(flow.id, initialData, userId).catch(err =>
                    console.error(`[FlowService] Async execution failed for flow ${flow.id}:`, err)
                );
            } catch (err) {
                console.error(`[FlowService] Failed to start flow ${flow.id}:`, err);
            }
        }
    }

    private async processNode(node: FlowNode, context: FlowContext): Promise<any> {
        console.log(`[FlowService][processNode] CALLED for node ${node.id}, type: ${node.type}`);

        switch (node.type) {
            case 'trigger':
                // Log Trigger Input to Feed
                await this.logToFeed(context.demandId, {
                    title: 'Gatilho Acionado',
                    content: context.initialData,
                    source: 'Trigger',
                    inputType: 'event',
                    meta: context.initialData,
                    sourceNodeId: node.id
                }, context.userId);
                return context.initialData;

            case 'action':
                return await this.handleActionNode(node, context);

            case 'publish':
                return await this.handlePublishNode(node, context);

            case 'condition':
                // TODO: Implement conditional logic
                return null;

            default:
                console.warn(`Unknown node type: ${node.type}`);
                return null;
        }
    }

    private async fetchActivationContext(activationId: string): Promise<string> {
        const { data, error } = await this.supabase
            .from('activations')
            .select('title, keywords, people_of_interest')
            .eq('id', activationId)
            .single();

        if (error || !data) return '';

        const keywords = data.keywords && data.keywords.length > 0 ? `Keywords: ${data.keywords.join(', ')}` : '';
        const people = data.people_of_interest && data.people_of_interest.length > 0 ? `People of Interest: ${data.people_of_interest.join(', ')}` : '';

        return `\nCONTEXTO DA ATIVAÇÃO (${data.title}):\n${keywords}\n${people}`.trim();
    }

    private async handleActionNode(node: FlowNode, context: FlowContext): Promise<any> {
        const { iconType, prompt, model, temperature, query, sources, depth, useActivationContext } = node.data;

        let activationContext = '';
        if (useActivationContext && context.activationId) {
            console.log(`[FlowService] Fetching activation context for node ${node.id}...`);
            activationContext = await this.fetchActivationContext(context.activationId);
        }

        if (iconType === 'ai') {
            const inputText = context.lastResult?.summary || context.initialData?.description || "Sem texto para analisar";
            console.log(`[FlowService] Running AI Analysis on: ${inputText.substring(0, 50)}...`);

            // Inject context into prompt
            const finalPrompt = activationContext ? `${prompt || ''}\n\n${activationContext}` : prompt;

            const result = await this.aiService.analyzeText(inputText, finalPrompt, model);

            context.lastResult = result;
            context[`node_${node.id}`] = result;

            await this.logToFeed(context.demandId, {
                title: 'Análise de IA Realizada',
                content: result,
                source: 'AI Analysis',
                inputType: 'text',
                meta: { model, temperature, prompt: finalPrompt },
                sourceNodeId: node.id
            }, context.userId);

            return result;
        }
        else if (iconType === 'manus') {
            const baseQuery = query || context.initialData?.title || "Temas do momento";
            // Append context to query if enabled
            const searchQuery = activationContext ? `${baseQuery} ${activationContext}` : baseQuery;

            const includeDocs = node.data.includeDocs !== false;

            console.log(`[FlowService] Running Manus Research. Query: "${searchQuery}"`);

            const result = await this.aiService.researchManus(searchQuery, { docs: includeDocs, links: true });

            context.lastResult = result;
            context[`node_${node.id}`] = result;

            await this.logToFeed(context.demandId, {
                title: `Pesquisa Profunda: ${baseQuery}`,
                content: result.summary,
                source: 'Manus',
                inputType: 'document',
                meta: {
                    full_result: result,
                    documents: result.documents,
                    links: result.links,
                    used_context: !!activationContext
                },
                sourceNodeId: node.id
            }, context.userId);

            return result;
        }
        else if (iconType === 'perplexity') {
            const baseQuery = query || context.initialData?.title || "Notícias recentes";
            // Append context to query if enabled
            const searchQuery = activationContext ? `${baseQuery} ${activationContext}` : baseQuery;

            const focus = node.data.focus || 'news';

            console.log(`[FlowService] Running Perplexity Search. Query: "${searchQuery}"`);

            const result = await this.aiService.researchPerplexity(searchQuery, { focus });

            context.lastResult = result;
            context[`node_${node.id}`] = result;

            await this.logToFeed(context.demandId, {
                title: `Busca em Tempo Real: ${baseQuery}`,
                content: result.summary,
                source: 'Perplexity',
                inputType: 'link',
                meta: {
                    full_result: result,
                    citations: result.citations,
                    used_context: !!activationContext
                },
                sourceNodeId: node.id
            }, context.userId);

            return result;
        }
        else if (iconType === 'search') {
            const baseQuery = query || context.initialData?.title || "Temas do momento";
            // Append context to query if enabled
            const searchQuery = activationContext ? `${baseQuery} ${activationContext}` : baseQuery;

            const selectedSources = sources || ['manus'];

            console.log(`[FlowService] Running Generic Search. Query: "${searchQuery}"`);

            const promises = [];
            if (selectedSources.includes('manus')) {
                promises.push(this.aiService.researchManus(searchQuery, { docs: true, links: true }).then(res => ({ source: 'manus', data: res })));
            }
            if (selectedSources.includes('perplexity')) {
                promises.push(this.aiService.researchPerplexity(searchQuery).then(res => ({ source: 'perplexity', data: res })));
            }

            const searchResults = await Promise.all(promises);
            const combinedResult = {
                summary: `Search results for "${searchQuery}"`,
                sources: searchResults.reduce((acc: any, curr: any) => ({ ...acc, [curr.source]: curr.data }), {})
            };

            context.lastResult = combinedResult;
            context[`node_${node.id}`] = combinedResult;
            return combinedResult;
        }
    }

    private async handlePublishNode(node: FlowNode, context: FlowContext): Promise<any> {
        const { title, category, template, sourceNodes } = node.data;

        console.log(`[FlowService] Publishing to Feed: ${title || 'Untitled'}`);

        const aggregatedData: any = {};
        const sourceNodesList = sourceNodes || [];

        sourceNodesList.forEach((nodeId: string) => {
            const output = context.nodeOutputs.get(nodeId);
            if (output) aggregatedData[nodeId] = output;
        });

        let content = template || '';
        Object.keys(aggregatedData).forEach(nodeId => {
            const placeholder = `{${nodeId}}`;
            const data = aggregatedData[nodeId];
            const dataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), dataString);
        });

        let keywords: string[] = [];
        try {
            keywords = await this.aiService.extractKeywords(content);
        } catch (error) {
            console.error('[FlowService] Failed to generate keywords:', error);
        }

        try {
            const feedItem = {
                demand_id: context.demandId,
                activation_id: context.activationId,
                title: title || 'Flow Output',
                content,
                category: category || 'neutral',
                source: 'flow_automation',
                input_type: 'aggregated',
                keywords,
                user_id: context.userId, // Attribution
                meta: {
                    flowNodeId: node.id,
                    sourceNodes: sourceNodesList,
                    rawData: aggregatedData,
                    template
                },
                created_at: new Date()
            };

            const { data, error } = await this.supabase.from('intelligence_feed').insert(feedItem).select();

            if (error) throw error;
            console.log(`[FlowService] ✅ Successfully published! Feed ID:`, data?.[0]?.id);
            return feedItem;
        } catch (error) {
            console.error('[FlowService] Failed to publish to feed:', error);
            throw error;
        }
    }

    // Update logToFeed to accept userId
    private async logToFeed(demandId: string | undefined, data: {
        title: string,
        content: any,
        source: string,
        inputType: string,
        meta?: any,
        sourceNodeId?: string
    }, userId?: string) {
        if (!demandId) return;

        try {
            await this.supabase.from('intelligence_feed').insert({
                demand_id: demandId,
                title: data.title,
                content: data.content,
                source: data.source,
                input_type: data.inputType,
                meta: data.meta,
                source_node_id: data.sourceNodeId,
                user_id: userId, // Attribution
                created_at: new Date()
            });
        } catch (error) {
            console.error('[FlowService] Failed to log to feed:', error);
        }
    }

    // =============================================
    // Execution Tracking Methods
    // =============================================

    private async logNodeStart(executionId: string, node: FlowNode) {
        if (!executionId) return;

        const logEntry = {
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.data.label || node.type,
            status: 'running',
            startedAt: new Date().toISOString()
        };

        await this.supabase.rpc('append_execution_log', {
            p_execution_id: executionId,
            p_log_entry: logEntry
        });

        await this.supabase.rpc('set_current_node', {
            p_execution_id: executionId,
            p_node_id: node.id
        });
    }

    private async logNodeComplete(executionId: string, node: FlowNode, output: any, duration: number): Promise<void> {
        const logEntry = {
            nodeId: node.id,
            status: 'completed',
            completedAt: new Date().toISOString(),
            output,
            duration
        };

        await this.supabase.rpc('append_execution_log', {
            p_execution_id: executionId,
            p_log_entry: logEntry
        });

        await this.supabase.rpc('mark_node_completed', {
            p_execution_id: executionId,
            p_node_id: node.id
        });
    }

    private async logNodeError(executionId: string, node: FlowNode, error: string): Promise<void> {
        const logEntry = {
            nodeId: node.id,
            status: 'failed',
            completedAt: new Date().toISOString(),
            error
        };

        await this.supabase.rpc('append_execution_log', {
            p_execution_id: executionId,
            p_log_entry: logEntry
        });
    }
}
