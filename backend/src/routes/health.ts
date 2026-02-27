import { Router, Request, Response } from 'express';

export const healthCheckRouter = Router();

healthCheckRouter.get('/', (req: Request, res: Response) => {
    const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'OK',
        service: 'war-room-backend'
    };
    res.status(200).json(health);
});
