import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';

/**
 * TriggerFlowHandler — triggers execution of another existing flow.
 * 
 * Config (node.data):
 *   - targetFlowId: string — UUID of the flow to trigger
 *   - passContext: boolean — whether to forward current context as input
 *   - waitForCompletion: boolean — whether to wait for the triggered flow
 * 
 * Output:
 *   - triggered: boolean
 *   - executionId: string — ID of the new execution
 *   - targetFlowId: string
 *   - targetFlowName: string
 */
export class TriggerFlowHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const config = node.data || {};
        const targetFlowId = config.targetFlowId;

        if (!targetFlowId) {
            return { success: false, error: 'Nenhum flow selecionado para acionar.' };
        }

        await context.logger(`[TriggerFlow] Triggering flow: ${targetFlowId}`);

        // Verify target flow exists
        const { data: targetFlow, error: flowError } = await supabase
            .from('flows')
            .select('id, name')
            .eq('id', targetFlowId)
            .single();

        if (flowError || !targetFlow) {
            return { success: false, error: `Flow não encontrado: ${targetFlowId}` };
        }

        // Build context to pass
        const inputContext: any = {
            triggeredBy: {
                flowId: context.flowId,
                executionId: context.executionId,
                nodeId: node.id,
            },
        };

        if (config.passContext) {
            // Forward all upstream outputs as context
            inputContext.upstreamOutputs = {};
            for (const [nodeId, output] of Object.entries(context.nodeOutputs)) {
                if (output?.data) {
                    const { _variables, _loopItems, _loopAlias, ...cleanData } = output.data;
                    inputContext.upstreamOutputs[nodeId] = cleanData;
                }
            }
        }

        // Create a new execution for the target flow
        const { data: newExecution, error: execError } = await supabase
            .from('flow_executions')
            .insert({
                flow_id: targetFlowId,
                user_id: context.userId,
                activation_id: context.activationId || null,
                status: 'pending',
                context: inputContext,
                started_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (execError || !newExecution) {
            return { success: false, error: `Erro ao criar execução: ${execError?.message}` };
        }

        await context.logger(`[TriggerFlow] Created execution ${newExecution.id} for flow "${targetFlow.name}"`);

        return {
            success: true,
            data: {
                triggered: true,
                executionId: newExecution.id,
                targetFlowId: targetFlow.id,
                targetFlowName: targetFlow.name,
                _variables: {
                    triggered: { label: 'Acionado', type: 'text' },
                    executionId: { label: 'ID da Execução', type: 'text' },
                    targetFlowName: { label: 'Nome do Flow', type: 'text' },
                },
            },
        };
    }
}
