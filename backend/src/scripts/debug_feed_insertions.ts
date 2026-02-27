import { supabase } from '../config/supabase';

async function main() {
    // Get any activation_id to use
    const { data: acts } = await supabase.from('activations').select('id').limit(1);
    const activationId = acts?.[0]?.id || null;
    console.log('Using activation_id:', activationId);

    const testItems = [
        {
            title: 'Flávio Bolsonaro comenta sobre pesquisas para 2026 na Globo News',
            summary: 'O senador Flávio Bolsonaro participou do programa "Em Pauta" da Globo News e comentou sobre as últimas pesquisas eleitorais que mostram empate técnico com Lula.',
            content: 'Em entrevista exclusiva ao programa Em Pauta da Globo News, o senador Flávio Bolsonaro comentou sobre as últimas pesquisas eleitorais Atlas/Bloomberg que mostram empate técnico.',
            source: 'Globo News',
            source_type: 'tv',
            sentiment: 'neutral',
            risk_score: 45,
            status: 'pending',
            url: 'https://globonews.globo.com',
            published_at: new Date().toISOString(),
            activation_id: activationId,
        },
        {
            title: 'Análise: Cenário eleitoral de 2026 com Flávio Bolsonaro como pré-candidato',
            summary: 'A Band News FM trouxe análise de cientista político sobre o cenário eleitoral com a pré-candidatura de Flávio Bolsonaro.',
            content: 'Na edição da manhã da BandNews FM, o cientista político Carlos Melo analisou o cenário eleitoral de 2026.',
            source: 'BandNews FM',
            source_type: 'radio',
            sentiment: 'neutral',
            risk_score: 30,
            status: 'pending',
            url: 'https://bandnewsfm.band.uol.com.br',
            published_at: new Date().toISOString(),
            activation_id: activationId,
        },
        {
            title: 'Debate na Record News: Flávio Bolsonaro vs. Oposição no Senado',
            summary: 'Record News exibiu ao vivo debate entre lideranças do governo e oposição no Senado, com destaque para a atuação de Flávio Bolsonaro.',
            content: 'O programa Fala Brasil da Record News cobriu ao vivo o debate acalorado entre líderes partidários no Senado Federal.',
            source: 'Record News',
            source_type: 'tv',
            sentiment: 'negative',
            risk_score: 72,
            status: 'pending',
            url: 'https://recordnews.r7.com',
            published_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            activation_id: activationId,
        },
        {
            title: 'CBN Debate: Impacto das redes sociais na pré-campanha de Flávio Bolsonaro',
            summary: 'A CBN abriu debate sobre como as redes sociais estão moldando a pré-campanha de Flávio Bolsonaro e seu impacto na opinião pública.',
            content: 'No programa CBN Debate, jornalistas discutiram o papel das redes sociais na construção da imagem de pré-candidatos.',
            source: 'CBN',
            source_type: 'radio',
            sentiment: 'positive',
            risk_score: 20,
            status: 'pending',
            url: 'https://cbn.globo.com',
            published_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            activation_id: activationId,
        },
    ];

    const { data, error } = await supabase
        .from('intelligence_feed')
        .insert(testItems)
        .select('id, title, source_type');

    if (error) {
        console.error('Erro ao inserir:', error);
    } else {
        console.log('✅ Inseridos', data?.length, 'itens de teste:');
        data?.forEach(d => console.log(`  [${d.source_type}] ${d.title.substring(0, 60)}`));
    }
}

main().catch(console.error);
