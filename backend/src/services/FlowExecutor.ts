import { supabase } from '../config/supabase';
import { NodeHandler, ExecutionContext, NodeOutput } from '../nodes/NodeHandler';
import { TriggerHandler } from '../nodes/handlers/TriggerHandler';
import { SourceHandler } from '../nodes/handlers/SourceHandler';
import { AnalysisHandler } from '../nodes/handlers/AnalysisHandler';
import { PublishHandler } from '../nodes/handlers/PublishHandler';
import { HttpRequestHandler } from '../nodes/handlers/HttpRequestHandler';
import { LoopHandler } from '../nodes/handlers/LoopHandler';
import { TriggerFlowHandler } from '../nodes/handlers/TriggerFlowHandler';
import { MediaOutletHandler } from '../nodes/handlers/MediaOutletHandler';
import { ConditionalHandler } from '../nodes/handlers/ConditionalHandler';
import { LinkCheckHandler } from '../nodes/handlers/LinkCheckHandler';
import { SetHandler } from '../nodes/handlers/SetHandler';
import { ScriptHandler } from '../nodes/handlers/ScriptHandler';
import { TwitterHandler } from '../nodes/handlers/TwitterHandler';
import { SemrushHandler } from '../nodes/handlers/SemrushHandler';
import { BuzzSumoHandler } from '../nodes/handlers/BuzzSumoHandler';
import { PerplexityHandler } from '../nodes/handlers/PerplexityHandler';
import { ManusHandler } from '../nodes/handlers/ManusHandler';
import { GoogleTrendsHandler } from '../nodes/handlers/GoogleTrendsHandler';
import { WhatsAppHandler } from '../nodes/handlers/WhatsAppHandler';

export class FlowExecutor {
    private handlers: Record<string, NodeHandler> = {};

    constructor() {
        this.handlers['trigger'] = new TriggerHandler();
        this.handlers['source'] = new SourceHandler(); // Custom mapping needed?
        this.handlers['action'] = new AnalysisHandler(); // 'action' is generic, need specific types
        // In Builder, we used specific iconTypes. 
        // Let's refine the mapping based on Node Data.
    }

    private getHandler(node: any): NodeHandler | null {
        // 1. Check by Node Type
        if (node.type === 'trigger') return new TriggerHandler();

        // 2. Check by Icon Type (Data)
        const iconType = node.data?.iconType;
        if (iconType === 'twitter_search') {
            return new TwitterHandler();
        }

        if (iconType === 'semrush') {
            return new SemrushHandler();
        }

        if (iconType === 'buzzsumo') {
            return new BuzzSumoHandler();
        }

        if (iconType === 'perplexity_search') {
            return new PerplexityHandler();
        }

        if (iconType === 'manus_agent') {
            return new ManusHandler();
        }

        if (iconType === 'google_trends') {
            return new GoogleTrendsHandler();
        }

        if (iconType === 'twitter' || iconType === 'brandwatch' || iconType === 'database') {
            return new SourceHandler();
        }

        if (iconType === 'ai' || iconType === 'perplexity' || iconType === 'manus') {
            return new AnalysisHandler();
        }

        if (iconType === 'publish') {
            return new PublishHandler();
        }

        if (iconType === 'httprequest') {
            return new HttpRequestHandler();
        }

        if (iconType === 'loop') {
            return new LoopHandler();
        }

        if (iconType === 'triggerflow') {
            return new TriggerFlowHandler();
        }

        if (iconType === 'mediaoutlet') {
            return new MediaOutletHandler();
        }

        if (iconType === 'conditional') {
            return new ConditionalHandler();
        }

        if (iconType === 'linkcheck') {
            return new LinkCheckHandler();
        }

        if (iconType === 'set') {
            return new SetHandler();
        }

        if (iconType === 'script') {
            return new ScriptHandler();
        }

        if (iconType === 'whatsapp') {
            return new WhatsAppHandler();
        }

        if (node.type === 'publish') return new PublishHandler();

        return null;
    }

