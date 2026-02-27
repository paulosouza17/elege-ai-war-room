import { supabase } from './config/supabase';

async function testConnection() {
    try {
        const { data, error } = await supabase.from('organizations').select('count', { count: 'exact' });
        if (error) {
            console.error('❌ Connection Failed:', error.message);
        } else {
            console.log('✅ Connection Successful! Accessing organizations table.');
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    }
}

testConnection();
