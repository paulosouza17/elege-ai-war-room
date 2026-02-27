import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function switchToGemini() {
    // Desativar manus e perplexity
    const { error: e1 } = await supabase
        .from('ai_configs')
        .update({ is_active: false })
        .in('provider', ['manus', 'perplexity']);

    if (e1) { console.error('Erro ao desativar:', e1); return; }
    console.log('Manus e Perplexity desativados.');

    // Garantir gemini ativo
    const { error: e2 } = await supabase
        .from('ai_configs')
        .update({ is_active: true })
        .eq('provider', 'gemini');

    if (e2) { console.error('Erro ao ativar gemini:', e2); return; }
    console.log('Gemini ativado.');

    // Verificar resultado
    const { data } = await supabase.from('ai_configs').select('provider, is_active, model');
    console.log('Configuracoes atualizadas:', JSON.stringify(data, null, 2));
}

switchToGemini();
