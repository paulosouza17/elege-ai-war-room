
import { GoogleGenerativeAI } from '@google/generative-ai';

// API Key from DB (hardcoded for test)
const apiKey = 'AIzaSyAqsUx4W1a7E8ItC5snIJiVUPf_XJNmMOs';

async function testGemini() {
    console.log('--- Testing Gemini API ---');
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = 'Explain what a War Room is in one sentence.';
        console.log(`Sending prompt: "${prompt}"`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('\nSuccess! Response:');
        console.log(text);
    } catch (error: any) {
        console.error('\nAPI Error:', error.message);
    }
}

testGemini();
