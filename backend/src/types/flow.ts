export interface FlowExecution {
    id: string;
    flow_id: string;
    user_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    context: any;
    started_at?: string;
    completed_at?: string;
    execution_log?: any;
}
