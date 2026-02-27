
import { GoogleGenerativeAI } from '@google/generative-ai';

// API Key from DB (hardcoded for test)
const apiKey = 'AIzaSyAqsUx4W1a7E8ItC5snIJiVUPf_XJNmMOs';

async function listModels() {
    console.log('--- Listing All Available Models ---');
    try {
        // Fetch valid models via REST since SDK might hide listModels in some versions or it's on the manager
        // But let's try the direct fetch first as a workaround if SDK fails

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log('No models returned:', data);
        }

    } catch (error: any) {
        console.error('Error listing models:', error.message);
    }
}

listModels();
