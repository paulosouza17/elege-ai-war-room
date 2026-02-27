import { NodeHandler, ExecutionContext, NodeOutput } from '../NodeHandler';
import { supabase } from '../../config/supabase';
import axios from 'axios';

const SEMRUSH_API_BASE = 'https://api.semrush.com';

interface SemrushConfig {
    apiKey: string;
    database?: string;
    defaultDomain?: string;
}

export class SemrushHandler implements NodeHandler {
    async execute(node: any, context: ExecutionContext): Promise<NodeOutput> {
        await context.logger('[SemrushHandler] Starting SEMrush data collection...');

        const config = await this.loadCredentials(context);
        if (!config) {
            return { success: false, error: 'Credenciais do SEMrush não configuradas. Vá em Configurações → Integrações → SEMrush.' };
        }

        const operation = node.data.semrushOperation || 'domain_overview';
        const domain = this.resolveDomain(node, context);
        const keyword = this.resolveKeyword(node, context);
        const database = node.data.semrushDatabase || config.database || 'br';
        const limit = Math.min(node.data.semrushLimit || 20, 100);

        await context.logger(`[SemrushHandler] Operation: ${operation}, Domain: "${domain}", Keyword: "${keyword}", DB: ${database}, Limit: ${limit}`);

        try {
            let result: NodeOutput;

            switch (operation) {
                case 'domain_overview':
                    result = await this.domainOverview(config, domain, database, context);
                    break;
                case 'domain_organic':
                    result = await this.domainOrganicSearch(config, domain, database, limit, context);
                    break;
                case 'domain_competitors':
                    result = await this.domainCompetitors(config, domain, database, limit, context);
                    break;
                case 'keyword_overview':
                    result = await this.keywordOverview(config, keyword, database, context);
                    break;
                case 'keyword_related':
                    result = await this.keywordRelated(config, keyword, database, limit, context);
                    break;
                case 'keyword_questions':
                    result = await this.keywordQuestions(config, keyword, database, limit, context);
                    break;
                case 'backlinks_overview':
                    result = await this.backlinksOverview(config, domain, context);
                    break;
                case 'backlinks_list':
                    result = await this.backlinksList(config, domain, limit, context);
                    break;
                case 'domain_vs_domain':
                    result = await this.domainVsDomain(config, domain, node.data.semrushCompetitorDomain || '', database, context);
                    break;
                case 'traffic_summary':
                    result = await this.trafficSummary(config, domain, context);
                    break;
                default:
                    result = await this.domainOverview(config, domain, database, context);
            }

            return result;
        } catch (error: any) {
            await context.logger(`[SemrushHandler] ❌ Error: ${error.message}`);
            return { success: false, error: `SEMrush API Error: ${error.message}` };
        }
    }

    // ────────────── Credentials ──────────────

    private async loadCredentials(context: ExecutionContext): Promise<SemrushConfig | null> {
        const { data, error } = await supabase
            .from('data_sources')
            .select('config, is_active')
            .ilike('name', '%SEMrush%')
            .single();

        if (error || !data || !data.is_active) {
            await context.logger('[SemrushHandler] ⚠ Data source "SEMrush" not found or inactive.');
            return null;
        }

        const cfg = data.config;
        if (!cfg?.apiKey) {
            await context.logger('[SemrushHandler] ⚠ API Key not configured.');
            return null;
        }

        await context.logger(`[SemrushHandler] ✅ Credentials loaded. Database: ${cfg.database || 'br'}`);
        return cfg as SemrushConfig;
    }

    // ────────────── Resolvers ──────────────

    private resolveDomain(node: any, context: ExecutionContext): string {
        if (node.data.semrushDomain) return node.data.semrushDomain;

        // Try to get from upstream nodes
        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (output?.data?.domain) return output.data.domain;
            if (output?.data?.url) {
                try { return new URL(output.data.url).hostname; } catch { }
            }
        }

