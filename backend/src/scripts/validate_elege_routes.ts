import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateElegeRoutes() {
    console.log('🔍 Iniciando validação de rotas do Elege.AI...\n');

    // 1. Fetch Elege.AI configuration from data_sources
    const { data: dataSources, error: dsError } = await supabase
        .from('data_sources')
        .select('config')
        .eq('type', 'elege_api');

    let baseUrl = '';
    let apiToken = '';

    if (dataSources && dataSources.length > 0) {
        const config = dataSources[0].config;
        baseUrl = config.base_url?.replace(/\/$/, '') || '';
        apiToken = config.api_token || config.token || '';
    }

    // Fallback to what we know is probably in the .env or hardcoded
    if (!baseUrl || !apiToken) {
        baseUrl = process.env.ELEGE_BASE_URL || 'http://10.144.103.1:3001';
        apiToken = process.env.ELEGE_API_TOKEN || process.env.ELEGEAI_API_TOKEN || 'Ihbtdf46424';
        console.log('⚠️ Usando configuração de fallback (Hardcoded / ENV).');
    }

    if (!baseUrl || !apiToken) {
        console.error('❌ Credenciais incompletas no data_source (base_url ou api_token ausente).');
        return;
    }

    console.log(`✅ Credenciais encontradas!`);
    console.log(`🔗 Base URL: ${baseUrl}`);
    console.log(`🔑 Token presente: Sim (${apiToken.substring(0, 5)}...)\n`);

    // Define potential routes to validate mapped from Swagger
    const routesToTest = [
        { name: 'Latest Mentions', path: '/api/analytics/mentions/latest?limit=5' },
        { name: 'Mentions Sentiment', path: '/api/analytics/mentions/sentiment' },
        { name: 'Mentions Timeline', path: '/api/analytics/mentions/timeline' },
        { name: 'Top Channels', path: '/api/analytics/channels/top' },
        { name: 'Trending Keywords', path: '/api/analytics/keywords/trending' },
        { name: 'Top People', path: '/api/analytics/people/top' },
        { name: 'Analytics Overview', path: '/api/analytics/overview' },
        { name: 'Channels List', path: '/api/channels?limit=5' },
        { name: 'People List', path: '/api/people?limit=5' },
        { name: 'Posts List', path: '/api/posts?limit=5' }
    ];

    console.log('🚀 Testando rotas...\n');

    const headers = {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    for (const route of routesToTest) {
        const fullUrl = `${baseUrl}${route.path}`;
        process.stdout.write(`⏳ Testando [${route.name}] -> ${route.path}... `);

        try {
            const response = await fetch(fullUrl, { method: 'GET', headers, timeout: 5000 } as RequestInit);

            if (response.ok) {
                let snippet = '';
                try {
                    const json = await response.json();
                    // Try to get an idea of the response schema
                    if (Array.isArray(json)) {
                        snippet = `Array<${json.length}>`;
                        if (json.length > 0) snippet += ` (Ex: ${Object.keys(json[0]).slice(0, 3).join(', ')}...)`;
                    } else if (json && typeof json === 'object') {
                        const keys = Object.keys(json);
                        snippet = `Object { ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', ...' : ''} }`;
                        if (json.data && Array.isArray(json.data)) {
                            snippet += ` -> data: Array<${json.data.length}>`;
                        }
                    } else {
                        snippet = typeof json;
                    }
                } catch (e) {
                    snippet = '(Não retornou JSON válido)';
                }

                console.log(`✅ OK (Status: ${response.status})`);
                console.log(`   └─ Resultado Real: ${snippet}`);
            } else {
                console.log(`❌ FALHOU (Status: ${response.status} - ${response.statusText})`);
            }
        } catch (error: any) {
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                console.log(`⚠️ TIMEOUT (Demorou mais de 5s)`);
            } else if (error.cause && error.cause.code === 'ECONNREFUSED') {
                console.log(`❌ RECUSADO (A API está fora do ar ou o IP está inacessível: ${error.cause.address}:${error.cause.port})`);
            } else {
                console.log(`❌ ERRO: ${error.message}`);
            }
        }
    }

    console.log('\n🏁 Validação concluída.');
}

validateElegeRoutes();
