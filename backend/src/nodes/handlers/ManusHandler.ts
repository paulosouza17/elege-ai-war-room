import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';
import axios from 'axios';

const MANUS_API_BASE = 'https://api.manus.im/v1';

interface ManusConfig {
    apiKey: string;
    defaultAgentType?: string;
    webhookUrl?: string;
}

export class ManusHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger('[ManusHandler] Starting Manus AI agent task...');

        const config = await this.loadCredentials(context);
        if (!config) {
            return { success: false, error: 'Credenciais do Manus AI não configuradas. Vá em Configurações → Integrações → Manus AI.' };
        }

        const taskDescription = this.resolveTaskDescription(node, context);
        if (!taskDescription) {
            return { success: false, error: 'Descrição da tarefa não informada.' };
        }

        const agentType = node.data.manusAgentType || config.defaultAgentType || 'research';
        const timeoutMinutes = Number(node.data.manusTimeout) || 10;

        await context.logger(`[ManusHandler] Agent: ${agentType}, Timeout: ${timeoutMinutes}min, Task: "${taskDescription.substring(0, 100)}..."`);

        try {
            // Step 1: Create task
            const taskId = await this.createTask(config, taskDescription, agentType, context);
            await context.logger(`[ManusHandler] Task created: ${taskId}`);

            // Step 2: Poll for completion
            const result = await this.pollTaskCompletion(config, taskId, timeoutMinutes, context);

            return result;
        } catch (error: any) {
            await context.logger(`[ManusHandler] ❌ Error: ${error.message}`);
            return { success: false, error: `Manus AI Error: ${error.message}` };
        }
    }

    // ────────────── Task Lifecycle ──────────────

    private async createTask(config: ManusConfig, description: string, agentType: string, context: ExecutionContext): Promise<string> {
        const response = await axios.post(
            `${MANUS_API_BASE}/tasks`,
            {
                description,
                agent_type: agentType,
                webhook_url: config.webhookUrl || undefined,
            },
            {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
                validateStatus: () => true,
            }
        );

        if (response.status === 401) throw new Error('API Key inválida. Verifique em manus.im → Settings.');
        if (response.status === 429) throw new Error('Rate limit excedido.');
        if (response.status >= 400) throw new Error(`Erro ao criar tarefa: ${response.status} - ${JSON.stringify(response.data)}`);

        return response.data.task_id || response.data.id;
    }

    private async pollTaskCompletion(config: ManusConfig, taskId: string, timeoutMinutes: number, context: ExecutionContext): Promise<NodeOutput> {
        const maxAttempts = timeoutMinutes * 6; // poll every 10s
        const pollInterval = 10000; // 10 seconds

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await axios.get(
                `${MANUS_API_BASE}/tasks/${taskId}`,
                {
                    headers: { 'Authorization': `Bearer ${config.apiKey}` },
                    timeout: 15000,
                    validateStatus: () => true,
                }
            );

            if (response.status >= 400) {
                throw new Error(`Erro ao verificar tarefa: ${response.status}`);
            }

            const task = response.data;
            const status = task.status || task.state;

            if (status === 'completed' || status === 'done' || status === 'finished') {
                await context.logger(`[ManusHandler] ✅ Task completed after ${attempt * 10}s`);
                return this.buildSuccessOutput(task, taskId, context);
            }

            if (status === 'failed' || status === 'error') {
                throw new Error(`Tarefa falhou: ${task.error || task.message || 'unknown error'}`);
            }

            if (status === 'cancelled') {
                return { success: false, error: 'Tarefa cancelada pelo Manus.' };
            }

            // Log progress
            if (attempt % 6 === 0) { // every minute
                await context.logger(`[ManusHandler] ⏳ Polling... Status: ${status} (${Math.round(attempt * 10 / 60)}min elapsed)`);
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        // Timeout
        await context.logger(`[ManusHandler] ⏰ Timeout after ${timeoutMinutes} minutes. Checking partial results...`);

        // Try to get partial results
        const finalCheck = await axios.get(
            `${MANUS_API_BASE}/tasks/${taskId}`,
            {
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
                timeout: 15000,
                validateStatus: () => true,
            }
        );

        if (finalCheck.data?.result || finalCheck.data?.output) {
            return this.buildSuccessOutput(finalCheck.data, taskId, context);
        }

        return {
            success: false,
            error: `Timeout: tarefa não concluída em ${timeoutMinutes} minutos. Task ID: ${taskId}`,
            data: { task_id: taskId, status: 'timeout' }
        };
    }

    // ────────────── Credentials ──────────────

    private async loadCredentials(context: ExecutionContext): Promise<ManusConfig | null> {
        const { data, error } = await supabase
            .from('data_sources')
            .select('config, is_active')
            .ilike('name', '%Manus%')
            .single();

        if (error || !data || !data.is_active) {
            await context.logger('[ManusHandler] ⚠ Data source "Manus AI" not found or inactive.');
            return null;
        }

        const cfg = data.config;
        if (!cfg?.apiKey) {
            await context.logger('[ManusHandler] ⚠ API Key not configured.');
            return null;
        }

        return cfg as ManusConfig;
    }

    // ────────────── Query Resolution ──────────────

    private resolveTaskDescription(node: any, context: ExecutionContext): string {
        if (node.data.manusTaskDescription) {
            let desc = node.data.manusTaskDescription;
            // Interpolate upstream variables
            for (const [nodeId, output] of Object.entries(context.nodeOutputs)) {
                if (output?.data) {
                    for (const [key, value] of Object.entries(output.data as Record<string, any>)) {
                        const placeholder = `{${nodeId}.${key}}`;
                        if (desc.includes(placeholder)) {
                            const replacement = Array.isArray(value) ? value.join(', ') : String(value);
                            desc = desc.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
                        }
                    }
                }
            }
            return desc;
        }

        // Auto-generate from upstream
        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (output?.data?.people_of_interest) {
                const people = Array.isArray(output.data.people_of_interest)
                    ? output.data.people_of_interest[0]
                    : output.data.people_of_interest;
                return `Gere um dossiê completo sobre ${people}. Inclua: cargos políticos, processos judiciais, patrimônio declarado no TSE, doadores de campanha, empresas vinculadas, votações polêmicas, e últimas notícias relevantes.`;
            }
        }

        return '';
    }

    // ────────────── Output Builder ──────────────

    private async buildSuccessOutput(task: any, taskId: string, context: ExecutionContext): Promise<NodeOutput> {
        const result = task.result || task.output || task.response || '';
        const sources = task.sources || task.references || task.urls || [];
        const files = task.files || task.attachments || task.artifacts || [];

        const resultText = typeof result === 'string' ? result : JSON.stringify(result);
        const summaryPreview = resultText.substring(0, 200);

        await context.logger(`[ManusHandler] ✅ Result: ${summaryPreview}... | ${sources.length} sources | ${files.length} files`);

        return {
            success: true,
            data: {
                result: resultText,
                sources: Array.isArray(sources) ? sources.map((s: any, i: number) => ({
                    index: i + 1,
                    url: typeof s === 'string' ? s : s.url || '',
                    title: typeof s === 'string' ? '' : s.title || '',
                })) : [],
                files: Array.isArray(files) ? files.map((f: any) => ({
                    name: typeof f === 'string' ? f : f.name || f.filename || '',
                    url: typeof f === 'string' ? '' : f.url || f.download_url || '',
                    type: typeof f === 'string' ? '' : f.type || f.mime_type || '',
                })) : [],
                task_id: taskId,
                status: 'completed',
                summary: `Manus AI: ${summaryPreview}...`,
                operation: 'manus_agent',
                source: 'manus',
                source_type: 'ai_agent',
                _variables: {
                    result: { label: 'Resultado', type: 'text' },
                    sources: { label: 'Fontes Pesquisadas', type: 'list' },
                    files: { label: 'Arquivos Gerados', type: 'list' },
                    summary: { label: 'Resumo', type: 'text' },
                    status: { label: 'Status', type: 'text' },
                    task_id: { label: 'Task ID', type: 'text' },
                }
            }
        };
    }
}
