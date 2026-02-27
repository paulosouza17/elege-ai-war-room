import { ExecutionContext } from '../NodeHandler';

/**
 * Shared interpolation utility for all node handlers.
 * 
 * Resolves {{nodeId.key.subkey}} placeholders with actual values from upstream node outputs.
 * Missing values resolve to empty string (not raw template text).
 * 
 * Supports:
 *   {{nodeId}}                       → entire node output (JSON stringified, excluding _variables)
 *   {{nodeId.key}}                   → specific field from node output
 *   {{nodeId.key.subkey}}            → deep path access
 *   {{nodeId.key.0}}                 → array index access (first item)
 *   {{nodeId.key.first}}             → alias for [0]
 *   {{nodeId.key.last}}              → last item of array
 *   {{nodeId.key.length}}            → array/string length
 *   {{nodeId.key.random}}            → random item from array
 *   {{nodeId.key.join(, )}}          → join array with separator
 *   {{nodeId.key.reverse}}           → reverse array
 *   {{nodeId.key.0.subfield}}        → access field inside array item object
 */
export function interpolate(template: string, context: ExecutionContext): string {
    const result = template.replace(/\{\{([^}]+)\}\}/g, (_match: string, expr: string) => {
        const trimmed = expr.trim();

        // Handle join() separately since it contains parentheses with dots potentially inside
        const joinMatch = trimmed.match(/^(.+?)\.join\(([^)]*)\)$/);
        if (joinMatch) {
            const pathStr = joinMatch[1];
            const separator = joinMatch[2];
            const value = resolvePath(pathStr, context);
            if (Array.isArray(value)) return value.join(separator);
            if (value === null || value === undefined) return '';
            return String(value);
        }

        const parts = trimmed.split('.');
        const nodeId = parts[0];

        const output = context.nodeOutputs[nodeId];
        if (!output?.data) return '';

        if (parts.length === 1) {
            const { _variables, _dynamic, ...data } = output.data;
            return JSON.stringify(data);
        }

        // Walk the path with array/helper support
        let value: any = output.data;
        for (let i = 1; i < parts.length; i++) {
            if (value === null || value === undefined) return '';

            const segment = parts[i];

            // Array helpers
            if (Array.isArray(value)) {
                if (segment === 'first') { value = value[0]; continue; }
                if (segment === 'last') { value = value[value.length - 1]; continue; }
                if (segment === 'length') return String(value.length);
                if (segment === 'random') { value = value[Math.floor(Math.random() * value.length)]; continue; }
                if (segment === 'reverse') { value = [...value].reverse(); continue; }

                // Numeric index: .0, .1, .2, etc.
                if (/^\d+$/.test(segment)) {
                    const idx = parseInt(segment, 10);
                    value = value[idx];
                    continue;
                }
            }

            // String helpers
            if (typeof value === 'string') {
                if (segment === 'length') return String(value.length);
                if (segment === 'upper') return value.toUpperCase();
                if (segment === 'lower') return value.toLowerCase();
                if (segment === 'trim') return value.trim();
            }

            // Standard object property access (also works for numeric keys on arrays)
            if (typeof value === 'object' && value !== null) {
                value = value[segment];
            } else {
                return '';
            }
        }

        if (value === undefined || value === null) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    });

    return result;
}

/** Resolve a dot-path like "node-2.people_of_interest" to its value */
function resolvePath(pathStr: string, context: ExecutionContext): any {
    const parts = pathStr.split('.');
    const nodeId = parts[0];

    const output = context.nodeOutputs[nodeId];
    if (!output?.data) return null;

    let value: any = output.data;
    for (let i = 1; i < parts.length; i++) {
        if (value === null || value === undefined) return null;

        const segment = parts[i];

        if (Array.isArray(value) && /^\d+$/.test(segment)) {
            value = value[parseInt(segment, 10)];
        } else if (typeof value === 'object') {
            value = value[segment];
        } else {
            return null;
        }
    }

    return value;
}
