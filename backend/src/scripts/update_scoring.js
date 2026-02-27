require('dotenv').config();
const sb = require('@supabase/supabase-js');
const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const NEW_SCRIPT = [
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
    '// Smart Scoring v3:',
    '// - Person match = ALWAYS include (highest confidence)',
    '// - 2+ keywords = ALWAYS include (cross-reference confirms relevance)',
    '// - 1 keyword alone = NEVER include (too generic, causes false positives)',
    '// - 0 matches = REJECT',
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
    '};'
].join('\n');

async function main() {
    const { data: flows } = await supabase.from('flows')
        .select('id, name, nodes')
        .ilike('name', '%Teste completo Flavio%');

    if (!flows || flows.length === 0) { console.log('Flow not found'); return; }

    const flow = flows[0];
    console.log('Updating flow:', flow.name);

    const nodes = flow.nodes.map(n => {
        if (n.id === 'node-2') {
            return { ...n, data: { ...n.data, scriptCode: NEW_SCRIPT } };
        }
        return n;
    });

    const { error } = await supabase.from('flows').update({ nodes }).eq('id', flow.id);
    if (error) { console.error('Failed:', error.message); }
    else { console.log('Updated scoring v3: person OR 2+ keywords only'); }

    // Show what would happen with current keywords
    const kws = ['bolsonaro', 'lula', 'eleicoes', 'santos'];
    console.log('\nScenario analysis:');
    console.log('  "eleicoes" alone -> REJECTED (single keyword)');
    console.log('  "santos" alone -> REJECTED (single keyword)');
    console.log('  "lula" alone -> REJECTED (single keyword)');
    console.log('  "bolsonaro" alone -> REJECTED (single keyword)');
    console.log('  "lula" + "eleicoes" -> INCLUDED (2+ keywords)');
    console.log('  "Flavio Bolsonaro" -> INCLUDED (person match)');
    console.log('  "Luiz Inacio Lula da Silva" -> INCLUDED (person match)');
}

main().then(() => process.exit(0));
