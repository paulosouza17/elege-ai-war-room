import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';

/**
 * LoopHandler — iterates over a list variable from upstream nodes.
 * 
 * Config (node.data):
 *   - loopVariable: string — reference like "nodeId.items" pointing to an array
 *   - loopAlias / itemAlias: string — alias for current item (default: "currentItem")
 * 
 * Path resolution:
 *   - Walks down the dot-separated path until it finds an array
 *   - Uses that array as the loop items (remaining path segments are ignored)
 *   - e.g. "mediaoutlet-1.items.url" → walks to .items → finds array → loops over it
 * 
 * Output:
 *   - iterations: number of items
 *   - items: the original list
 *   - currentItem: first item (for single-pass context)
 *   - [alias]: first item 
 *   - _loopItems: full array (used by FlowExecutor for iteration)
 *   - _loopAlias: alias name
 */
export class LoopHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const config = node.data || {};
        const loopVariable = config.loopVariable || '';
        // Support both loopAlias (frontend) and itemAlias (legacy)
        const itemAlias = config.loopAlias || config.itemAlias || 'currentItem';

        await context.logger(`[Loop] Resolving variable: "${loopVariable}", alias: "${itemAlias}"`);

        let items: any[] = [];

        if (loopVariable) {
            const parts = loopVariable.split('.');
            const sourceNodeId = parts[0];
            const pathParts = parts.slice(1);

            const sourceOutput = context.nodeOutputs[sourceNodeId]?.data;
            if (sourceOutput) {
                // Walk down the path, stop at the FIRST array we find
                let value: any = sourceOutput;

                for (let i = 0; i < pathParts.length; i++) {
                    const key = pathParts[i];
                    const nextValue = value?.[key];

                    if (Array.isArray(nextValue)) {
                        // Found an array — this IS the loop source.
                        // Any remaining path parts are ignored (user accesses fields via templates)
                        items = nextValue;
                        const remaining = pathParts.slice(i + 1);
                        if (remaining.length > 0) {
                            await context.logger(`[Loop] Found array at "${parts.slice(0, i + 2).join(".")}" (${items.length} items). Ignoring remaining path ".${remaining.join(".")}" — access fields via {{nodeId.currentItem.${remaining.join(".")}}}`);
                        } else {
                            await context.logger(`[Loop] Found array at "${parts.slice(0, i + 2).join(".")}" (${items.length} items)`);
                        }
                        break;
                    } else if (nextValue !== undefined && nextValue !== null) {
                        value = nextValue;
                    } else {
                        await context.logger(`[Loop] ⚠ Path "${key}" resolved to ${nextValue} at step ${i}`);
                        break;
                    }
                }

                // If we finished the full path without hitting an array, check final value
                if (items.length === 0) {
                    if (Array.isArray(value)) {
                        items = value;
                    } else if (value !== undefined && value !== null && value !== sourceOutput) {
                        items = [value];
                    }
                }
            } else {
                await context.logger(`[Loop] ⚠ Source node "${sourceNodeId}" has no output data`);
            }
        }

        // Fallback: try globalInput
        if (items.length === 0 && context.globalInput?.items) {
            items = Array.isArray(context.globalInput.items) ? context.globalInput.items : [context.globalInput.items];
            await context.logger(`[Loop] Using globalInput fallback: ${items.length} items`);
        }

        await context.logger(`[Loop] ✅ Found ${items.length} items to iterate over`);

        // "Once" mode: limit to first item only (for testing)
        if (config.loopOnce && items.length > 1) {
            await context.logger(`[Loop] ⚡ Once mode enabled — processing only 1 of ${items.length} items`);
            items = [items[0]];
        }

        // Pre-filter: remove items already in processed_articles (for portal flows)
        // This ensures the maxIterations cap applies to NEW items only
        if (items.length > 0 && context.activationId && items[0]?.url) {
            const urls = items.map((i: any) => i.url).filter((u: string) => u && u.startsWith('http'));
            if (urls.length > 0) {
                const { data: existing } = await supabase
                    .from('processed_articles')
                    .select('url')
                    .in('url', urls)
                    .eq('activation_id', context.activationId);

                if (existing && existing.length > 0) {
                    const existingUrls = new Set(existing.map((r: any) => r.url));
                    const before = items.length;
                    items = items.filter((i: any) => !existingUrls.has(i.url));
                    const filtered = before - items.length;
                    if (filtered > 0) {
                        await context.logger(`[Loop] ⏭ Pre-filtered ${filtered} already-processed item(s), ${items.length} new remaining`);
                    }
                }
            }
        }

        // Max iterations cap (default: 5) to prevent timeout on large sets
        const maxIterations = config.maxIterations || 5;
        if (items.length > maxIterations) {
            // Sort by engagement if items have it (social media) — process top items first
            if (items[0]?.engagement !== undefined) {
                items.sort((a: any, b: any) => (b.engagement || 0) - (a.engagement || 0));
                await context.logger(`[Loop] 📊 Sorted by engagement (top: ${items[0].engagement}, bottom: ${items[items.length - 1].engagement})`);
            }
            await context.logger(`[Loop] ⚠ Capping ${items.length} items to ${maxIterations} (maxIterations). Configure node to change.`);
            items = items.slice(0, maxIterations);
        }

        if (items.length > 0) {
            const firstItem = items[0];
            const preview = typeof firstItem === 'object' ? `{${Object.keys(firstItem).join(', ')}}` : String(firstItem).substring(0, 100);
            await context.logger(`[Loop] First item preview: ${preview}`);
        }

        const firstItem = items.length > 0 ? items[0] : null;

        return {
            success: true,
            data: {
                iterations: items.length,
                items,
                currentItem: firstItem,   // Always available for {{nodeId.currentItem}}
                [itemAlias]: firstItem,
                _loopItems: items,
                _loopAlias: itemAlias,
                _variables: {
                    iterations: { label: 'Total de Iterações', type: 'text' },
                    items: { label: 'Lista Original', type: 'list' },
                    currentItem: { label: 'Item Atual', type: 'object' },
                    [itemAlias]: { label: `Item Atual (${itemAlias})`, type: 'object' },
                },
            },
        };
    }
}
