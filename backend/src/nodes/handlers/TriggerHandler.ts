import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';
import axios from 'axios';
import { FileExtractor } from '../../services/FileExtractor';

export class TriggerHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const triggerType = node.data.triggerType || 'manual';
        const globalInput = context.globalInput || {};

        await context.logger(`[TriggerHandler] Executing trigger type: ${triggerType}`);

        // 1. MANUAL INPUT (File Uploads)
        if (triggerType === 'manual' || triggerType === 'manual_input') {
            if (!globalInput.file_url) {
                return { success: true, data: { message: "Manual trigger execution (no file)." } };
            }

            const fileUrl = globalInput.file_url;
            const fileType = globalInput.file_type;
            const originalName = globalInput.original_name;

            await context.logger(`[TriggerHandler] Processing file: ${originalName} (${fileType})`);

            // Download file
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const fileBuffer = Buffer.from(response.data);

            // Extract Text if possible
            let extractedText = "";
            const safeType = (fileType || '').toLowerCase();
            const isMultimodal = safeType.includes('pdf') || safeType.includes('image') || safeType === 'application/pdf';

            if (!isMultimodal) {
                try {
                    extractedText = await FileExtractor.extractText(fileBuffer, fileType, originalName);
                    await context.logger(`[TriggerHandler] Extracted text length: ${extractedText.length}`);
                } catch (e: any) {
                    await context.logger(`[TriggerHandler] Extraction failed: ${e.message}`);
                }
            }

            return {
                success: true,
                data: {
                    fileUrl,
                    fileType,
                    originalName,
                    fileBuffer: fileBuffer.toJSON(),
                    extractedText,
                    isMultimodal,
                    trigger: 'manual_input',
                    _variables: {
                        extractedText: { label: 'Texto Extraído', type: 'text' },
                        originalName: { label: 'Nome do Arquivo', type: 'text' },
                        fileUrl: { label: 'URL do Arquivo', type: 'text' },
                        fileType: { label: 'Tipo do Arquivo', type: 'text' },
                        isMultimodal: { label: 'É Multimodal', type: 'text' }
                    }
                }
            };
        }

        // 2. ACTIVATION TRIGGER
        if (triggerType === 'activation') {
            // Priority: 1) node config  2) execution context  3) flow_id search
            let activationId = node.data?.activationId || context.activationId;

            // If no activationId from config or context, try to find one linked to this flow
            if (!activationId && context.flowId) {
                await context.logger(`[TriggerHandler] No activationId in config or context, searching for linked activation...`);
                const { data: linkedActivation } = await supabase
                    .from('activations')
                    .select('id')
                    .eq('flow_id', context.flowId)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (linkedActivation) {
                    activationId = linkedActivation.id;
                    await context.logger(`[TriggerHandler] Found linked activation: ${activationId}`);
                }
            }

            if (activationId) {
                context.activationId = activationId; // Propagate to downstream nodes
                await context.logger(`[TriggerHandler] Using activation: ${activationId}`);
            }

            if (!activationId) {
                await context.logger(`[TriggerHandler] No activation found. Returning waiting status with empty defaults.`);
                return {
                    success: true,
                    data: {
                        status: 'waiting',
                        message: 'Aguardando evento de ativação. Vincule uma ativação a este fluxo ou execute via ativação.',
                        trigger: 'activation',
                        activation_name: '',
                        briefing: '',
                        keywords: [],
                        people_of_interest: [],
                        monitored_media: [],
                        sources: [],
                        category: '',
                        activation_id: null,
                        _variables: {
                            briefing: { label: 'Briefing', type: 'text' },
                            keywords: { label: 'Palavras-chave', type: 'list' },
                            people_of_interest: { label: 'Pessoas de Interesse', type: 'list' },
                            monitored_media: { label: 'Mídias Monitoradas', type: 'list' },
                            activation_name: { label: 'Nome da Ativação', type: 'text' },
                            category: { label: 'Categoria', type: 'text' }
                        }
                    }
                };
            }

            const { data: activation, error } = await supabase
                .from('activations')
                .select('*')
                .eq('id', activationId)
                .single();

            if (error || !activation) {
                return { success: false, error: `Activation not found: ${error?.message}` };
            }

            if (activation.status !== 'active') {
                await context.logger(`[TriggerHandler] Activation "${activation.name || activation.title}" has status "${activation.status}" — only active activations can trigger flows.`);
                return {
                    success: false,
                    error: `Ativação "${activation.name || activation.title}" está com status "${activation.status}". Apenas ativações ativas podem iniciar fluxos.`
                };
            }

            await context.logger(`[TriggerHandler] Loaded activation: ${activation.title || activation.name}`);

            // Fetch Elege.AI token from data_sources (admin-managed via Settings > Integrations)
            // Fetch Elege.AI token config from data_sources (admin-managed via Settings > Integrations)
            let elegeApiToken = '';
            let elegeBaseUrl = 'http://10.144.103.1:3001'; // Default fallback

            try {
                const { data: elegeSource } = await supabase
                    .from('data_sources')
                    .select('config')
                    .eq('name', 'Elege.AI')
                    .eq('is_active', true)
                    .single();

                if (elegeSource?.config) {
                    if (elegeSource.config.bearerToken || elegeSource.config.api_token || elegeSource.config.token) {
                        elegeApiToken = elegeSource.config.bearerToken || elegeSource.config.api_token || elegeSource.config.token;
                    }
                    if (elegeSource.config.baseUrl) {
                        elegeBaseUrl = elegeSource.config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
                    }
                }
            } catch (err: any) {
                context.logger(`[TriggerHandler] ⚠ Falha ao buscar credenciais Elege.AI nativas: ${err.message}. Tentando fallback.`);
                // Fallback: try legacy location in activation sources_config
                elegeApiToken = activation.sources_config?.elege_api_token || '';
            }

            return {
                success: true,
                data: {
                    trigger: 'activation',
                    elege_api_token: elegeApiToken,
                    elege_base_url: elegeBaseUrl,
                    activation_name: activation.name || activation.title || '',
                    briefing: activation.description || '',
                    keywords: activation.keywords || [],
                    people_of_interest: activation.people_of_interest || [],
                    monitored_media: activation.sources_config?.selected || [],
                    sources: activation.sources || [],
                    category: activation.category || '',
                    analysis_instructions: activation.analysis_instructions || '',
                    activation_id: activationId,
                    _variables: {
                        briefing: { label: 'Briefing', type: 'text' },
                        keywords: { label: 'Palavras-chave', type: 'list' },
                        people_of_interest: { label: 'Pessoas de Interesse', type: 'list' },
                        monitored_media: { label: 'Mídias Monitoradas', type: 'list' },
                        activation_name: { label: 'Nome da Ativação', type: 'text' },
                        category: { label: 'Categoria', type: 'text' },
                        analysis_instructions: { label: 'Instruções de Análise', type: 'text' },
                        elege_api_token: { label: 'Token Elege.AI', type: 'text' },
                        elege_base_url: { label: 'URL Base Elege.AI', type: 'text' }
                    }
                }
            };
        }

        // 3. SCHEDULE TRIGGER
        if (triggerType === 'schedule') {
            const timerDelay = Number(node.data?.timerDelay) || 0;

            if (timerDelay > 0) {
                await context.logger(`[TriggerHandler] Timer delay: waiting ${timerDelay} seconds before proceeding...`);
                await new Promise(resolve => setTimeout(resolve, timerDelay * 1000));
                await context.logger(`[TriggerHandler] Timer delay completed. Proceeding.`);
            }

            return {
                success: true,
                data: {
                    timestamp: new Date().toISOString(),
                    trigger: 'schedule',
                    timerDelay,
                }
            };
        }

        // 4. CRON TRIGGER — fetch Elege.AI credentials for autonomous scheduled flows
        if (triggerType.startsWith('cron')) {
            await context.logger(`[TriggerHandler] Cron trigger fired (${triggerType}). Fetching Elege.AI credentials...`);

            // Try to find an active activation linked to this flow
            let activationId = node.data?.activationId || context.activationId;
            if (!activationId) {
                // Try 1: By flow_id
                let { data: linkedActivation } = await supabase
                    .from('activations')
                    .select('id')
                    .eq('flow_id', context.flowId)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                // Try 2: Any active activation (fallback for global ingestion flows)
                if (!linkedActivation) {
                    const { data: anyActive } = await supabase
                        .from('activations')
                        .select('id')
                        .eq('status', 'active')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    linkedActivation = anyActive;
                }

                if (linkedActivation) {
                    activationId = linkedActivation.id;
                    await context.logger(`[TriggerHandler] Found linked activation for cron: ${activationId}`);
                }
            }

            if (activationId) {
                context.activationId = activationId; // Propagate to downstream nodes
            }

            let elegeApiToken = '';
            let elegeBaseUrl = 'http://10.144.103.1:3001';

            try {
                const { data: elegeSource } = await supabase
                    .from('data_sources')
                    .select('config')
                    .eq('name', 'Elege.AI')
                    .eq('is_active', true)
                    .single();

                if (elegeSource?.config) {
                    if (elegeSource.config.bearerToken || elegeSource.config.api_token || elegeSource.config.token) {
                        elegeApiToken = elegeSource.config.bearerToken || elegeSource.config.api_token || elegeSource.config.token;
                    }
                    if (elegeSource.config.baseUrl) {
                        elegeBaseUrl = elegeSource.config.baseUrl.replace(/\/$/, '');
                    }
                }
                await context.logger(`[TriggerHandler] Elege.AI credentials loaded: token=${elegeApiToken ? '***' + elegeApiToken.slice(-4) : 'EMPTY'}, baseUrl=${elegeBaseUrl}`);
            } catch (err: any) {
                await context.logger(`[TriggerHandler] ⚠ Falha ao buscar credenciais Elege.AI: ${err.message}`);
            }

            return {
                success: true,
                data: {
                    timestamp: new Date().toISOString(),
                    trigger: 'cron',
                    elege_api_token: elegeApiToken,
                    elege_base_url: elegeBaseUrl,
                    _variables: {
                        elege_api_token: { label: 'Token Elege.AI', type: 'text' },
                        elege_base_url: { label: 'URL Base Elege.AI', type: 'text' },
                    }
                }
            };
        }

        // 5. FALLBACK / UNKNOWN TRIGGER (Often happens when clicking "Test Flow" in UI)
        await context.logger(`[TriggerHandler] Trigger type '${triggerType}' did not match specific rules. Defaulting to Elege.AI token injection for test runs.`);

        let activationId = node.data?.activationId || context.activationId;
        if (!activationId) {
            // Try 1: By flow_id
            let { data: linkedActivation } = await supabase
                .from('activations')
                .select('id')
                .eq('flow_id', context.flowId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Try 2: Any active activation (fallback for global ingestion flows)
            if (!linkedActivation) {
                const { data: anyActive } = await supabase
                    .from('activations')
                    .select('id')
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                linkedActivation = anyActive;
            }

            if (linkedActivation) {
                activationId = linkedActivation.id;
                await context.logger(`[TriggerHandler] Found linked activation for fallback: ${activationId}`);
            }
        }

        if (activationId) {
            context.activationId = activationId;
        }

        let elegeApiToken = '';
        let elegeBaseUrl = 'http://10.144.103.1:3001';

        try {
            const { data: elegeSource } = await supabase
                .from('data_sources')
                .select('config')
                .eq('name', 'Elege.AI')
                .eq('is_active', true)
                .single();

            if (elegeSource?.config) {
                if (elegeSource.config.bearerToken || elegeSource.config.api_token || elegeSource.config.token) {
                    elegeApiToken = elegeSource.config.bearerToken || elegeSource.config.api_token || elegeSource.config.token;
                }
                if (elegeSource.config.baseUrl) {
                    elegeBaseUrl = elegeSource.config.baseUrl.replace(/\/$/, '');
                }
            }
        } catch (err: any) {
            await context.logger(`[TriggerHandler] ⚠ Falha ao buscar credenciais Elege.AI no fallback: ${err.message}`);
        }

        return {
            success: true,
            data: {
                message: `Execução manual/teste (Trigger: ${triggerType}).`,
                elege_api_token: elegeApiToken,
                elege_base_url: elegeBaseUrl,
                activation_id: activationId,
                _variables: {
                    elege_api_token: { label: 'Token Elege.AI', type: 'text' },
                    elege_base_url: { label: 'URL Base Elege.AI', type: 'text' },
                    activation_id: { label: 'Activation ID', type: 'text' }
                }
            }
        };
    }
}
