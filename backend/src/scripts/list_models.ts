
import { GoogleGenerativeAI } from '@google/generative-ai';

// API Key from DB (hardcoded for test)
const apiKey = 'AIzaSyAqsUx4W1a7E8ItC5snIJiVUPf_XJNmMOs';

async function listModels() {
    console.log('--- Listing Gemini Models ---');
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Accessing the model manager is not direct in all versions, 
        // but let's try a simple getModel 
        // or just try gemini-pro which is standard.

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Test');
        console.log('gemini-pro works!');
    } catch (error: any) {
        console.error('\ngamini-pro failed:', error.message);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        const result = await model.generateContent('Test');
        console.log('gemini-1.5-flash-latest works!');
    } catch (error: any) {
        console.error('\ngemini-1.5-flash-latest failed:', error.message);
    }
}

listModels();
