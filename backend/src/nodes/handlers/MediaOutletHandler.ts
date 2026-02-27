import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';

/**
 * MediaOutletHandler — queries media_outlets table with flexible filtering.
 * 
 * Config (node.data):
 *   - outletFilterMode: 'all' | 'single' | 'multi' | 'selected' (default: 'all')
 *   - outletTypes: string[] — selected types when mode is 'single' or 'multi'
 *   - selectedOutletIds: string[] — specific outlet UUIDs when mode is 'selected'
 * 
 * Output:
 *   - items: MediaOutlet[] — the fetched outlets
 *   - count: number
 *   - types: string[] — unique types in result
 */
export class MediaOutletHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const config = node.data || {};
        const filterMode = config.outletFilterMode || 'all';
        const selectedTypes: string[] = config.outletTypes || [];
        const selectedIds: string[] = config.selectedOutletIds || [];

        await context.logger(`[MediaOutlet] Querying media_outlets — mode: ${filterMode}, types: ${selectedTypes.join(', ') || 'all'}, ids: ${selectedIds.length || 'none'}`);

        let query = supabase
            .from('media_outlets')
            .select('id, name, type, url, logo_url, description, city, created_at')
            .order('name');

        if (filterMode === 'selected' && selectedIds.length > 0) {
            query = query.in('id', selectedIds);
        } else if (filterMode === 'single' && selectedTypes.length === 1) {
            query = query.eq('type', selectedTypes[0]);
        } else if (filterMode === 'multi' && selectedTypes.length > 0) {
            query = query.in('type', selectedTypes);
        }
        // 'all' → no filter

        const { data, error } = await query;

        if (error) {
            return { success: false, error: `Erro ao consultar veículos: ${error.message}` };
        }

        const items = data || [];
        const uniqueTypes = [...new Set(items.map((i: any) => i.type))];

        await context.logger(`[MediaOutlet] Found ${items.length} outlets (types: ${uniqueTypes.join(', ')})`);

        return {
            success: true,
            data: {
                items,
                count: items.length,
                types: uniqueTypes,
                names: items.map((i: any) => i.name),
                urls: items.map((i: any) => i.url).filter(Boolean),
                cities: [...new Set(items.map((i: any) => i.city).filter(Boolean))],
                _variables: {
                    items: { label: 'Veículos', type: 'list' },
                    count: { label: 'Quantidade', type: 'text' },
                    types: { label: 'Tipos Encontrados', type: 'list' },
                    names: { label: 'Nomes', type: 'list' },
                    urls: { label: 'URLs', type: 'list' },
                    cities: { label: 'Cidades', type: 'list' },
                },
            },
        };
    }
}

