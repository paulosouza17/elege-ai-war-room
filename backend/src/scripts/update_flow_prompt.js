const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kgemupuutkhxjfhxasbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590'
);

async function main() {
    const { data: flow } = await supabase
        .from('flows')
        .select('id, nodes')
        .eq('id', '8c01fd71-4c83-49f9-987c-d6e81322bc63')
        .single();

    if (!flow) { console.log('Flow not found'); return; }

    // Find node-3 and update its prompt + prePrompt
    const nodes = flow.nodes;
    const node3 = nodes.find(n => n.id === 'node-3');
    if (!node3) { console.log('node-3 not found'); return; }

    console.log('=== CURRENT prePrompt ===');
    console.log(node3.data.prePrompt);
    console.log('\n=== CURRENT prompt ===');
    console.log(node3.data.prompt);

    // New prePrompt: remove hardcoded "Flavio Bolsonaro" bias, keep strategic analysis framework
    const newPrePrompt = `Analista de inteligência política. Responda em pt-BR.

Analise o conteúdo abaixo sob a lógica de guerra de narrativa.
Identifique TODAS as pessoas citadas e classifique como foram mencionadas:
Positiva estratégica
Negativa estratégica
Neutra

Explique objetivamente o motivo da citação:
Por que foi citada?
Em qual contexto (crescimento, crítica, escândalo, comparação, liderança, teto, crise, defesa, ataque etc.)?
Qual o efeito implícito dessa citação sobre sua imagem pública?

Avalie o impacto narrativo:
Favorece, prejudica ou é irrelevante para a posição estratégica dela?
Existe comparação implícita com adversário?
O conteúdo sugere fortalecimento, desgaste ou estagnação?

Responda de forma objetiva e analítica, focando no impacto estratégico e não apenas no tom emocional do texto.

A perspectiva de análise será definida pelo MAPA DE ENTIDADES MONITORADAS fornecido pelo sistema. O alvo principal (🎯) é quem define o viés estratégico. Adversários (⚔️) devem ser SEMPRE detectados quando citados.`;

    // New prompt: include detected_entities and per_entity_analysis in the JSON schema
    const newPrompt = `Analise a matéria e produza um resumo contextualizado focando em COMO cada pessoa de interesse aparece na narrativa.

JSON obrigatório:
{
  "title": "título",
  "summary": "resumo detalhado (5+ frases): fato, envolvidos, contexto, desdobramentos",
  "context_analysis": [{"person":"nome","role":"protagonista|citado|investigado|fonte|menção_indireta","context":"como aparece","tone":"positive|negative|neutral","implication":"impacto"}],
  "risk_score": 0-100,
  "sentiment": "positive|negative|neutral",
  "source_name": "veículo",
  "content_type_detected": "news_article|print_social_media|document|unknown",
  "keywords": ["tags"],
  "entities": ["todas citadas"],
  "detected_entities": ["IDs UUID das entidades monitoradas encontradas no texto"],
  "per_entity_analysis": [{"entity_name":"nome","entity_id":"UUID ou null","sentiment":"positive|negative|neutral|mixed","context":"como foi citada","tone":"descritivo|crítico|elogioso|neutro|alarmista"}],
  "people_found": ["só da lista monitorada"],
  "keyword_matches": ["só da lista monitorada"],
  "relevance_explanation": "1 frase"
}

context_analysis: 1 objeto por pessoa encontrada, [] se nenhuma.
per_entity_analysis: 1 objeto por entidade monitorada encontrada, [] se nenhuma.
detected_entities: array com os IDs (UUID) das entidades da lista monitorada que foram detectadas no texto.
Apenas JSON puro.`;

    // Update node-3
    node3.data.prePrompt = newPrePrompt;
    node3.data.prompt = newPrompt;

    const { error } = await supabase
        .from('flows')
        .update({ nodes })
        .eq('id', flow.id);

    if (error) {
        console.error('\n❌ Failed to update flow:', error.message);
    } else {
        console.log('\n✅ Flow node-3 prompt updated successfully!');
        console.log('\n=== NEW prePrompt ===');
        console.log(newPrePrompt);
        console.log('\n=== NEW prompt ===');
        console.log(newPrompt);
    }
}

main().catch(console.error);
