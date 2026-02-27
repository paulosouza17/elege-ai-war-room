import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';

/**
 * ScriptHandler — executes user-defined JavaScript in a sandboxed Function() context.
 *
 * Available in script scope:
 *   - inputs: Record<string, any> — all upstream nodeOutputs (keyed by nodeId)
 *   - context: { userId, flowId, activationId, activation }
 *     - activation contains the full trigger data: keywords, briefing, category, etc.
 *   - log(msg): void — logger
 *
 * Config (node.data):
 *   - scriptCode: string — the JavaScript code to execute
 *   - scriptTemplate: string — optional template name for pre-filled code
 *
 * Returns whatever the script assigns to `result`.
 */
export class ScriptHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        const config = node.data || {};
        const scriptCode = config.scriptCode || '';

        if (!scriptCode.trim()) {
            return { success: false, error: 'Nenhum código de script definido.' };
        }

        await context.logger(`[Script] Executing user script (${scriptCode.length} chars)...`);

        // Build inputs from all upstream outputs
        const inputs: Record<string, any> = {};
        for (const [nodeId, output] of Object.entries(context.nodeOutputs)) {
            inputs[nodeId] = (output as any)?.data || {};
        }

        // Find the trigger node output to provide activation data
        const triggerOutput = Object.entries(context.nodeOutputs).find(
            ([, output]) => (output as any)?.data?.trigger === 'activation'
        );
        const activationData = triggerOutput ? (triggerOutput[1] as any).data : null;

        // Build safe context with real activation data
        const safeContext = {
            userId: context.userId,
            flowId: context.flowId || null,
            activationId: context.activationId || null,
            activation: activationData || {},
        };

        if (activationData) {
            await context.logger(`[Script] Activation data available: keywords=${(activationData.keywords || []).length}, briefing=${!!activationData.briefing}`);
        }

        const logs: string[] = [];
        const logFn = (msg: string) => { logs.push(String(msg)); };

        try {
            // Sandboxed execution via Function constructor
            // The script must assign its output to `result`
            const wrappedCode = `
                "use strict";
                let result = null;
                ${scriptCode}
                return result;
            `;

            const fn = new Function('inputs', 'context', 'log', wrappedCode);

            // Execute with timeout
            const timeoutMs = 10000;
            const execPromise = new Promise<any>((resolve, reject) => {
                try {
                    const res = fn(inputs, safeContext, logFn);
                    resolve(res);
                } catch (e: any) {
                    reject(e);
                }
            });

            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Script timeout (${timeoutMs}ms)`)), timeoutMs);
            });

            const result = await Promise.race([execPromise, timeoutPromise]);

            // Log script output
            for (const l of logs) {
                await context.logger(`[Script] > ${l}`);
            }

            await context.logger(`[Script] ✅ Completed. Result type: ${typeof result}`);

            // Normalize output
            const outputData = typeof result === 'object' && result !== null
                ? result
                : { value: result };

            return {
                success: true,
                data: {
                    ...outputData,
                    result: outputData,
                    logs,
                    _variables: {
                        result: { label: 'Resultado', type: 'text' },
                        ...(outputData._conditionResult !== undefined
                            ? { _conditionResult: { label: 'Condição', type: 'text' } }
                            : {}),
                        logs: { label: 'Logs', type: 'list' },
                    },
                },
            };
        } catch (err: any) {
            for (const l of logs) {
                await context.logger(`[Script] > ${l}`);
            }
            await context.logger(`[Script] ❌ Error: ${err.message}`);
            return { success: false, error: `Script error: ${err.message}` };
        }
    }
}

/**
 * Pre-built script templates available in the frontend.
 * 
 * Available variables in scripts:
 *   - inputs[nodeId]                → upstream node output data
 *   - context.activation.keywords   → activation keywords array
 *   - context.activation.briefing   → activation briefing text
 *   - context.activation.category   → activation category
 *   - context.activation.people_of_interest → monitored people
 *   - log(msg)                      → logger function
 *   - result                        → assign the output here
 */
// Smart scoring script code extracted to avoid regex-in-template-literal TS parse errors
const SMART_SCORING_CODE = [
    '// Smart Scoring v3: pessoa OU 2+ keywords. Keyword isolada = REJEITAR.',
    'var keywords = context.activation.keywords || [];',
    'var people = context.activation.people_of_interest || [];',
    '',
    'var title = "", content = "", url = "";',
    'for (var entries = Object.entries(inputs), i = 0; i < entries.length; i++) {',
    '    var data = entries[i][1];',
    '    if (data.response_title || data.title) title = data.response_title || data.title || "";',
    '    if (data.response_content || data.content) content = data.response_content || data.content || "";',
    '    if (data.response_url || data.url) url = data.response_url || data.url || "";',
    '}',
    '',
    'var fullText = (title + " " + content).toLowerCase();',
    '',
    'function wordMatch(text, term) {',
    '    var re = new RegExp("\\\\b" + term.toLowerCase() + "\\\\b", "i");',
    '    return re.test(text);',
    '}',
    '',
    'var kwMatches = keywords.filter(function(kw) { return wordMatch(fullText, kw); });',
    'var peopleMatches = people.filter(function(p) { return wordMatch(fullText, p); });',
    '',
    '// Person match = ALWAYS include (highest confidence)',
    '// 2+ keywords = ALWAYS include (cross-reference confirms relevance)',
    '// 1 keyword alone = NEVER include (too generic, causes false positives)',
    'var found = false;',
    'var reason = "";',
    '',
    'if (peopleMatches.length > 0) {',
    '    found = true;',
    '    reason = "person_match";',
    '} else if (kwMatches.length >= 2) {',
    '    found = true;',
    '    reason = "multi_keyword (" + kwMatches.join(", ") + ")";',
    '} else if (kwMatches.length === 1) {',
    '    found = false;',
    '    reason = "single_keyword_rejected (" + kwMatches[0] + ")";',
    '} else {',
    '    found = false;',
    '    reason = "no_match";',
    '}',
    '',
    'log("Title: " + title.substring(0, 80));',
    'log("Keywords: " + (kwMatches.join(", ") || "nenhuma"));',
    'log("Pessoas: " + (peopleMatches.join(", ") || "nenhuma"));',
    'log("Scoring: " + reason + " > " + (found ? "INCLUIR" : "REJEITAR"));',
    '',
    'result = {',
    '    found: found,',
    '    reason: reason,',
    '    keyword_matches: kwMatches,',
    '    people_matches: peopleMatches,',
    '    title: title,',
    '    url: url,',
    '    _conditionResult: found',
    '};',
].join('\n');

export const SCRIPT_TEMPLATES: Record<string, { label: string; description: string; code: string }> = {
    keyword_match: {
        label: 'Buscar Palavra-chave nos Conteúdos',
        description: 'Verifica se os dados upstream contêm as keywords da ativação',
        code: `// Busca palavras-chave da ativação nos conteúdos dos nós anteriores
// context.activation contém: keywords, briefing, category, people_of_interest
const keywords = context.activation.keywords || [];

// Reúne todo o texto dos nós upstream (title, content, etc.)
const allText = JSON.stringify(inputs).toLowerCase();

const matches = keywords.filter(kw => allText.includes(kw.toLowerCase()));

log('Keywords buscadas: ' + keywords.join(', '));
log('Matches encontrados: ' + matches.join(', '));

result = {
    found: matches.length > 0,
    matches,
    total_keywords: keywords.length,
    matched_count: matches.length,
    _conditionResult: matches.length > 0
};`,
    },
    extract_field: {
        label: 'Extrair Campo Específico',
        description: 'Extrai um campo de um nó upstream e repassa',
        code: `// Extrair campo de um nó upstream
// inputs contém os dados dos nós anteriores, keyed por nodeId
// Altere o nodeId e campo conforme necessário

// Listar todos os nós disponíveis
const nodeIds = Object.keys(inputs);
log('Nós disponíveis: ' + nodeIds.join(', '));

// Extrair de um nó específico
const sourceNode = nodeIds[nodeIds.length - 1]; // último nó
const sourceData = inputs[sourceNode] || {};
log('Dados do nó ' + sourceNode + ': ' + Object.keys(sourceData).join(', '));

// Extrair campo (altere 'items' para o campo desejado)
const value = sourceData.items || sourceData.content || sourceData;

result = { extracted: value, sourceNode };`,
    },
    filter_items: {
        label: 'Filtrar Itens por Critério',
        description: 'Filtra uma lista de itens baseado em um critério',
        code: `// Filtrar itens de um nó upstream
// Encontra automaticamente o primeiro nó com array 'items'
let items = [];
let sourceNode = '';

for (const [nodeId, data] of Object.entries(inputs)) {
    if (data && Array.isArray(data.items) && data.items.length > 0) {
        items = data.items;
        sourceNode = nodeId;
        break;
    }
}

log('Source: ' + sourceNode + ' (' + items.length + ' items)');

// Filtrar por critério (altere conforme necessário)
// Exemplo: filtrar items que contêm uma palavra no título
const searchTerm = 'política';
const filtered = items.filter(item => {
    const text = (item.title || '') + ' ' + (item.content || '');
    return text.toLowerCase().includes(searchTerm.toLowerCase());
});

log('Filtrados: ' + filtered.length + ' de ' + items.length);

result = {
    items: filtered,
    count: filtered.length,
    original_count: items.length
};`,
    },
    transform_json: {
        label: 'Transformar JSON',
        description: 'Transforma e combina dados de múltiplos nós',
        code: `// Transformar dados de nós upstream
// inputs contém todos os dados dos nós anteriores
const summary = {};

for (const [nodeId, data] of Object.entries(inputs)) {
    if (!data || data._skipped) continue;
    summary[nodeId] = {
        keys: Object.keys(data).filter(k => !k.startsWith('_')),
        itemCount: Array.isArray(data.items) ? data.items.length : 0,
        hasContent: !!(data.content || data.raw),
    };
}

log('Nós processados: ' + Object.keys(summary).length);
log('Resumo: ' + JSON.stringify(summary));

result = { merged: summary, nodeCount: Object.keys(summary).length };`,
    },
    keyword_in_content: {
        label: 'Smart Scoring: Keywords + Pessoas',
        description: 'Scoring inteligente: pessoa = passe direto, 2+ keywords = inclui, 1 keyword genérica = rejeita',
        code: SMART_SCORING_CODE,
    },
};
