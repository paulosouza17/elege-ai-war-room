import express from 'express';
import { FlowService } from '../services/flowService';
import { AIService } from '../services/aiService';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase and AI Service for testing
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseClient = createClient(supabaseUrl, supabaseKey);
const aiService = new AIService(supabaseClient);

/**
 * Test endpoint to directly call handlePublishNode
 * This bypasses flow execution to test if publish functionality works
 */
router.post('/publish', async (req, res) => {
    try {
        console.log('========================================');
        console.log('[TEST] Direct publish node test started');
        console.log('========================================');

        const flowService = new FlowService(supabaseClient, aiService);

        // Create a mock publish node
        const mockNode = {
            id: 'test-publish-node',
            type: 'publish',
            data: {
                title: req.body.title || 'Test Publish from Direct API',
                category: req.body.category || 'neutral',
                template: req.body.template || 'Test content: {test-data}',
                sourceNodes: []
            },
            position: { x: 0, y: 0 }
        };

        // Create a mock context
        const mockContext = {
            demandId: req.body.demandId || null,
            activationId: req.body.activationId || null,
            initialData: { test: 'data' },
            nodeOutputs: new Map([
                ['test-data', 'This is test output from a mock node']
            ]),
            lastResult: null
        };

        console.log('[TEST] Mock node:', JSON.stringify(mockNode, null, 2));
        console.log('[TEST] Mock context:', JSON.stringify({
            demandId: mockContext.demandId,
            activationId: mockContext.activationId,
            nodeOutputsSize: mockContext.nodeOutputs.size
        }, null, 2));

        // Call handlePublishNode directly using reflection
        // @ts-ignore - accessing private method for testing
        const result = await flowService['handlePublishNode'](mockNode, mockContext);

        console.log('[TEST] ✅ Success! Result:', result);
        console.log('[TEST] ========================================');

        res.json({
            success: true,
            message: 'Publish node executed successfully',
            result: result
        });

    } catch (error: any) {
        console.error('[TEST] ❌ Error:', error);
        console.error('[TEST] Stack:', error.stack);
        console.log('[TEST] ========================================');

        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

export default router;
