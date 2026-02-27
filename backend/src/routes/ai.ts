
import { Router } from 'express';
import { AIService } from '../services/aiService';

import { supabase } from '../config/supabase';

const router = Router();

router.post('/test-connection', async (req, res) => {
    try {
        const { provider, apiKey, model } = req.body;

        if (!provider || !apiKey) {
            return res.status(400).json({ success: false, message: 'Missing provider or apiKey' });
        }

        const aiService = new AIService(supabase, {
            provider,
            apiKey,
            model: model || (provider === 'openai' ? 'gpt-4-turbo' : 'gemini-pro')
        });

        // Simple test prompt
        const result = await aiService.analyzeText('Test connection', 'System check');

        if (result.narrative.startsWith('Analysis failed')) {
            return res.status(400).json({ success: false, message: result.narrative });
        }

        res.json({ success: true, message: 'Connection successful!', data: result });

    } catch (error: any) {
        console.error('Test Connection Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export const aiRouter = router;
