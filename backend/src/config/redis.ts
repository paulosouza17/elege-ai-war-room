import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
});

redisConnection.on('connect', () => {
    console.log('✅ Connected to Redis');
});

redisConnection.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err);
});