    async execute(executionId: string, logger?: (msg: string) => Promise<void>) {
        // 1. Load Execution & Flow
        const { data: execution, error } = await supabase
            .from('flow_executions')
            .select('*, flows(*)')
            .eq('id', executionId)
            .single();

        if (error || !execution) throw new Error(`Execution not found: ${executionId}`);

        const flow = execution.flows;
        if (!flow || !flow.nodes) throw new Error(`Flow definition missing for execution ${executionId}`);

        // 2. Initialize Context
        const context: ExecutionContext = {
            executionId,
            flowId: flow.id,
            userId: execution.user_id,
            activationId: execution.activation_id,
            globalInput: typeof execution.context === 'string' ? JSON.parse(execution.context) : execution.context,
            nodeOutputs: {},
            edges: (flow.edges || []).map((e: any) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle || null })),
            logger: async (msg) => {
                console.log(`[FlowExecutor] ${msg}`);
                if (logger) await logger(msg);
            }
        };

        // 3. Check if this is a CHILD execution resuming from a parallel loop
        const resume = execution.resume_context;
        let entryNodes: any[];

        if (resume && resume.startAfterNodeId) {
            try {
                await context.logger(`[Resume] Child starting. Loop node: ${resume.loopNodeId}, index: ${resume.loopIndex}/${resume.loopTotal}, alias: ${resume.loopAlias}`);

                // RESUME MODE: Pre-populate context from parent snapshot
                context.nodeOutputs = resume.nodeOutputs || {};
                context.activationId = resume.activationId || context.activationId;

                // Set the loop item on the loop node output
                const loopNodeId = resume.loopNodeId;
                const alias = resume.loopAlias || 'currentItem';
                if (loopNodeId) {
                    // Ensure the loop node output exists (create minimal if missing)
                    if (!context.nodeOutputs[loopNodeId]) {
                        context.nodeOutputs[loopNodeId] = { success: true, data: {} };
                    }
                    context.nodeOutputs[loopNodeId] = {
                        ...context.nodeOutputs[loopNodeId],
                        data: {
                            ...context.nodeOutputs[loopNodeId].data,
                            [alias]: resume.loopItem,
                            currentItem: resume.loopItem,
                            _currentIndex: resume.loopIndex ?? 0,
                            _currentItem: resume.loopItem,
                            _loopItems: undefined,
                        },
                    };
                }

                // Find downstream nodes of the loop node (entry points for this child)
                const loopNode = flow.nodes.find((n: any) => n.id === resume.startAfterNodeId);
                const edges = flow.edges || [];
                const downstreamIds = edges.filter((e: any) => e.source === resume.startAfterNodeId).map((e: any) => e.target);
                entryNodes = flow.nodes.filter((n: any) => downstreamIds.includes(n.id));

                await context.logger(`[Resume] Child execution resuming from loop node "${loopNode?.data?.label || resume.startAfterNodeId}". Item: ${JSON.stringify(resume.loopItem).substring(0, 200)}. Entry nodes: ${entryNodes.map((n: any) => n.data?.label || n.id).join(', ')}`);

                if (entryNodes.length === 0) {
                    throw new Error(`No downstream nodes found for loop node ${resume.startAfterNodeId}`);
                }
            } catch (resumeError: any) {
                await context.logger(`[Resume] ❌ FATAL: Failed to restore child context: ${resumeError.message}`);
                throw resumeError;
            }
        } else {
            // NORMAL MODE: Start from trigger
            const startNode = flow.nodes.find((n: any) => n.type === 'trigger');
            if (!startNode) throw new Error("No trigger node found in flow.");
            entryNodes = [startNode];
        }

        // 4. Execute the graph with timeout
        const EXECUTION_TIMEOUT_MS = 5 * 60_000; // 5 minutes max per execution
        try {
            await Promise.race([
                this.executeSubgraph(
                    entryNodes,
                    flow.nodes,
                    flow.edges || [],
                    context,
                    executionId
                ),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Execution timeout: exceeded ${EXECUTION_TIMEOUT_MS / 1000}s`)), EXECUTION_TIMEOUT_MS)
                )
            ]);
        } catch (subgraphError: any) {
            await this.updateExecutionStatus(executionId, 'failed', undefined, subgraphError.message, context);
            return {
                success: false,
                error: subgraphError.message,
                outputs: context.nodeOutputs
            };
        }

        // 5. Build Final Result
        const result = {
            success: true,
            outputs: context.nodeOutputs
        };

        // Complete Execution
        await this.updateExecutionStatus(executionId, 'completed', undefined, undefined, context);

        return result;
    }

    /**
     * Recursively execute a subgraph starting from given entry nodes.
     * Handles nested loops and conditional branching.
     */
    private async executeSubgraph(
        entryNodes: any[],
        allNodes: any[],
        allEdges: any[],
        context: ExecutionContext,
        executionId: string,
        depth: number = 0
    ): Promise<void> {
        const maxDepth = 10;
        if (depth > maxDepth) {
            await context.logger(`[FlowExecutor] Max loop depth (${maxDepth}) reached. Stopping.`);
            return;
        }

        const queue: any[] = [...entryNodes];
        const visited = new Set<string>();
        const skippedNodes = new Set<string>(); // Nodes blocked by false conditions
        let safetyCounter = 0;
        const maxIterations = allNodes.length * 3;

        // Pre-seed visited with upstream parents of entry nodes.
        // This allows the ordering gate to pass when executeSubgraph is called
        // recursively (e.g. from a loop) — the loop node itself isn't in our
        // local visited set, but its entry-node children require it to be.
        for (const entry of entryNodes) {
            const inEdges = allEdges.filter((e: any) => e.target === entry.id);
            for (const edge of inEdges) {
                visited.add(edge.source);
            }
        }

        // Helper: recursively mark all downstream descendants as skipped
        const markDescendantsSkipped = (sourceNodeId: string) => {
            const outEdges = allEdges.filter((e: any) => e.source === sourceNodeId);
            for (const edge of outEdges) {
                if (!skippedNodes.has(edge.target)) {
                    skippedNodes.add(edge.target);
                    markDescendantsSkipped(edge.target);
                }
            }
        };

        while (queue.length > 0) {
            if (safetyCounter++ > maxIterations) {
                await context.logger(`[FlowExecutor] Safety limit reached (${maxIterations} iterations). Breaking.`);
                break;
            }

            const currentNode = queue.shift();
            if (!currentNode || visited.has(currentNode.id)) continue;

            // ── ORDERING GATE: ensure ALL upstream nodes are completed ──
            const incomingEdges = allEdges.filter((e: any) => e.target === currentNode.id);
            if (incomingEdges.length > 0 && currentNode.type !== 'trigger') {
                const allUpstreamDone = incomingEdges.every((e: any) => visited.has(e.source));
                if (!allUpstreamDone) {
                    queue.push(currentNode);
                    continue;
                }
            }

            visited.add(currentNode.id);

            // ── SKIP CHECK: if this node was blocked by an upstream condition ──
            if (skippedNodes.has(currentNode.id)) {
                await context.logger(`[Condition] Skipping node ${currentNode.data?.label || currentNode.id} (blocked by upstream condition)`);
                context.nodeOutputs[currentNode.id] = {
                    success: true,
                    data: { _skipped: true, _reason: 'Blocked by upstream condition (false)', _conditionResult: false }
                };
                await this.updateExecutionStatus(executionId, 'completed', currentNode.id, undefined, context, currentNode);

                // Still enqueue downstream (they are also in skippedNodes, so they'll be skipped too)
                const outgoingEdges = allEdges.filter((e: any) => e.source === currentNode.id);
                for (const edge of outgoingEdges) {
                    const nextNode = allNodes.find((n: any) => n.id === edge.target);
                    if (nextNode) queue.push(nextNode);
                }
                continue;
            }

            // ── DISABLED NODE CHECK: user disabled this node, skip but pass through ──
            if (currentNode.data?.nodeDisabled) {
                await context.logger(`[Disabled] Skipping node ${currentNode.data?.label || currentNode.id} (disabled by user)`);
                context.nodeOutputs[currentNode.id] = {
                    success: true,
                    data: { _skipped: true, _reason: 'Node disabled by user' }
                };
                await this.updateExecutionStatus(executionId, 'completed', currentNode.id, undefined, context, currentNode);

                // Enqueue downstream nodes — flow passes through
                const outEdges = allEdges.filter((e: any) => e.source === currentNode.id);
                for (const edge of outEdges) {
                    const nextNode = allNodes.find((n: any) => n.id === edge.target);
                    if (nextNode) queue.push(nextNode);
                }
                continue;
            }

            await this.updateExecutionStatus(executionId, 'running', currentNode.id, undefined, context, currentNode);

            // Execute Handler
            const handler = this.getHandler(currentNode);
            if (!handler) {
                await context.logger(`Skipping node ${currentNode.id} (No handler for type: ${currentNode.type}/${currentNode.data?.iconType})`);
                context.nodeOutputs[currentNode.id] = {
                    success: true,
                    data: { _skipped: true, _reason: `No handler for ${currentNode.data?.iconType || currentNode.type}` }
                };
                await this.updateExecutionStatus(executionId, 'completed', currentNode.id, undefined, context, currentNode);
            } else {
                try {
                    const NODE_TIMEOUT_MS = 180_000; // 3 minutes max per node
                    const output: NodeOutput = await Promise.race([
                        handler.execute(currentNode, context),
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error(`Node "${currentNode.data?.label || currentNode.id}" timed out after ${NODE_TIMEOUT_MS / 1000}s`)), NODE_TIMEOUT_MS)
                        )
                    ]);

                    if (!output.success) {
                        throw new Error(`Node ${currentNode.id} failed: ${output.error}`);
                    }

                    // Store Output
                    context.nodeOutputs[currentNode.id] = output;
                    await this.updateExecutionStatus(executionId, 'completed', currentNode.id, undefined, context, currentNode);

                    // ── CONDITIONAL CHECK ──
                    // If a node returns _conditionResult, route by sourceHandle
                    if (output.data?._conditionResult !== undefined && typeof output.data._conditionResult === 'boolean') {
                        const condResult = output.data._conditionResult;
                        const outEdges = allEdges.filter((e: any) => e.source === currentNode.id);
                        const hasHandles = outEdges.some((e: any) => e.sourceHandle === 'true' || e.sourceHandle === 'false');

                        if (hasHandles) {
                            // Smart routing: enqueue matching branch, skip the other
                            const matchHandle = String(condResult); // 'true' or 'false'
                            const skipHandle = condResult ? 'false' : 'true';

                            await context.logger(`[Condition] Node ${currentNode.data?.label || currentNode.id} → ${condResult}, routing via [${matchHandle}] branch`);

                            // Collect targets reachable from the active branch
                            const activeTargets = new Set<string>(
                                outEdges
                                    .filter((e: any) => e.sourceHandle === matchHandle || e.sourceHandle === null)
                                    .map((e: any) => e.target)
                            );

                            for (const edge of outEdges) {
                                const nextNode = allNodes.find((n: any) => n.id === edge.target);
                                if (!nextNode) continue;

                                if (edge.sourceHandle === matchHandle || edge.sourceHandle === null) {
                                    // Matching branch — enqueue normally
                                    queue.push(nextNode);
                                } else if (edge.sourceHandle === skipHandle) {
                                    // Opposite branch — only skip if NOT also reachable from the active branch
                                    if (!activeTargets.has(edge.target)) {
                                        skippedNodes.add(edge.target);
                                        markDescendantsSkipped(edge.target);
                                    }
                                }
                            }
                            continue; // We handled routing manually
                        } else if (condResult === false) {
                            // Legacy: no handles — skip ALL downstream when false
                            await context.logger(`[Condition] Node ${currentNode.data?.label || currentNode.id} → false, skipping ALL downstream (no handles)`);
                            markDescendantsSkipped(currentNode.id);
                            continue;
                        }
                    }
                } catch (err: any) {
                    await this.updateExecutionStatus(executionId, 'failed', currentNode.id, err.message, context, currentNode);
                    throw err;
                }
            }

            // Find downstream nodes
            const outgoingEdges = allEdges.filter((e: any) => e.source === currentNode.id);

            // ── LOOP HANDLING (supports nesting + parallel spawning) ──
            const nodeOutput = context.nodeOutputs[currentNode.id];
            const isLoopNode = currentNode.data?.iconType === 'loop' || currentNode.type === 'loop';

            if (isLoopNode) {
                if (!nodeOutput?.data?._loopItems || !Array.isArray(nodeOutput.data._loopItems) || nodeOutput.data._loopItems.length === 0) {
                    await context.logger(`[Loop depth=${depth}] Loop is empty (0 items). Skipping downstream nodes.`);
                    // Mark downstream nodes as visited so we don't process them
                    for (const edge of outgoingEdges) {
                        const nextNode = allNodes.find((n: any) => n.id === edge.target);
                        if (nextNode) visited.add(nextNode.id);
                    }
                    continue;
                }

                const loopItems = nodeOutput.data._loopItems;
                const alias = nodeOutput.data._loopAlias || 'currentItem';

                // Collect downstream nodes for this loop
                const downstreamEntryNodes = outgoingEdges
                    .map((e: any) => allNodes.find((n: any) => n.id === e.target))
                    .filter(Boolean);

                // ── PARALLEL: Spawn child executions ──
                if (currentNode.data?.loopParallel) {
                    await context.logger(`[Loop PARALLEL] Spawning ${loopItems.length} child executions for "${currentNode.data?.label || currentNode.id}"`);

                    // Take a TRIMMED snapshot of upstream nodeOutputs
                    // Remove _loopItems and large arrays to keep resume_context small
                    const trimmedOutputs: Record<string, any> = {};
                    for (const [nodeId, output] of Object.entries(context.nodeOutputs)) {
                        const data = (output as any)?.data || {};
                        const trimmedData: Record<string, any> = {};
                        for (const [key, val] of Object.entries(data)) {
                            // Skip _loopItems (not needed in children)
                            if (key === '_loopItems') continue;
                            // Truncate large arrays (keep first 5 items as reference)
                            if (Array.isArray(val) && (val as any[]).length > 10) {
                                trimmedData[key] = (val as any[]).slice(0, 5);
                                trimmedData[`_${key}_count`] = (val as any[]).length;
                            } else {
                                trimmedData[key] = val;
                            }
                        }
                        trimmedOutputs[nodeId] = { ...(output as any), data: trimmedData };
                    }

                    const snapshotSize = JSON.stringify(trimmedOutputs).length;
                    await context.logger(`[Loop PARALLEL] Snapshot size: ${(snapshotSize / 1024).toFixed(1)}KB`);

                    const childIds: string[] = [];
                    for (let i = 0; i < loopItems.length; i++) {
                        try {
                            const { data: childExec, error: childError } = await supabase
                                .from('flow_executions')
                                .insert({
                                    flow_id: context.flowId,
                                    status: 'pending',
                                    parent_execution_id: executionId,
                                    activation_id: context.activationId,
                                    user_id: context.userId,
                                    resume_context: {
                                        nodeOutputs: trimmedOutputs,
                                        loopItem: loopItems[i],
                                        loopAlias: alias,
                                        loopIndex: i,
                                        loopTotal: loopItems.length,
                                        loopNodeId: currentNode.id,
                                        startAfterNodeId: currentNode.id,
                                        activationId: context.activationId,
                                    },
                                    execution_log: [{
                                        nodeId: 'system',
                                        status: 'info',
                                        message: `Child ${i + 1}/${loopItems.length} created`,
                                        timestamp: new Date().toISOString()
                                    }],
                                })
                                .select('id')
                                .single();

                            if (childError) {
                                await context.logger(`[Loop PARALLEL] ERROR spawning child ${i}: ${childError.message}`);
                            } else {
                                childIds.push(childExec.id);
                                const itemLabel = typeof loopItems[i] === 'object'
                                    ? (loopItems[i].name || loopItems[i].title || JSON.stringify(loopItems[i]).substring(0, 60))
                                    : String(loopItems[i]);
                                await context.logger(`[Loop PARALLEL] Child ${i + 1}/${loopItems.length} queued: ${childExec.id} (${itemLabel})`);
                            }
                        } catch (spawnErr: any) {
                            await context.logger(`[Loop PARALLEL] EXCEPTION spawning child ${i}: ${spawnErr.message}`);
                        }
                    }

                    // Log the spawn result on the loop node
                    await this.updateExecutionStatus(executionId, 'completed', currentNode.id, undefined, context, currentNode);

                    // Mark downstream nodes as visited (children will handle them)
                    for (const edge of outgoingEdges) {
                        const nextNode = allNodes.find((n: any) => n.id === edge.target);
                        if (nextNode) visited.add(nextNode.id);
                    }

                    // Don't continue BFS past this loop — children take over
                    continue;
                }

                // ── SEQUENTIAL: Original loop behavior ──
                await context.logger(`[Loop depth=${depth}] Starting iteration over ${loopItems.length} items`);

                for (let i = 0; i < loopItems.length; i++) {
                    // Update loop node output with current item
                    context.nodeOutputs[currentNode.id] = {
                        ...nodeOutput,
                        data: {
                            ...nodeOutput.data,
                            [alias]: loopItems[i],
                            currentItem: loopItems[i],
                            _currentIndex: i,
                            _currentItem: loopItems[i],
                        },
                    };
                    await context.logger(`[Loop depth=${depth}] Iteration ${i + 1}/${loopItems.length}`);

                    // Set loop iteration context for log entries
                    this.loopIterationContext = { nodeId: currentNode.id, index: i, total: loopItems.length };

                    // Recursively execute the downstream subgraph for each iteration
                    await this.executeSubgraph(
                        downstreamEntryNodes,
                        allNodes,
                        allEdges,
                        context,
                        executionId,
                        depth + 1
                    );
                }

                // Clear loop context after all iterations
                this.loopIterationContext = null;

                // Mark downstream nodes as visited so outer BFS doesn't re-run them
                for (const edge of outgoingEdges) {
                    const nextNode = allNodes.find((n: any) => n.id === edge.target);
                    if (nextNode) visited.add(nextNode.id);
                }
            } else {
                // Normal BFS — enqueue downstream nodes
                for (const edge of outgoingEdges) {
                    const nextNode = allNodes.find((n: any) => n.id === edge.target);
                    if (nextNode) queue.push(nextNode);
                }
            }
        }
    }

    private executionLogEntries: any[] = [];
    private nodeStartTimes: Record<string, number> = {};
    private loopIterationContext: { nodeId: string; index: number; total: number } | null = null;

    private async updateExecutionStatus(executionId: string, status: string, nodeId?: string, error?: string, context?: ExecutionContext, node?: any) {
        const updatePayload: any = {
            status: nodeId ? 'running' : status, // Node-level updates keep overall status as 'running'
            updated_at: new Date().toISOString()
        };

        // Only set completed_at for OVERALL execution completion (no nodeId)
        if (!nodeId && (status === 'completed' || status === 'failed')) {
            updatePayload.completed_at = new Date().toISOString();
            updatePayload.status = status;
        }

        if (error && !nodeId) {
            updatePayload.error_message = error;
        }

        if (nodeId) {
            updatePayload.current_node_id = nodeId;

            // Track timing
            const now = Date.now();
            if (status === 'running') {
                this.nodeStartTimes[nodeId] = now;
            }

            // Build enriched log entry
            const logEntry: any = {
                nodeId,
                status,
                timestamp: new Date().toISOString(),
                nodeLabel: node?.data?.label || nodeId,
                nodeType: node?.data?.iconType || node?.type || 'unknown',
            };

            if (error) logEntry.error = error;

            // Add duration for non-running statuses
            if (status !== 'running' && this.nodeStartTimes[nodeId]) {
                logEntry.duration = now - this.nodeStartTimes[nodeId];
            }

            // Add output data from context — store the REAL processed data
            if (context?.nodeOutputs[nodeId]?.data && status !== 'running') {
                try {
                    const { _variables, ...outputData } = context.nodeOutputs[nodeId].data;
                    const serialized = JSON.stringify(outputData);
                    // Store up to 50KB per node output for useful debugging
                    if (serialized.length > 50000) {
                        // Smart truncation: keep structure but trim large string values
                        const truncated = this.truncateDeep(outputData, 3000);
                        logEntry.output = { ...truncated, _truncated: true, _originalSize: serialized.length };
                    } else {
                        logEntry.output = outputData;
                    }
                } catch (e) {
                    logEntry.output = { _error: 'Failed to serialize output' };
                }
            }

            // Always append — loop iterations create multiple entries per nodeId
            if (this.loopIterationContext) {
                logEntry.loopNodeId = this.loopIterationContext.nodeId;
                logEntry.loopIteration = this.loopIterationContext.index;
                logEntry.loopTotal = this.loopIterationContext.total;
            }
            this.executionLogEntries.push(logEntry);


        }

        // Always store execution_log as an array
        updatePayload.execution_log = [...this.executionLogEntries];


        await supabase.from('flow_executions').update(updatePayload).eq('id', executionId);
    }

    private truncateDeep(obj: any, maxLen: number): any {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') {
            return obj.length > maxLen ? obj.substring(0, maxLen) + `... [${obj.length} chars]` : obj;
        }
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            const truncatedArr = obj.slice(0, 20).map(item => this.truncateDeep(item, maxLen));
            if (obj.length > 20) truncatedArr.push(`... +${obj.length - 20} more items`);
            return truncatedArr;
        }
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = this.truncateDeep(value, maxLen);
        }
        return result;
    }
}
