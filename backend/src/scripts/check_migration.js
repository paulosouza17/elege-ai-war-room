require('dotenv').config();
var sb = require('@supabase/supabase-js');
var supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Check if columns exist
supabase.from('flow_executions').select('parent_execution_id').limit(0).then(function (r) {
    if (r.error) {
        console.log('Column parent_execution_id: MISSING');
        console.log('Error:', r.error.message);
        console.log('');
        console.log('=== RUN THIS SQL IN SUPABASE DASHBOARD ===');
        console.log('ALTER TABLE flow_executions ADD COLUMN IF NOT EXISTS parent_execution_id UUID REFERENCES flow_executions(id);');
        console.log('ALTER TABLE flow_executions ADD COLUMN IF NOT EXISTS resume_context JSONB;');
        console.log('CREATE INDEX IF NOT EXISTS idx_flow_executions_parent ON flow_executions(parent_execution_id);');
        console.log('===========================================');
    } else {
        console.log('Column parent_execution_id: EXISTS');
    }

    return supabase.from('flow_executions').select('resume_context').limit(0);
}).then(function (r2) {
    if (r2.error) {
        console.log('Column resume_context: MISSING');
    } else {
        console.log('Column resume_context: EXISTS');
    }
    process.exit(0);
});