        return '';
    }

    private resolveKeyword(node: any, context: ExecutionContext): string {
        if (node.data.semrushKeyword) return node.data.semrushKeyword;

        // Try to get from upstream keywords
        for (const key in context.nodeOutputs) {
            const output = context.nodeOutputs[key];
            if (output?.data?.keywords && Array.isArray(output.data.keywords)) {
                return output.data.keywords[0] || '';
            }
        }

        return '';
    }

    // ────────────── API Methods ──────────────

    private async domainOverview(config: SemrushConfig, domain: string, database: string, context: ExecutionContext): Promise<NodeOutput> {
        if (!domain) return { success: false, error: 'Domínio não informado.' };

        const data = await this.apiCall(config, 'domain_ranks', {
            domain,
            database,
            export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac,Sh,Sv',
        }, context);

        const row = data[0] || {};
        const result = {
            domain: row.Dn || domain,
            rank: Number(row.Rk) || 0,
            organic_keywords: Number(row.Or) || 0,
            organic_traffic: Number(row.Ot) || 0,
            organic_cost: Number(row.Oc) || 0,
            paid_keywords: Number(row.Ad) || 0,
            paid_traffic: Number(row.At) || 0,
            paid_cost: Number(row.Ac) || 0,
            backlinks: Number(row.Sh) || 0,
            search_visibility: Number(row.Sv) || 0,
            summary: `${domain}: Rank #${row.Rk || '?'} | ${row.Or || 0} keywords orgânicas | ${row.Ot || 0} tráfego orgânico`,
        };

        return this.buildOutput(result, 'domain_overview', context);
    }

    private async domainOrganicSearch(config: SemrushConfig, domain: string, database: string, limit: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!domain) return { success: false, error: 'Domínio não informado.' };

        const data = await this.apiCall(config, 'domain_organic', {
            domain,
            database,
            display_limit: String(limit),
            export_columns: 'Ph,Po,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td',
            display_sort: 'tr_desc',
        }, context);

        const items = data.map((row: any) => ({
            keyword: row.Ph || '',
            position: Number(row.Po) || 0,
            search_volume: Number(row.Nq) || 0,
            cpc: Number(row.Cp) || 0,
            url: row.Ur || '',
            traffic: Number(row.Tr) || 0,
            traffic_cost: Number(row.Tc) || 0,
            competition: Number(row.Co) || 0,
            results_count: Number(row.Nr) || 0,
            trend: row.Td || '',
        }));

        return this.buildOutput({ items, count: items.length, domain, summary: `${items.length} keywords orgânicas de ${domain}` }, 'domain_organic', context);
    }

    private async domainCompetitors(config: SemrushConfig, domain: string, database: string, limit: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!domain) return { success: false, error: 'Domínio não informado.' };

        const data = await this.apiCall(config, 'domain_organic_organic', {
            domain,
            database,
            display_limit: String(limit),
            export_columns: 'Dn,Cr,Np,Or,Ot,Oc,Ad',
            display_sort: 'cr_desc',
        }, context);

        const items = data.map((row: any) => ({
            competitor_domain: row.Dn || '',
            competition_level: Number(row.Cr) || 0,
            common_keywords: Number(row.Np) || 0,
            organic_keywords: Number(row.Or) || 0,
            organic_traffic: Number(row.Ot) || 0,
            organic_cost: Number(row.Oc) || 0,
            paid_keywords: Number(row.Ad) || 0,
        }));

        return this.buildOutput({ items, count: items.length, domain, summary: `${items.length} concorrentes orgânicos de ${domain}` }, 'domain_competitors', context);
    }

    private async keywordOverview(config: SemrushConfig, keyword: string, database: string, context: ExecutionContext): Promise<NodeOutput> {
        if (!keyword) return { success: false, error: 'Keyword não informada.' };

        const data = await this.apiCall(config, 'phrase_all', {
            phrase: keyword,
            database,
            export_columns: 'Ph,Nq,Cp,Co,Nr,Td,In,Fk,Fl',
        }, context);

        const row = data[0] || {};
        const result = {
            keyword: row.Ph || keyword,
            search_volume: Number(row.Nq) || 0,
            cpc: Number(row.Cp) || 0,
            competition: Number(row.Co) || 0,
            results_count: Number(row.Nr) || 0,
            trend: row.Td || '',
            intent: row.In || '',
            featured_snippet: row.Fk || '',
            featured_snippet_url: row.Fl || '',
            summary: `"${keyword}": ${row.Nq || 0} buscas/mês | CPC: $${row.Cp || 0} | Competição: ${row.Co || 0}`,
        };

        return this.buildOutput(result, 'keyword_overview', context);
    }

    private async keywordRelated(config: SemrushConfig, keyword: string, database: string, limit: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!keyword) return { success: false, error: 'Keyword não informada.' };

        const data = await this.apiCall(config, 'phrase_related', {
            phrase: keyword,
            database,
            display_limit: String(limit),
            export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
            display_sort: 'nq_desc',
        }, context);

        const items = data.map((row: any) => ({
            keyword: row.Ph || '',
            search_volume: Number(row.Nq) || 0,
            cpc: Number(row.Cp) || 0,
            competition: Number(row.Co) || 0,
            results_count: Number(row.Nr) || 0,
            trend: row.Td || '',
        }));

        return this.buildOutput({ items, count: items.length, seed_keyword: keyword, summary: `${items.length} keywords relacionadas a "${keyword}"` }, 'keyword_related', context);
    }

    private async keywordQuestions(config: SemrushConfig, keyword: string, database: string, limit: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!keyword) return { success: false, error: 'Keyword não informada.' };

        const data = await this.apiCall(config, 'phrase_questions', {
            phrase: keyword,
            database,
            display_limit: String(limit),
            export_columns: 'Ph,Nq,Cp,Co',
            display_sort: 'nq_desc',
        }, context);

        const items = data.map((row: any) => ({
            question: row.Ph || '',
            search_volume: Number(row.Nq) || 0,
            cpc: Number(row.Cp) || 0,
            competition: Number(row.Co) || 0,
        }));

        return this.buildOutput({ items, count: items.length, seed_keyword: keyword, summary: `${items.length} perguntas sobre "${keyword}"` }, 'keyword_questions', context);
    }

    private async backlinksOverview(config: SemrushConfig, domain: string, context: ExecutionContext): Promise<NodeOutput> {
        if (!domain) return { success: false, error: 'Domínio não informado.' };

        const data = await this.apiCall(config, 'backlinks_overview', {
            target: domain,
            target_type: 'root_domain',
            export_columns: 'total,domains_num,urls_num,ips_num,follows_num,nofollows_num,texts_num,images_num,forms_num,frames_num',
        }, context);

        const row = data[0] || {};
        const result = {
            total_backlinks: Number(row.total) || 0,
            referring_domains: Number(row.domains_num) || 0,
            referring_urls: Number(row.urls_num) || 0,
            referring_ips: Number(row.ips_num) || 0,
            follow_links: Number(row.follows_num) || 0,
            nofollow_links: Number(row.nofollows_num) || 0,
            text_links: Number(row.texts_num) || 0,
            image_links: Number(row.images_num) || 0,
            summary: `${domain}: ${row.total || 0} backlinks de ${row.domains_num || 0} domínios`,
        };

        return this.buildOutput(result, 'backlinks_overview', context);
    }

    private async backlinksList(config: SemrushConfig, domain: string, limit: number, context: ExecutionContext): Promise<NodeOutput> {
        if (!domain) return { success: false, error: 'Domínio não informado.' };

        const data = await this.apiCall(config, 'backlinks', {
            target: domain,
            target_type: 'root_domain',
            display_limit: String(limit),
            export_columns: 'page_score,response_code,source_url,source_title,target_url,anchor,external_num,internal_num,first_seen,last_seen',
            display_sort: 'page_score_desc',
        }, context);

        const items = data.map((row: any) => ({
            authority_score: Number(row.page_score) || 0,
            source_url: row.source_url || '',
            source_title: row.source_title || '',
            target_url: row.target_url || '',
            anchor_text: row.anchor || '',
            external_links: Number(row.external_num) || 0,
            internal_links: Number(row.internal_num) || 0,
            first_seen: row.first_seen || '',
            last_seen: row.last_seen || '',
        }));

        return this.buildOutput({ items, count: items.length, domain, summary: `${items.length} backlinks de ${domain} (top por autoridade)` }, 'backlinks_list', context);
    }

    private async domainVsDomain(config: SemrushConfig, domain1: string, domain2: string, database: string, context: ExecutionContext): Promise<NodeOutput> {
        if (!domain1 || !domain2) return { success: false, error: 'Dois domínios são necessários para comparação.' };

        const [overview1, overview2] = await Promise.all([
            this.apiCall(config, 'domain_ranks', { domain: domain1, database, export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At' }, context),
            this.apiCall(config, 'domain_ranks', { domain: domain2, database, export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At' }, context),
        ]);

        const d1 = overview1[0] || {};
        const d2 = overview2[0] || {};

        const result = {
            domain_1: { domain: domain1, rank: Number(d1.Rk) || 0, organic_keywords: Number(d1.Or) || 0, organic_traffic: Number(d1.Ot) || 0, paid_keywords: Number(d1.Ad) || 0 },
            domain_2: { domain: domain2, rank: Number(d2.Rk) || 0, organic_keywords: Number(d2.Or) || 0, organic_traffic: Number(d2.Ot) || 0, paid_keywords: Number(d2.Ad) || 0 },
            winner_rank: (Number(d1.Rk) || 9999) < (Number(d2.Rk) || 9999) ? domain1 : domain2,
            winner_traffic: (Number(d1.Ot) || 0) > (Number(d2.Ot) || 0) ? domain1 : domain2,
            summary: `${domain1} (Rank #${d1.Rk || '?'}, ${d1.Or || 0} kws) vs ${domain2} (Rank #${d2.Rk || '?'}, ${d2.Or || 0} kws)`,
        };

        return this.buildOutput(result, 'domain_vs_domain', context);
    }

    private async trafficSummary(config: SemrushConfig, domain: string, context: ExecutionContext): Promise<NodeOutput> {
        if (!domain) return { success: false, error: 'Domínio não informado.' };

        const data = await this.apiCall(config, 'domain_rank_history', {
            domain,
            database: 'br',
            display_limit: '12',
            export_columns: 'Dt,Rk,Or,Ot,Oc,Ad,At',
            display_sort: 'dt_desc',
        }, context);

        const items = data.map((row: any) => ({
            date: row.Dt || '',
            rank: Number(row.Rk) || 0,
            organic_keywords: Number(row.Or) || 0,
            organic_traffic: Number(row.Ot) || 0,
            organic_cost: Number(row.Oc) || 0,
            paid_keywords: Number(row.Ad) || 0,
            paid_traffic: Number(row.At) || 0,
        }));

        const latest = items[0] || {};
        const oldest = items[items.length - 1] || {};
        const trafficChange = latest.organic_traffic && oldest.organic_traffic
            ? Math.round(((latest.organic_traffic - oldest.organic_traffic) / oldest.organic_traffic) * 100)
            : 0;

        return this.buildOutput({
            items,
            count: items.length,
            domain,
            traffic_change_pct: trafficChange,
            summary: `${domain}: Variação de tráfego ${trafficChange > 0 ? '+' : ''}${trafficChange}% nos últimos ${items.length} meses`,
        }, 'traffic_summary', context);
    }

    // ────────────── HTTP Client ──────────────

    private async apiCall(config: SemrushConfig, type: string, params: Record<string, string>, context: ExecutionContext): Promise<any[]> {
        const url = new URL(SEMRUSH_API_BASE);
        url.searchParams.set('type', type);
        url.searchParams.set('key', config.apiKey);
        for (const [k, v] of Object.entries(params)) {
            url.searchParams.set(k, v);
        }

        await context.logger(`[SemrushHandler] GET ${type} (${params.domain || params.phrase || params.target || ''})`);

        const response = await axios.get(url.toString(), {
            timeout: 30000,
            validateStatus: () => true,
            responseType: 'text',
        });

        if (response.status === 403) throw new Error('API Key inválida ou expirada.');
        if (response.status === 429) throw new Error('Rate limit excedido. Aguarde antes de nova requisição.');
        if (response.status >= 400) throw new Error(`API retornou ${response.status}: ${response.data}`);

        // SEMrush returns semicolon-separated CSV
        return this.parseSemrushCsv(response.data as string);
    }

    private parseSemrushCsv(csv: string): any[] {
        const lines = csv.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(';');
        const results: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(';');
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
                row[h.trim()] = (values[idx] || '').trim();
            });
            results.push(row);
        }

        return results;
    }

    // ────────────── Output Builder ──────────────

    private async buildOutput(data: any, operation: string, context: ExecutionContext): Promise<NodeOutput> {
        const count = data.items?.length || 1;
        await context.logger(`[SemrushHandler] ✅ ${operation}: ${data.summary || count + ' results'}`);

        return {
            success: true,
            data: {
                ...data,
                operation,
                source: 'semrush',
                source_type: 'seo_analytics',
                _variables: {
                    items: { label: 'Resultados', type: 'list' },
                    count: { label: 'Quantidade', type: 'text' },
                    summary: { label: 'Resumo', type: 'text' },
                    domain: { label: 'Domínio', type: 'text' },
                    rank: { label: 'Rank', type: 'text' },
                    organic_keywords: { label: 'Keywords Orgânicas', type: 'text' },
                    organic_traffic: { label: 'Tráfego Orgânico', type: 'text' },
                    total_backlinks: { label: 'Total Backlinks', type: 'text' },
                    referring_domains: { label: 'Domínios Referentes', type: 'text' },
                    search_volume: { label: 'Volume de Busca', type: 'text' },
                    traffic_change_pct: { label: 'Variação Tráfego %', type: 'text' },
                    keyword: { label: 'Keyword', type: 'text' },
                    seed_keyword: { label: 'Keyword Semente', type: 'text' },
                    operation: { label: 'Operação', type: 'text' },
                }
            }
        };
    }
}
