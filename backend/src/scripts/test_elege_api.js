require('dotenv').config();
const axios = require('axios');

const token = process.env.ELEGEAI_API_TOKEN;
const personId = 1398216; // Lula

async function test(baseUrl, period) {
    try {
        const url = `${baseUrl}/api/analytics/mentions/latest?person_id=${personId}&limit=5&period=${period}`;
        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
        });
        const m = res.data.mentions || res.data.data || [];
        console.log(`[${baseUrl}] period=${period} → ${m.length} menções (status ${res.status})`);
        if (m.length > 0) {
            console.log(`  Mais recente: ${m[0].created_at}`);
            console.log(`  Mais antiga:  ${m[m.length - 1].created_at}`);
        }
    } catch (e) {
        const msg = e.response ? `${e.response.status} ${JSON.stringify(e.response.data).substring(0, 100)}` : e.message;
        console.log(`[${baseUrl}] period=${period} → ERRO: ${msg}`);
    }
}

(async () => {
    console.log('\n=== Teste API Elege ===\n');

    // Teste com API pública (HTTPS 443)
    await test('https://api.elege.ai', '1d');
    await test('https://api.elege.ai', 'day');
    await test('https://api.elege.ai', '7d');

    console.log('');

    // Teste com API interna (HTTP 3001)
    await test('http://app.elege.ai:3001', '1d');
    await test('http://app.elege.ai:3001', 'day');
    await test('http://app.elege.ai:3001', '7d');

    console.log('\n=== Fim ===');
})();
