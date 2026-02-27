import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';

/**
 * ConditionalHandler — evaluates a condition against upstream node outputs.
 * 
 * Config (node.data):
 *   - conditionSource: string — nodeId.variable reference
 *   - conditionOperator: 'exists' | 'not_empty' | 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
 *   - conditionValue: string — comparison value (for equals, contains, etc.)
 * 
 * Output:
 *   - result: boolean
 *   - _conditionResult: boolean (used by FlowExecutor to skip downstream if false)
 */
export class ConditionalHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const config = node.data || {};
        const source = config.conditionSource || '';
        const operator = config.conditionOperator || 'exists';
        const compareValue = config.conditionValue || '';

        await context.logger(`[Condition] Evaluating: ${source} ${operator} ${compareValue}`);

        // Resolve the source variable
        let resolvedValue: any = undefined;

        if (source.includes('.')) {
            const [nodeId, ...propParts] = source.split('.');
            const propPath = propParts.join('.');
            const upstreamOutput = context.nodeOutputs[nodeId]?.data;
            if (upstreamOutput) {
                resolvedValue = this.getNestedValue(upstreamOutput, propPath);
            }
        }

        // Evaluate condition
        let result = false;

        switch (operator) {
            case 'exists':
                result = resolvedValue !== undefined && resolvedValue !== null;
                break;
            case 'not_empty':
                if (Array.isArray(resolvedValue)) {
                    result = resolvedValue.length > 0;
                } else if (typeof resolvedValue === 'string') {
                    result = resolvedValue.trim().length > 0;
                } else {
                    result = resolvedValue !== undefined && resolvedValue !== null;
                }
                break;
            case 'equals':
                result = String(resolvedValue) === String(compareValue);
                break;
            case 'not_equals':
                result = String(resolvedValue) !== String(compareValue);
                break;
            case 'contains':
                if (Array.isArray(resolvedValue)) {
                    result = resolvedValue.some((item: any) =>
                        String(item).toLowerCase().includes(compareValue.toLowerCase())
                    );
                } else {
                    result = String(resolvedValue || '').toLowerCase().includes(compareValue.toLowerCase());
                }
                break;
            case 'greater_than':
                result = Number(resolvedValue) > Number(compareValue);
                break;
            case 'less_than':
                result = Number(resolvedValue) < Number(compareValue);
                break;
            default:
                result = !!resolvedValue;
        }

        await context.logger(`[Condition] Result: ${result} (value=${JSON.stringify(resolvedValue)?.substring(0, 100)})`);

        return {
            success: true,
            data: {
                result,
                resolvedValue: resolvedValue !== undefined ? resolvedValue : null,
                operator,
                source,
                _conditionResult: result,
                _variables: {
                    result: { label: 'Resultado', type: 'text' },
                    resolvedValue: { label: 'Valor Resolvido', type: 'text' },
                },
            },
        };
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, key) => {
            if (acc === undefined || acc === null) return undefined;
            // Handle array access like items[0]
            const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                return acc[arrayMatch[1]]?.[Number(arrayMatch[2])];
            }
            return acc[key];
        }, obj);
    }
}
