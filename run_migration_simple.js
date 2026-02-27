const fs = require('fs');
const path = require('path');

const sqlPath = path.resolve(__dirname, 'create_flows_table.sql');
try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('\n\n========== ACTION REQUIRED ==========\n');
    console.log('Please copy and run the following SQL in your Supabase SQL Editor to finish the integration:');
    console.log('\n---------------------------------------------------');
    console.log(sql);
    console.log('---------------------------------------------------\n\n');
} catch (err) {
    console.error('Error reading SQL file:', err);
}
