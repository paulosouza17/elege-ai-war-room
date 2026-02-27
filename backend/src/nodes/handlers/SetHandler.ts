import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { interpolate } from '../utils/interpolate';

/**
 * SetHandler — Data preparation/transformation node (similar to N8N's Set node).
 * 
 * Takes variables from upstream nodes, maps/transforms them into a new structure,
 * and passes only the defined fields forward.
 * 
 * Configuration (node.data.setFields):
 *   Array of { key: string, value: string, type: 'string' | 'number' | 'boolean' | 'json' }
 *   Value supports {{nodeId.variable}} interpolation.
 * 
 * Output structure:
 *   { ...userFields, _dynamic: { ...userFields }, _variables: {...} }
 *   If keepUpstream is true, upstream fields are merged but _dynamic still only
 *   contains the user-defined fields for clean downstream access.
 */
export class SetHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger(`[SetHandler] Processing data transformation...`);

        const fields: Array<{ key: string; value: string; type?: string }> = node.data?.setFields || [];
        const keepUpstream = node.data?.keepUpstream === true;

        if (fields.length === 0) {
            await context.logger(`[SetHandler] ⚠ No fields configured — passing empty data.`);
            return {
                success: true,
                data: { _variables: {} }
            };
        }

        const outputData: Record<string, any> = {};
        const dynamicVars: Record<string, { label: string; type: string }> = {};

        // Optionally include all upstream data as a base
        if (keepUpstream) {
            for (const [_nodeId, nodeOutput] of Object.entries(context.nodeOutputs)) {
                if (nodeOutput?.data) {
                    const { _variables, _dynamic, ...data } = (nodeOutput as any).data;
                    for (const [k, v] of Object.entries(data)) {
                        outputData[k] = v;
                    }
                }
            }
        }

        // Track ONLY user-defined field keys (separate from upstream)
        const userDefinedFields: Record<string, any> = {};

        // Process each field mapping
        for (const field of fields) {
            if (!field.key?.trim()) continue;

            const key = field.key.trim();
            const rawValue = interpolate(field.value || '', context);
            let finalValue: any;

            // Auto-detect type: if the field type is 'text' (default) but the
            // interpolated value looks like JSON (array or object), parse it
            // to preserve the original data type
            const effectiveType = field.type || 'text';

            switch (effectiveType) {
                case 'number':
                    finalValue = Number(rawValue);
                    if (isNaN(finalValue)) finalValue = 0;
                    break;
                case 'boolean':
                    finalValue = rawValue === 'true' || rawValue === '1' || rawValue === 'yes';
                    break;
                case 'json':
                    try {
                        finalValue = JSON.parse(rawValue);
                    } catch (e) {
                        await context.logger(`[SetHandler] ⚠ Failed to parse JSON for key "${key}", using raw string.`);
                        finalValue = rawValue;
                    }
                    break;
                default: // 'text' or 'string'
                    // Smart detection: if interpolated value is valid JSON array/object,
                    // preserve the original type instead of stringifying
                    if (rawValue.startsWith('[') || rawValue.startsWith('{')) {
                        try {
                            finalValue = JSON.parse(rawValue);
                        } catch {
                            finalValue = rawValue;
                        }
                    } else {
                        finalValue = rawValue;
                    }
                    break;
            }

            outputData[key] = finalValue;
            userDefinedFields[key] = finalValue;

            const detectedType = Array.isArray(finalValue) ? 'list' :
                (typeof finalValue === 'object' && finalValue !== null) ? 'object' :
                    (typeof finalValue === 'number') ? 'number' : 'text';

            dynamicVars[key] = { label: key, type: detectedType };

            await context.logger(`[SetHandler] Set "${key}" = ${JSON.stringify(finalValue).substring(0, 200)}`);
        }

        // _dynamic contains ONLY user-defined fields (not upstream data)
        outputData._dynamic = userDefinedFields;

        outputData._variables = {
            ...dynamicVars,
            _dynamic: { label: 'Todos os campos', type: 'object' }
        };

        await context.logger(`[SetHandler] ✅ Output fields: ${Object.keys(userDefinedFields).join(', ')}`);

        return {
            success: true,
            data: outputData
        };
    }
}
