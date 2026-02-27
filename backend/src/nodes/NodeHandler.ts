export interface ExecutionContext {
    executionId: string;
    flowId: string;
    userId?: string;
    activationId?: string;
    globalInput: any; // Initial input (e.g., from Trigger)
    nodeOutputs: Record<string, any>; // Store outputs of previous nodes
    edges?: { source: string; target: string }[]; // Flow edges for node connectivity
    logger: (message: string) => Promise<void>;
}

export interface NodeOutput {
    success: boolean;
    data?: any;
    error?: string;
    nextNodes?: string[]; // IDs of next nodes to execute
}

export interface NodeHandler {
    execute(node: any, context: ExecutionContext): Promise<NodeOutput>;
}
