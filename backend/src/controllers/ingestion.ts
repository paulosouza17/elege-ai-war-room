import { Request, Response } from 'express';
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { IngestionPayload } from '../types/ingestion';
import { z } from 'zod';

// Validation Schema
const ingestionSchema = z.object({
    source_id: z.string(),
    external_id: z.string().optional(),
    text: z.string().min(1),
    author: z.string().optional(),
    url: z.string().url().optional(),
    metadata: z.record(z.any()).optional(),
});

// Setup Queue
export const ingestionQueue = new Queue('ingestion-queue', { connection: redisConnection });

export const ingestData = async (req: Request, res: Response) => {
    try {
        // 1. Auth Check (Simple Token for MVP)
        const token = req.headers['x-api-key'];
        if (!token || token !== process.env.INGESTION_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 2. Validate Payload
        const validation = ingestionSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error });
        }

        const payload: IngestionPayload = validation.data;

        // 3. Enqueue Job
        await ingestionQueue.add('process-mention', {
            ...payload,
            received_at: new Date().toISOString()
        });

        return res.status(202).json({
            message: 'Payload received and queued',
            jobId: Date.now().toString() // In real app, get job.id
        });

    } catch (error) {
        console.error('Ingestion Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
