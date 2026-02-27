import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';

/**
 * LinkCheckHandler — checks if a URL has already been processed.
 *
 * Config (node.data):
 *   - urlVariable: string — nodeId.variable reference to resolve the URL
 *
 * Behavior:
 *   - Resolves URL from upstream node output
 *   - Checks `processed_articles` table for existing entry
 *   - If EXISTS → _conditionResult: false (skip downstream)
 *   - If NEW → inserts into table + _conditionResult: true (continue)
 *
 * Output:
 *   - is_new: boolean
 *   - url: string
 *   - already_processed: boolean
 */
export class LinkCheckHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const config = node.data || {};
        const urlRef = config.urlVariable || '';

        if (!urlRef) {
            return { success: false, error: 'urlVariable não configurada no nó LinkCheck.' };
        }

        // Resolve the URL from upstream output
        let resolvedUrl = '';

        if (urlRef.includes('.')) {
            const [nodeId, ...propParts] = urlRef.split('.');
            const propPath = propParts.join('.');
            const upstreamOutput = context.nodeOutputs[nodeId]?.data;
            if (upstreamOutput) {
                const resolved = this.getNestedValue(upstreamOutput, propPath);

                if (typeof resolved === 'string' && resolved.startsWith('http')) {
                    resolvedUrl = resolved;
                } else if (resolved && typeof resolved === 'object') {
                    // Auto-detect URL from object (e.g. currentItem = {url, title, ...})
                    resolvedUrl = resolved.url || resolved.link || resolved.href || '';
                    if (resolvedUrl) {
                        await context.logger(`[LinkCheck] Auto-detected URL from object property: ${resolvedUrl.substring(0, 80)}`);
                    }
                }
            }
        }

        if (!resolvedUrl || typeof resolvedUrl !== 'string' || !resolvedUrl.startsWith('http')) {
            await context.logger(`[LinkCheck] Could not resolve URL from "${urlRef}". Raw value type: ${typeof resolvedUrl}. Skipping.`);
            return {
                success: true,
                data: {
                    is_new: false,
                    url: '',
                    already_processed: true,
                    _conditionResult: false,
                    _variables: {
                        is_new: { label: 'É Novo?', type: 'text' },
                        url: { label: 'URL', type: 'text' },
                        already_processed: { label: 'Já Processado?', type: 'text' },
                    },
                },
            };
        }

        const activationId = context.activationId || null;
        await context.logger(`[LinkCheck] Checking URL: ${resolvedUrl} (activation: ${activationId || 'none'})`);

        // Check if URL exists in processed_articles FOR THIS ACTIVATION
        let query = supabase
            .from('processed_articles')
            .select('id')
            .eq('url', resolvedUrl);

        if (activationId) {
            query = query.eq('activation_id', activationId);
        } else {
            query = query.is('activation_id', null);
        }

        const { data: existing, error: selectError } = await query.maybeSingle();

        if (selectError) {
            await context.logger(`[LinkCheck] DB error: ${selectError.message}`);
            return { success: false, error: `Erro ao verificar link: ${selectError.message}` };
        }

        if (existing) {
            await context.logger(`[LinkCheck] ⚠️ URL already processed. Skipping.`);
            return {
                success: true,
                data: {
                    is_new: false,
                    url: resolvedUrl,
                    already_processed: true,
                    _conditionResult: false,
                    _variables: {
                        is_new: { label: 'É Novo?', type: 'text' },
                        url: { label: 'URL', type: 'text' },
                        already_processed: { label: 'Já Processado?', type: 'text' },
                    },
                },
            };
        }

        // Insert new URL
        const { error: insertError } = await supabase.from('processed_articles').insert({
            url: resolvedUrl,
            flow_id: context.flowId,
            activation_id: context.activationId || null,
        });

        if (insertError) {
            // Unique constraint violation = race condition, treat as already processed
            if (insertError.code === '23505') {
                await context.logger(`[LinkCheck] ⚠️ URL inserted by concurrent process. Skipping.`);
                return {
                    success: true,
                    data: {
                        is_new: false,
                        url: resolvedUrl,
                        already_processed: true,
                        _conditionResult: false,
                        _variables: {
                            is_new: { label: 'É Novo?', type: 'text' },
                            url: { label: 'URL', type: 'text' },
                            already_processed: { label: 'Já Processado?', type: 'text' },
                        },
                    },
                };
            }
            return { success: false, error: `Erro ao registrar link: ${insertError.message}` };
        }

        await context.logger(`[LinkCheck] ✅ New URL registered. Continuing flow.`);
        return {
            success: true,
            data: {
                is_new: true,
                url: resolvedUrl,
                already_processed: false,
                _conditionResult: true,
                _variables: {
                    is_new: { label: 'É Novo?', type: 'text' },
                    url: { label: 'URL', type: 'text' },
                    already_processed: { label: 'Já Processado?', type: 'text' },
                },
            },
        };
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, key) => {
            if (acc === undefined || acc === null) return undefined;
            const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                return acc[arrayMatch[1]]?.[Number(arrayMatch[2])];
            }
            return acc[key];
        }, obj);
    }
}
