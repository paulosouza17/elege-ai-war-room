
// Mock environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgemupuutkhxjfhxasbh.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZW11cHV1dGtoeGpmaHhhc2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI3MjQ0MCwiZXhwIjoyMDg2ODQ4NDQwfQ.XOAfD4UrO-TyUvWjSWCOvzx8L1dldZ5E2FbMmTzF590';
// Add API Keys if needed for real AI call (optional for this specific test if we only mock DB)
// But AnalysisHandler uses AIService which needs keys.
// process.env.GEMINI_API_KEY = '...'; 

import { AnalysisHandler } from '../src/nodes/handlers/AnalysisHandler';
import { supabase } from '../src/config/supabase';

async function testEntityDetection() {
    console.log("Starting Entity Detection Test...");

    // 1. Setup Mock Context
    const mockContext = {
        userId: 'test-user-id', // Replace with a valid user ID if needed
        logger: async (msg: string) => console.log(msg),
        nodeOutputs: {
            'trigger': {
                data: {
                    items: [
                        {
                            content: "O Capitão foi visto em Brasília ontem discutindo novas medidas.",
                            title: "Notícia Teste",
                            source: "twitter"
                        }
                    ]
                }
            }
        }
    };

    // 2. Setup Mock Entity
    // Ensure there is a monitored entity for this user that matches "Capitão" as an alias
    // You might need to insert one temporarily if it doesn't exist
    // For this test, we assume the logic in AnalysisHandler fetches entities correctly.
    // If you want to mock the supabase call, you'd need to mock the supabase client itself, 
    // but for an integration test, we can rely on existing data or insert a test record.

    // Let's assume there is a user and entity. 
    // To make this robust, let's insert a test entity.

    const { data: user } = await supabase.auth.getUser();
    // Since we are in a script, context.userId needs to be real or we mock the handler's entity fetch.
    // Let's mock the AnalysisHandler's entity fetching logic by creating a subclass or just testing the prompt generation part?
    // Actually, running the handler against real DB is better for integration.

    // We need a real user ID. 
    // For manual testing, we can hardcode a known user ID from the database.
    const TEST_USER_ID = '3b6eebdb-7d79-4ad2-9d6e-76a8d9435523';
    mockContext.userId = TEST_USER_ID;

    // Insert a test entity
    const { data: entity, error } = await supabase.from('monitored_entities').insert({
        name: 'Jair Bolsonaro',
        aliases: ['Bolsonaro', 'Capitão', 'Mito'],
        description: 'Ex-presidente do Brasil',
        user_id: TEST_USER_ID
    }).select().single();

    if (error) {
        console.error("Failed to insert test entity:", error);
        return;
    }
    console.log("Inserted test entity:", entity);

    // 3. Execute Handler
    const handler = new AnalysisHandler();
    const result = await handler.execute({}, mockContext as any);

    // 4. Verify Result
    console.log("Analysis Result:", JSON.stringify(result, null, 2));

    if (result.success && result.data.items[0].detected_entities?.includes(entity.id)) {
        console.log("SUCCESS: Entity detected via alias 'Capitão'!");
    } else {
        console.error("FAILURE: Entity NOT detected.");
    }

    // 5. Cleanup
    await supabase.from('monitored_entities').delete().eq('id', entity.id);
    console.log("Cleaned up test entity.");
}

testEntityDetection().catch(console.error);
