require('dotenv').config();
var sb = require('@supabase/supabase-js');
var supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

supabase.from('flow_executions')
    .select('id, execution_log, flows(name, nodes, edges)')
    .order('started_at', { ascending: false })
    .eq('status', 'completed')
    .limit(1)
    .single()
    .then(function (res) {
        var ex = res.data;
        var nodes = ex.flows.nodes || [];
        var logs = ex.execution_log || [];

        // 1. Show the Script node's FULL code
        var scriptNode = nodes.find(function (n) { return n.id === 'node-2'; });
        if (scriptNode) {
            console.log('=== SCRIPT NODE (node-2) CONFIG ===');
            console.log('Label:', scriptNode.data.label);
            console.log('Template:', scriptNode.data.scriptTemplate);
            console.log('\n--- FULL CODE ---');
            console.log(scriptNode.data.scriptCode);
            console.log('--- END CODE ---');
        }

        // 2. Show the Conditional node's config
        var conditionalNode = nodes.find(function (n) { return n.id === 'node-4'; });
        if (conditionalNode) {
            console.log('\n=== CONDITIONAL NODE (node-4) CONFIG ===');
            console.log('Label:', conditionalNode.data.label);
            console.log('conditionSource:', conditionalNode.data.conditionSource);
            console.log('conditionOperator:', conditionalNode.data.conditionOperator);
            console.log('conditionValue:', conditionalNode.data.conditionValue);
        }

        // 3. Show the LinkCheck node config
        var linkCheckNode = nodes.find(function (n) { return n.id === 'linkcheck-1'; });
        if (linkCheckNode) {
            console.log('\n=== LINKCHECK NODE (linkcheck-1) CONFIG ===');
            console.log('Label:', linkCheckNode.data.label);
            console.log('linkSource:', linkCheckNode.data.linkSource);
            console.log('All data keys:', Object.keys(linkCheckNode.data).join(', '));
        }

        // 4. Show execution logs for conditional and linkcheck nodes
        console.log('\n=== CONDITIONAL + LINKCHECK LOG ENTRIES ===');
        logs.forEach(function (l, i) {
            if (l.nodeId === 'node-4' || l.nodeId === 'linkcheck-1' || l.nodeId === 'node-3' || l.nodeId === 'publish-1') {
                var iter = l.loopIteration !== undefined ? ' [iter ' + l.loopIteration + '/' + l.loopTotal + ']' : '';
                console.log('[' + i + '] ' + (l.nodeLabel || l.nodeId) + ' | ' + l.status + iter);
                if (l.output) {
                    if (l.output._conditionResult !== undefined) {
                        console.log('    _conditionResult:', l.output._conditionResult);
                        console.log('    resolvedValue:', JSON.stringify(l.output.resolvedValue));
                        console.log('    source:', l.output.source);
                        console.log('    operator:', l.output.operator);
                    }
                    if (l.output._skipped) {
                        console.log('    SKIPPED:', l.output._reason);
                    }
                    if (l.output.isNew !== undefined) {
                        console.log('    isNew:', l.output.isNew);
                    }
                    if (l.output.alreadyProcessed !== undefined) {
                        console.log('    alreadyProcessed:', l.output.alreadyProcessed);
                    }
                }
            }
        });

        // 5. Count how many times AI Analysis (node-3) actually ran
        var aiRuns = logs.filter(function (l) { return l.nodeId === 'node-3' && l.status === 'completed'; });
        var publishRuns = logs.filter(function (l) { return l.nodeId === 'publish-1' && l.status === 'completed'; });
        console.log('\n=== DOWNSTREAM EXECUTION COUNT ===');
        console.log('AI Analysis (node-3) completed:', aiRuns.length);
        console.log('Publish (publish-1) completed:', publishRuns.length);

        process.exit(0);
    });
