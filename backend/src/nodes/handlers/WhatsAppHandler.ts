import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';

interface WhatsAppConfig {
    action: 'list_groups' | 'fetch_mentions';
    channelId?: number;
    period?: string;
    limit?: number;
}

export class WhatsAppHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const config: WhatsAppConfig = {
            action: node.data?.action || 'list_groups',
            channelId: node.data?.channelId,
            period: node.data?.period || 'today',
            limit: node.data?.limit || 50,
        };

        await context.logger(`[WhatsAppHandler] Action: ${config.action}`);

        const { token, baseUrl } = await this.getCredentials();
        if (!token) {
            return { success: false, error: 'No Elege.AI credentials found (type=elegeai)' };
        }

        if (config.action === 'list_groups') {
            return this.listGroups(token, baseUrl, context);
        }

        if (config.action === 'fetch_mentions') {
            return this.fetchMentions(token, baseUrl, config, context);
        }

        return { success: false, error: `Unknown action: ${config.action}` };
    }

    private async getCredentials(): Promise<{ token: string; baseUrl: string }> {
        const { data: ds } = await supabase
            .from('data_sources')
            .select('credentials')
            .eq('type', 'elegeai')
            .limit(1)
            .single();

        return {
            token: ds?.credentials?.api_token || process.env.ELEGEAI_API_TOKEN || '',
            baseUrl: ds?.credentials?.base_url || 'http://10.144.103.1:3001',
        };
    }

    private async listGroups(token: string, baseUrl: string, context: ExecutionContext): Promise<NodeOutput> {
        const url = `${baseUrl}/api/whatsapp/groups`;
        await context.logger(`[WhatsAppHandler] GET ${url}`);

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
            return { success: false, error: `Elege API error: ${response.status}` };
        }

        const data = await response.json();
        const groups = data.groups || [];

        await context.logger(`[WhatsAppHandler] Found ${groups.length} WhatsApp groups`);

        return {
            success: true,
            data: {
                groups,
                items: groups,
                count: groups.length,
                source: 'whatsapp',
                source_type: 'whatsapp',
                _variables: {
                    groups: { label: 'Grupos WhatsApp', type: 'list' },
                    count: { label: 'Total de Grupos', type: 'text' },
                },
            },
        };
    }

    private async fetchMentions(token: string, baseUrl: string, config: WhatsAppConfig, context: ExecutionContext): Promise<NodeOutput> {
        const params = new URLSearchParams({
            period: config.period || 'today',
            limit: String(config.limit || 50),
        });
        if (config.channelId) {
            params.set('channel_id', String(config.channelId));
        }

        const url = `${baseUrl}/api/analytics/mentions/latest?${params}`;
        await context.logger(`[WhatsAppHandler] GET ${url}`);

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
            return { success: false, error: `Elege API error: ${response.status}` };
        }

        const data = await response.json();
        const mentions = data.mentions || [];

        await context.logger(`[WhatsAppHandler] Found ${mentions.length} WhatsApp mentions`);

        return {
            success: true,
            data: {
                mentions,
                items: mentions,
                count: mentions.length,
                source: 'whatsapp',
                source_type: 'whatsapp',
                _variables: {
                    mentions: { label: 'Menções WhatsApp', type: 'list' },
                    count: { label: 'Total de Menções', type: 'text' },
                },
            },
        };
    }
}
