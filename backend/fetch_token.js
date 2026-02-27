
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function run() {
  const { data } = await supabase.from('data_sources').select('config').eq('type', 'elege_api').limit(1);
  if (data && data[0]) {
    console.log(data[0].config.api_token || data[0].config.token);
  }
}
run();

