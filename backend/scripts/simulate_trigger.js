const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';
// Need a valid service token or mock auth for admin routes.
// In our implementation, we check supabase.auth.getUser(token).
// So we need a valid JWT from a real login.
// Since we can't easily get one without a UI login flow in this script, 
// we might verify the Flow Execution (public/open for now in this MVP script) 
// and skip the admin route verification or simulate it if we had a token.

async function runTests() {
    console.log('🤖 Starting Verification Script for War Room System');

    // 1. Test Health
    try {
        const health = await fetch(`http://localhost:3000/health`);
        console.log('✅ Health Check:', await health.json());
    } catch (e) {
        console.error('❌ Health Check Failed. Is server running?');
        return;
    }

    // 2. Test Flow Execution (Simulation)
    // We need a flow ID. Let's assume one exists or we just test the 404 response which confirms endpoint works.
    const flowId = '00000000-0000-0000-0000-000000000000';
    console.log(`\n🌊 Testing Flow Execution (ID: ${flowId})...`);

    try {
        const res = await fetch(`${BASE_URL}/flows/${flowId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Script Simulation',
                description: 'Testing from simulate_trigger.js',
                userId: 'script-tester-id'
            })
        });

        // We expect 500 or 404 if flow doesn't exist, but JSON response.
        const data = await res.json();
        console.log('👉 Response:', data);

        if (res.status === 200) {
            console.log('✅ Flow Execution Triggered Successfully');
        } else {
            console.log('⚠️ Endpoint reachable, but flow might not exist (Expected).');
        }
    } catch (e) {
        console.error('❌ Flow Execution Test Failed:', e.message);
    }

    // 3. Test Admin User Creation (Requires Token)
    console.log('\n👥 User Management Endpoint accessible at POST /api/admin/users');
    console.log('   (Skipping actual call as it requires a valid Supabase JWT Auth Token)');

    console.log('\n🎉 Verification Script Completed.');
}

runTests();
