/**
 * Migration: Update keyword_in_content scripts in existing flows
 * to use word-boundary regex matching instead of simple includes()
 */
require('dotenv').config();
var sb = require('@supabase/supabase-js');
var supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

var NEW_CODE = [
    '// Busca keywords da ativação no conteúdo de notícias individuais',
    '// Usa word-boundary matching para evitar falsos positivos',
    'const keywords = context.activation.keywords || [];',
    'const people = context.activation.people_of_interest || [];',
    '',
    'let title = "", content = "", url = "";',
    'for (const [nodeId, data] of Object.entries(inputs)) {',
    '    if (data.response_title || data.title) title = data.response_title || data.title || "";',
    '    if (data.response_content || data.content) content = data.response_content || data.content || "";',
    '    if (data.response_url || data.url) url = data.response_url || data.url || "";',
    '}',
    '',
    'const fullText = (title + " " + content).toLowerCase();',
    '',
    '// Word-boundary match para evitar falsos positivos',
    'function wordMatch(text, term) {',
    '    const escaped = term.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");',
    '    return new RegExp("\\\\b" + escaped + "\\\\b", "i").test(text);',
    '}',
    '',
    '// Buscar keywords (word boundary)',
    'const kwMatches = keywords.filter(kw => wordMatch(fullText, kw));',
    '// Buscar pessoas monitoradas (word boundary)',
    'const peopleMatches = people.filter(p => wordMatch(fullText, p));',
    '',
    'log("Title: " + title.substring(0, 80));',
    'log("Keywords encontradas: " + (kwMatches.join(", ") || "nenhuma"));',
    'log("Pessoas encontradas: " + (peopleMatches.join(", ") || "nenhuma"));',
    '',
    'const found = kwMatches.length > 0 || peopleMatches.length > 0;',
    '',
    'result = {',
    '    found,',
    '    keyword_matches: kwMatches,',
    '    people_matches: peopleMatches,',
    '    title,',
    '    url,',
    '    _conditionResult: found',
    '};'
].join('\n');

(async function () {
    var res = await supabase.from('flows').select('id, name, nodes');
    if (res.error) { console.error(res.error.message); process.exit(1); }

    var flows = res.data || [];
    var updated = 0;

    for (var flow of flows) {
        var nodes = flow.nodes || [];
        var changed = false;

        var newNodes = nodes.map(function (n) {
            if (n.data && n.data.iconType === 'script' && n.data.scriptCode) {
                var code = n.data.scriptCode;
                // Match scripts that use the old includes() pattern for keyword matching
                if (code.indexOf('fullText.includes(kw.toLowerCase())') >= 0 &&
                    code.indexOf('people_of_interest') >= 0) {
                    console.log('  Flow "' + flow.name + '" - Node "' + (n.data.label || n.id) + '" - UPDATING');
                    changed = true;
                    return Object.assign({}, n, {
                        data: Object.assign({}, n.data, { scriptCode: NEW_CODE })
                    });
                }
            }
            return n;
        });

        if (changed) {
            var upd = await supabase.from('flows').update({ nodes: newNodes }).eq('id', flow.id);
            if (upd.error) {
                console.error('  ERROR:', upd.error.message);
            } else {
                updated++;
                console.log('  DONE: ' + flow.name);
            }
        }
    }

    console.log('\nTotal flows scanned:', flows.length);
    console.log('Flows updated:', updated);
    process.exit(0);
})();
