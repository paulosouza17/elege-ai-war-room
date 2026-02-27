import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { interpolate } from '../utils/interpolate';

export class HttpRequestHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger(`[HttpRequestHandler] Executing HTTP request...`);

        let url = interpolate(node.data.url || node.data.httpUrl || '', context);

        // Encode query parameter values (interpolation inserts raw text like "Flavio Bolsonaro")
        // This fixes spaces/accents that cause 500 errors on target APIs like Rails
        const qIdx = url.indexOf('?');
        if (qIdx !== -1) {
            const base = url.substring(0, qIdx);
            const queryString = url.substring(qIdx + 1);
            const encodedParts = queryString.split('&').map(part => {
                const eqIdx = part.indexOf('=');
                if (eqIdx === -1) return part;
                const key = part.substring(0, eqIdx);
                const value = part.substring(eqIdx + 1);
                // Only encode if not already encoded (check for %XX patterns)
                const alreadyEncoded = /%[0-9A-Fa-f]{2}/.test(value);
                return `${key}=${alreadyEncoded ? value : encodeURIComponent(value)}`;
            });
            url = `${base}?${encodedParts.join('&')}`;
        }
        const method = (node.data.httpMethod || 'POST').toUpperCase();
        const rawHeaders = node.data.httpHeaders || '';
        const rawBody = node.data.httpBody || '';

        // Debug: log raw node config
        await context.logger(`[HttpRequestHandler] Config: method=${method}, url=${node.data.url}, hasBody=${!!rawBody}, hasHeaders=${!!rawHeaders}`);
        if (rawBody) {
            await context.logger(`[HttpRequestHandler] Raw body: ${rawBody.substring(0, 300)}`);
        }

        if (!url) {
            return { success: false, error: 'URL não configurada no nó HTTP Request.' };
        }

        // Parse headers
        const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
        let headers: Record<string, string> = methodsWithBody.includes(method) ? { 'Content-Type': 'application/json' } : {};
        if (rawHeaders.trim()) {
            try {
                const interpolatedHeaders = interpolate(rawHeaders, context);
                const parsed = JSON.parse(interpolatedHeaders);
                headers = { ...headers, ...parsed };
            } catch (e) {
                await context.logger(`[HttpRequestHandler] ⚠ Headers JSON inválido, usando defaults.`);
            }
        }

        // Build body
        let body: any = undefined;

        if (rawBody.trim()) {
            // User provided explicit body — parse it
            const interpolatedBody = interpolate(rawBody, context);
            await context.logger(`[HttpRequestHandler] Interpolated body: ${interpolatedBody.substring(0, 300)}`);
            try {
                body = JSON.parse(interpolatedBody);
            } catch (e) {
                // Not valid JSON after interpolation — send as raw string
                body = interpolatedBody;
            }
        } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
            // No explicit body — auto-build from upstream source node
            const sourceNodeId = node.data.sourceNodeId;
            if (sourceNodeId && context.nodeOutputs[sourceNodeId]?.data) {
                const sourceData = context.nodeOutputs[sourceNodeId].data;
                const { _variables, ...payload } = sourceData;
                body = payload;
                await context.logger(`[HttpRequestHandler] Auto-body from ${sourceNodeId}: ${Object.keys(payload).join(', ')}`);
            } else {
                // Fallback: gather all upstream outputs
                const allUpstream: Record<string, any> = {};
                for (const [nodeId, output] of Object.entries(context.nodeOutputs)) {
                    if (output && (output as any).data) {
                        const { _variables, ...data } = (output as any).data;
                        allUpstream[nodeId] = data;
                    }
                }
                if (Object.keys(allUpstream).length > 0) {
                    body = allUpstream;
                    await context.logger(`[HttpRequestHandler] Auto-body from all upstream: ${Object.keys(allUpstream).join(', ')}`);
                }
            }
        }

        // ⛔ GUARD: GET/HEAD CANNOT have body — strip it and warn
        if (body !== undefined && ['GET', 'HEAD'].includes(method)) {
            await context.logger(`[HttpRequestHandler] ⚠ Body stripped for ${method} request (GET/HEAD cannot have body). Body was: ${JSON.stringify(body).substring(0, 200)}`);
            body = undefined;
        }

        await context.logger(`[HttpRequestHandler] ${method} ${url}`);
        if (body) {
            const bodyPreview = typeof body === 'string' ? body.substring(0, 300) : JSON.stringify(body).substring(0, 300);
            await context.logger(`[HttpRequestHandler] Body being sent: ${bodyPreview}${bodyPreview.length >= 300 ? '...' : ''}`);
        } else {
            await context.logger(`[HttpRequestHandler] No body being sent.`);
        }

        try {
            const timeoutMs = (node.data.timeout || 120) * 1000; // Default 120s, configurable per node

            let responseData: any;
            let responseStatus = 0;
            let responseStatusText = '';
            let attempt = 1;
            const maxAttempts = 3;
            const retryDelayMs = 5000;

            while (attempt <= maxAttempts) {
                try {
                    await context.logger(`[HttpRequestHandler] Attempt ${attempt}/${maxAttempts} para ${url}...`);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                    const fetchOptions: RequestInit = {
                        method,
                        headers,
                        signal: controller.signal,
                    };

                    // Only include body for methods that support it (GET/HEAD cannot have body in Node 18+)
                    if (body !== undefined && body !== null && methodsWithBody.includes(method)) {
                        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                    }

                    const response = await fetch(url, fetchOptions);
                    clearTimeout(timeoutId);

                    responseStatus = response.status;
                    responseStatusText = response.statusText;

                    const contentType = response.headers.get('content-type') || '';
                    const responseText = await response.text();

                    // Parse response
                    if (contentType.includes('application/json') && responseText) {
                        try { responseData = JSON.parse(responseText); } catch { responseData = responseText; }
                    } else {
                        responseData = responseText;
                    }

                    break; // Success, exit retry loop
                } catch (err: any) {
                    const isRetryable = err.name === 'AbortError' ||
                        err.message.includes('socket hang up') ||
                        err.message.includes('ECONNRESET') ||
                        err.message.includes('ETIMEDOUT') ||
                        err.message.includes('fetch failed');

                    if (!isRetryable || attempt === maxAttempts) {
                        throw err;
                    }

                    await context.logger(`[HttpRequestHandler] ⚠ Tentativa ${attempt} falhou (${err.message}). Retentando em ${retryDelayMs / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                    attempt++;
                }
            }

            await context.logger(`[HttpRequestHandler] Response: ${responseStatus} ${responseStatusText}`);

            const respPreview = typeof responseData === 'string'
                ? responseData.substring(0, 300)
                : JSON.stringify(responseData).substring(0, 300);
            await context.logger(`[HttpRequestHandler] Response body: ${respPreview}`);

            // Normalize response for downstream nodes
            let items: any[] = [];
            if (Array.isArray(responseData)) {
                items = responseData;
            } else if (responseData && typeof responseData === 'object') {
                if (Array.isArray(responseData.items)) items = responseData.items;
                else if (Array.isArray(responseData.results)) items = responseData.results;
                else if (Array.isArray(responseData.data)) items = responseData.data;
                else items = [responseData];
            }

            // Build dynamic _variables from response keys
            const dynamicVars: Record<string, { label: string; type: string }> = {
                statusCode: { label: 'Status Code', type: 'text' },
                items: { label: 'Itens da Resposta', type: 'list' },
                raw: { label: 'Resposta Raw', type: 'text' },
                summary: { label: 'Resumo', type: 'text' },
            };

            // Expose each top-level key from the response as a variable
            if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
                for (const [key, value] of Object.entries(responseData)) {
                    if (key.startsWith('_')) continue;
                    const varType = Array.isArray(value) ? 'list' : (typeof value === 'object' && value !== null) ? 'object' : 'text';
                    dynamicVars[`response_${key}`] = { label: `Response: ${key}`, type: varType };
                }
            }

            // Build output data
            const outputData: Record<string, any> = {
                statusCode: responseStatus,
                items,
                raw: typeof responseData === 'string' ? responseData : JSON.stringify(responseData).substring(0, 5000),
                summary: `HTTP ${method} ${url} → ${responseStatus} (${items.length} items)`,
                source: 'http_request',
                source_type: 'api',
            };

            // Flatten response keys into output for direct {{nodeId.response_key}} access
            if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
                for (const [key, value] of Object.entries(responseData)) {
                    if (key.startsWith('_')) continue;
                    outputData[`response_${key}`] = value;
                }
            }

            outputData._variables = dynamicVars;

            return {
                success: true,
                data: outputData
            };
        } catch (error: any) {
            if (error.code === 'ECONNABORTED') {
                return { success: false, error: `Timeout: requisição para ${url} excedeu ${(node.data.timeout || 120)}s.` };
            }
            return { success: false, error: `HTTP Error: ${error.message}` };
        }
    }
}
