import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import { healthCheckRouter } from './routes/health';
import ingestionRouter from './routes/ingestion';
import { aiRouter } from './routes/ai';
import { crisisRouter } from './routes/crisis';
import { activationSummaryRouter } from './routes/activationSummary';
import { reportRouter } from './routes/reportRoutes';
import { publicDashboardRouter } from './routes/publicDashboard';
import testRouter from './routes/test'; // Test endpoints
import manualAnalysisRouter from './routes/manualAnalysis';
import './workers/ingestionWorker'; // Start Worker
import './workers/flowWorker'; // Start Flow Execution Worker

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/health', healthCheckRouter);
app.use('/api/v1/ingest', ingestionRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/crisis', crisisRouter);
app.use('/api/v1/activations', activationSummaryRouter);
app.use('/api/v1/activations', reportRouter); // Authenticated report management
app.use('/api/v1/activations', publicDashboardRouter); // Dashboard sharing (admin)
app.use('/api/report', reportRouter); // Public report routes
app.use('/api/public/dashboard', publicDashboardRouter); // Public dashboard routes (no auth)
app.use('/api/test', testRouter); // Test routes
app.use('/api/v1/ingest', manualAnalysisRouter); // Manual analysis (standalone AI)

// ═══════════════════════════════════════════════════════════
// Elege.AI Asset Proxy — serves media files to the frontend
// ═══════════════════════════════════════════════════════════
app.get('/api/elege/assets/:postId/:assetId', async (req, res) => {
    const { postId, assetId } = req.params;
    try {
        const token = process.env.ELEGEAI_API_TOKEN || '';
        const baseUrl = process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001';
        const downloadUrl = `${baseUrl}/api/posts/${postId}/assets/${assetId}/download`;

        console.log(`[ElegeProxy] Fetching ${downloadUrl}`);

        const upstream = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'stream',
            timeout: 120000,
        });

        const contentType = upstream.headers['content-type'] || 'application/octet-stream';
        const contentLength = upstream.headers['content-length'];

        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        upstream.data.pipe(res);
    } catch (error: any) {
        const status = error.response?.status || 500;
        const message = error.response?.statusText || error.message;
        console.error(`[ElegeProxy] Asset ${postId}/${assetId} failed (${status}):`, message);
        if (!res.headersSent) {
            res.status(status).json({ error: message });
        }
    }
});

// ═══════════════════════════════════════════════════════════
// Elege.AI Person Photo Proxy — get/upload person photos
// ═══════════════════════════════════════════════════════════

// GET /api/elege/people/:id/photo — Stream person photo (JPEG)
app.get('/api/elege/people/:id/photo', async (req, res) => {
    const { id } = req.params;
    try {
        const token = process.env.ELEGEAI_API_TOKEN || '';
        const baseUrl = process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001';
        const photoUrl = `${baseUrl}/api/people/${id}/photo`;

        const upstream = await axios.get(photoUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'stream',
            timeout: 15000,
        });

        const contentType = upstream.headers['content-type'] || 'image/jpeg';
        const contentLength = upstream.headers['content-length'];

        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        upstream.data.pipe(res);
    } catch (error: any) {
        const status = error.response?.status || 500;
        if (status === 404) {
            // No photo — return transparent 1x1 pixel or 404
            res.status(404).json({ error: 'No photo' });
        } else {
            console.error(`[ElegeProxy] Person photo ${id} failed (${status}):`, error.response?.statusText || error.message);
            if (!res.headersSent) {
                res.status(status).json({ error: error.response?.statusText || error.message });
            }
        }
    }
});

// POST /api/elege/people/:id/photo — Upload person photo (multipart/form-data)
app.post('/api/elege/people/:id/photo', async (req, res) => {
    const { id } = req.params;
    try {
        const token = process.env.ELEGEAI_API_TOKEN || '';
        const baseUrl = process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001';
        const photoUrl = `${baseUrl}/api/people/${id}/photo`;

        // Forward the raw request body as stream
        const upstream = await axios.post(photoUrl, req, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': req.headers['content-type'] || 'multipart/form-data',
            },
            timeout: 30000,
        });

        res.json({ success: true, data: upstream.data });
    } catch (error: any) {
        const status = error.response?.status || 500;
        console.error(`[ElegeProxy] Upload photo for person ${id} failed (${status}):`, error.response?.data || error.message);
        if (!res.headersSent) {
            res.status(status).json({ error: error.response?.data || error.message });
        }
    }
});

// ═══════════════════════════════════════════════════════════
// Elege.AI Channel Proxy — CRUD for channels (Instagram, TikTok, etc.)
// ═══════════════════════════════════════════════════════════
const elegeHeaders = () => ({
    'Authorization': `Bearer ${process.env.ELEGEAI_API_TOKEN || ''}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
});
const elegeBase = () => `${process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001'}/api`;

// GET /api/elege/channels — List all channels (optionally filter by ?kind=instagram,tiktok)
app.get('/api/elege/channels', async (req, res) => {
    try {
        const response = await axios.get(`${elegeBase()}/channels?limit=200`, { headers: elegeHeaders(), timeout: 15000 });
        let channels = response.data.channels || response.data.data || [];
        // Filter by kind if specified
        const kind = req.query.kind as string;
        if (kind) {
            const kinds = kind.split(',').map(k => k.trim().toLowerCase());
            channels = channels.filter((ch: any) => kinds.includes(String(ch.kind).toLowerCase()));
        }
        res.json({ success: true, channels });
    } catch (error: any) {
        console.error('[ElegeChannelProxy] GET error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
});

// POST /api/elege/channels — Create a new channel
app.post('/api/elege/channels', async (req, res) => {
    try {
        const payload = {
            ...req.body,
            country_id: req.body.country_id || 1, // Default: Brazil
        };
        console.log(`[ElegeChannelProxy] Creating channel:`, payload);
        const response = await axios.post(`${elegeBase()}/channels`, payload, { headers: elegeHeaders(), timeout: 15000 });
        res.json({ success: true, channel: response.data });
    } catch (error: any) {
        console.error('[ElegeChannelProxy] POST error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
});

// DELETE /api/elege/channels/:id — Remove a channel
app.delete('/api/elege/channels/:id', async (req, res) => {
    try {
        const response = await axios.delete(`${elegeBase()}/channels/${req.params.id}`, { headers: elegeHeaders(), timeout: 15000 });
        res.json({ success: true, data: response.data });
    } catch (error: any) {
        console.error('[ElegeChannelProxy] DELETE error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
});

// PATCH /api/elege/channels/:id — Update a channel
app.patch('/api/elege/channels/:id', async (req, res) => {
    try {
        const response = await axios.patch(`${elegeBase()}/channels/${req.params.id}`, req.body, { headers: elegeHeaders(), timeout: 15000 });
        res.json({ success: true, channel: response.data });
    } catch (error: any) {
        console.error('[ElegeChannelProxy] PATCH error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
});

// POST /api/elege/channels/batch — Create multiple channels + link to activations
app.post('/api/elege/channels/batch', async (req, res) => {
    try {
        const { channels: channelList, activation_ids } = req.body;
        if (!Array.isArray(channelList) || channelList.length === 0) {
            return res.status(400).json({ error: 'channels array is required' });
        }

        const results: { title: string; success: boolean; channel_id?: number; error?: string }[] = [];

        for (const ch of channelList) {
            try {
                const payload = {
                    title: ch.title,
                    kind: ch.kind,
                    url: ch.url || '',
                    username: ch.username || null,
                    country_id: ch.country_id || 1,
                };
                const response = await axios.post(`${elegeBase()}/channels`, payload, { headers: elegeHeaders(), timeout: 15000 });
                const createdChannel = response.data;
                const channelId = createdChannel.id || createdChannel.channel?.id;

                // Save activation mappings in Supabase
                if (channelId && Array.isArray(activation_ids) && activation_ids.length > 0) {
                    const mappings = activation_ids.map((aid: string) => ({
                        elege_channel_id: channelId,
                        channel_kind: ch.kind,
                        channel_title: ch.title,
                        activation_id: aid,
                    }));
                    await supabaseClient.from('channel_activations').upsert(mappings, { onConflict: 'elege_channel_id,activation_id' });
                }

                results.push({ title: ch.title, success: true, channel_id: channelId });
            } catch (err: any) {
                const errMsg = err.response?.data?.error || err.message;
                results.push({ title: ch.title, success: false, error: errMsg });
            }
        }

        const created = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`[ElegeChannelProxy] Batch: ${created} created, ${failed} failed`);
        res.json({ success: true, created, failed, results });
    } catch (error: any) {
        console.error('[ElegeChannelProxy] BATCH error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/elege/channels/:id/activations — Save activation mappings for an existing channel
app.post('/api/elege/channels/:id/activations', async (req, res) => {
    try {
        const channelId = parseInt(req.params.id);
        const { activation_ids, channel_kind, channel_title } = req.body;
        if (!Array.isArray(activation_ids)) {
            return res.status(400).json({ error: 'activation_ids array is required' });
        }

        // Remove old mappings for this channel
        await supabaseClient.from('channel_activations').delete().eq('elege_channel_id', channelId);

        // Insert new mappings
        if (activation_ids.length > 0) {
            const mappings = activation_ids.map((aid: string) => ({
                elege_channel_id: channelId,
                channel_kind: channel_kind || 'unknown',
                channel_title: channel_title || '',
                activation_id: aid,
            }));
            const { error } = await supabaseClient.from('channel_activations').insert(mappings);
            if (error) throw error;
        }

        res.json({ success: true, count: activation_ids.length });
    } catch (error: any) {
        console.error('[ElegeChannelProxy] Activations save error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Screenshot Proxy — serves locally cached article screenshots
// ═══════════════════════════════════════════════════════════
import path from 'path';
import fs from 'fs';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'uploads', 'screenshots');
app.get('/api/screenshots/:filename', (req, res) => {
    const { filename } = req.params;
    // Sanitize — only allow characters in our naming scheme
    if (!/^screenshot-[a-f0-9]+\.png$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    const filepath = path.join(SCREENSHOT_DIR, filename);
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Screenshot not found' });
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    fs.createReadStream(filepath).pipe(res);
});

app.use('/api/v1', (req, res) => {
    res.json({ message: 'War Room API v1' });
});

// Flow Execution Endpoint
// Flow Execution Endpoint
// Imports for Flow Execution
import { FlowService } from './services/flowService';
import { AIService } from './services/aiService';
import { SchedulerService } from './services/schedulerService'; // Fixed casing
import { WatchdogService } from './services/watchdogService';
import { UserService } from './services/userService';
import { ElegeSyncService } from './services/ElegeSyncService';
import { DbCleanupService } from './services/dbCleanupService';
import { createClient } from '@supabase/supabase-js';

// Initialize Services for Flow Execution
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const aiService = new AIService(supabaseClient);
const flowService = new FlowService(supabaseClient, aiService);
const schedulerService = new SchedulerService(supabaseClient, flowService);
const userService = new UserService(supabaseClient);
const watchdogService = new WatchdogService(supabaseClient);
const elegeSyncService = new ElegeSyncService(supabaseClient);
const dbCleanupService = new DbCleanupService(supabaseClient);

// Admin Middleware
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    const role = user.user_metadata?.role;
    if (role !== 'admin') {
        console.warn(`[Auth] User ${user.email} (Role: ${role}) attempted admin action.`);
        return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    (req as any).user = user;
    next();
};

// ═══════════════════════════════════════════════════════════
// SERVICE REGISTRY — Tracks health and enables control
// ═══════════════════════════════════════════════════════════
interface ServiceEntry {
    name: string;
    label: string;
    running: boolean;
    startedAt: string | null;
    lastTickAt: string | null;
    tickCount: number;
    errors: number;
    intervalMs: number;
    intervalRef: NodeJS.Timeout | null;
    start: () => void;
    stop: () => void;
}

const serviceRegistry: Record<string, ServiceEntry> = {};

// --- Scheduler Service (wraps existing SchedulerService) ---
const startScheduler = () => {
    if (serviceRegistry.scheduler?.running) return;
    schedulerService.start(60000);
    const entry = serviceRegistry.scheduler;
    entry.running = true;
    entry.startedAt = new Date().toISOString();
    // Patch tick tracking via monkey-patch on handleTick
    const origTick = (schedulerService as any).handleTick.bind(schedulerService);
    (schedulerService as any).handleTick = async function () {
        try {
            await origTick();
            entry.lastTickAt = new Date().toISOString();
            entry.tickCount++;
        } catch (err) {
            entry.errors++;
            throw err;
        }
    };
    console.log('🕐 [ServiceRegistry] Scheduler started');
};

const stopScheduler = () => {
    schedulerService.stop();
    serviceRegistry.scheduler.running = false;
    console.log('🕐 [ServiceRegistry] Scheduler stopped');
};

serviceRegistry.scheduler = {
    name: 'scheduler',
    label: 'Agendador CRON',
    running: false,
    startedAt: null,
    lastTickAt: null,
    tickCount: 0,
    errors: 0,
    intervalMs: 60000,
    intervalRef: null,
    start: startScheduler,
    stop: stopScheduler,
};

// --- Watchdog Service (controllable interval) ---
let watchdogInterval: NodeJS.Timeout | null = null;

const startWatchdog = () => {
    if (serviceRegistry.watchdog?.running) return;
    const entry = serviceRegistry.watchdog;
    entry.running = true;
    entry.startedAt = new Date().toISOString();
    watchdogInterval = setInterval(async () => {
        try {
            await watchdogService.checkEscalationRules();
            entry.lastTickAt = new Date().toISOString();
            entry.tickCount++;
        } catch (err) {
            entry.errors++;
            console.error('[Watchdog] Error:', err);
        }
    }, 60000);
    console.log('🐶 [ServiceRegistry] Watchdog started');
};

const stopWatchdog = () => {
    if (watchdogInterval) {
        clearInterval(watchdogInterval);
        watchdogInterval = null;
    }
    serviceRegistry.watchdog.running = false;
    console.log('🐶 [ServiceRegistry] Watchdog stopped');
};

serviceRegistry.watchdog = {
    name: 'watchdog',
    label: 'Monitor de Crise',
    running: false,
    startedAt: null,
    lastTickAt: null,
    tickCount: 0,
    errors: 0,
    intervalMs: 60000,
    intervalRef: null,
    start: startWatchdog,
    stop: stopWatchdog,
};

// --- Ingestion Worker (BullMQ — status-only, can't restart from API easily) ---
serviceRegistry['ingestion-worker'] = {
    name: 'ingestion-worker',
    label: 'Worker de Ingestão',
    running: true, // Auto-started on import
    startedAt: new Date().toISOString(),
    lastTickAt: null,
    tickCount: 0,
    errors: 0,
    intervalMs: 0,
    intervalRef: null,
    start: () => { console.warn('[IngestionWorker] BullMQ worker auto-manages. Cannot start from API.'); },
    stop: () => { console.warn('[IngestionWorker] BullMQ worker auto-manages. Cannot stop from API.'); },
};

// --- Elege Mentions Sync Service ---
const startElegeSync = () => {
    if (serviceRegistry.elegesync?.running) return;
    elegeSyncService.start();
    const entry = serviceRegistry.elegesync;
    entry.running = true;
    entry.startedAt = new Date().toISOString();
    console.log('🔄 [ServiceRegistry] ElegeSync started');
};

const stopElegeSync = () => {
    elegeSyncService.stop();
    serviceRegistry.elegesync.running = false;
    console.log('🔄 [ServiceRegistry] ElegeSync stopped');
};

serviceRegistry.elegesync = {
    name: 'elegesync',
    label: 'Sincronizador Elege.AI',
    running: false,
    startedAt: null,
    lastTickAt: null,
    tickCount: 0,
    errors: 0,
    intervalMs: 300000,
    intervalRef: null,
    start: startElegeSync,
    stop: stopElegeSync,
};

// --- DB Cleanup Service (auto-purge old flow_executions) ---
const DB_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
let dbCleanupInterval: NodeJS.Timeout | null = null;

const startDbCleanup = () => {
    if (serviceRegistry.dbcleanup?.running) return;
    const entry = serviceRegistry.dbcleanup;
    entry.running = true;
    entry.startedAt = new Date().toISOString();

    // Run once immediately on start
    dbCleanupService.runCleanup().then(result => {
        entry.lastTickAt = new Date().toISOString();
        entry.tickCount++;
        console.log(`🧹 [DbCleanup] Initial run: ${result.deleted} deleted, ${result.cleared} cleared`);
    }).catch(err => {
        entry.errors++;
        console.error('[DbCleanup] Initial run error:', err);
    });

    dbCleanupInterval = setInterval(async () => {
        try {
            const result = await dbCleanupService.runCleanup();
            entry.lastTickAt = new Date().toISOString();
            entry.tickCount++;
            console.log(`🧹 [DbCleanup] Tick: ${result.deleted} deleted, ${result.cleared} cleared`);
        } catch (err) {
            entry.errors++;
            console.error('[DbCleanup] Error:', err);
        }
    }, DB_CLEANUP_INTERVAL_MS);
    console.log('🧹 [ServiceRegistry] DB Cleanup started (every 6h)');
};

const stopDbCleanup = () => {
    if (dbCleanupInterval) {
        clearInterval(dbCleanupInterval);
        dbCleanupInterval = null;
    }
    serviceRegistry.dbcleanup.running = false;
    console.log('🧹 [ServiceRegistry] DB Cleanup stopped');
};

serviceRegistry.dbcleanup = {
    name: 'dbcleanup',
    label: 'Limpeza de Banco',
    running: false,
    startedAt: null,
    lastTickAt: null,
    tickCount: 0,
    errors: 0,
    intervalMs: DB_CLEANUP_INTERVAL_MS,
    intervalRef: null,
    start: startDbCleanup,
    stop: stopDbCleanup,
};

// Boot services — singleton services only run on PM2 instance 0 to avoid duplication
const instanceId = parseInt(process.env.NODE_APP_INSTANCE || '0', 10);
if (instanceId === 0) {
    console.log(`[Boot] Instance ${instanceId}: Starting singleton services (scheduler, watchdog, elegesync, dbcleanup)`);
    startScheduler();
    startWatchdog();
    startElegeSync();
    startDbCleanup();
} else {
    console.log(`[Boot] Instance ${instanceId}: Skipping singleton services (handled by instance 0)`);
}

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS — Service Control & Health
// ═══════════════════════════════════════════════════════════

// GET /api/admin/services/status — All services health
app.get('/api/admin/services/status', requireAdmin, (req, res) => {
    const services = Object.values(serviceRegistry).map(s => ({
        name: s.name,
        label: s.label,
        running: s.running,
        startedAt: s.startedAt,
        lastTickAt: s.lastTickAt,
        tickCount: s.tickCount,
        errors: s.errors,
        intervalMs: s.intervalMs,
    }));

    res.json({
        success: true,
        uptime: process.uptime(),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        timestamp: new Date().toISOString(),
        services,
    });
});

// POST /api/admin/services/:name/start
app.post('/api/admin/services/:name/start', requireAdmin, (req, res) => {
    const svc = serviceRegistry[req.params.name];
    if (!svc) return res.status(404).json({ error: `Service '${req.params.name}' not found` });
    if (svc.running) return res.json({ success: true, message: `${svc.label} already running` });
    svc.start();
    res.json({ success: true, message: `${svc.label} started` });
});

// POST /api/admin/services/:name/stop
app.post('/api/admin/services/:name/stop', requireAdmin, (req, res) => {
    const svc = serviceRegistry[req.params.name];
    if (!svc) return res.status(404).json({ error: `Service '${req.params.name}' not found` });
    if (!svc.running) return res.json({ success: true, message: `${svc.label} already stopped` });
    svc.stop();
    res.json({ success: true, message: `${svc.label} stopped` });
});

// POST /api/admin/services/:name/restart
app.post('/api/admin/services/:name/restart', requireAdmin, (req, res) => {
    const svc = serviceRegistry[req.params.name];
    if (!svc) return res.status(404).json({ error: `Service '${req.params.name}' not found` });
    svc.stop();
    // Small delay before restart
    setTimeout(() => {
        svc.start();
        res.json({ success: true, message: `${svc.label} restarted` });
    }, 500);
});

// POST /api/admin/executions/kill-stuck — Batch cancel stuck processes
app.post('/api/admin/executions/kill-stuck', requireAdmin, async (req, res) => {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        // Find stuck executions (running or pending for > 10 minutes)
        const { data: stuck, error: fetchErr } = await supabaseClient
            .from('flow_executions')
            .select('id, status, started_at')
            .or('status.eq.running,status.eq.pending')
            .lt('started_at', tenMinutesAgo);

        if (fetchErr) throw fetchErr;
        if (!stuck || stuck.length === 0) {
            return res.json({ success: true, killed: 0, message: 'Nenhum processo travado encontrado' });
        }

        const now = new Date().toISOString();
        const ids = stuck.map((s: any) => s.id);

        // Batch update to cancelled
        const { error: updateErr } = await supabaseClient
            .from('flow_executions')
            .update({
                status: 'cancelled',
                error_message: `Cancelado automaticamente — processo travado por mais de 10 minutos (kill em ${now})`
            })
            .in('id', ids);

        if (updateErr) throw updateErr;

        console.log(`[Admin] Killed ${ids.length} stuck executions: ${ids.map((id: string) => id.slice(0, 8)).join(', ')}`);
        res.json({ success: true, killed: ids.length, ids: ids.map((id: string) => id.slice(0, 8)) });
    } catch (error: any) {
        console.error('[Admin] Kill stuck failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/db-cleanup — Trigger manual DB cleanup
app.post('/api/admin/db-cleanup', requireAdmin, async (req, res) => {
    try {
        const result = await dbCleanupService.runCleanup();
        res.json({
            success: true,
            deleted: result.deleted,
            cleared: result.cleared,
            message: `Limpeza concluída: ${result.deleted} execuções removidas, ${result.cleared} contextos limpos`,
        });
    } catch (error: any) {
        console.error('[Admin] DB cleanup failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// User Management Routes
app.post('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const { email, fullName, role, password } = req.body;
        if (!email || !fullName) {
            return res.status(400).json({ error: 'Email and Full Name are required.' });
        }
        const user = await userService.createUser(email, fullName, role || 'viewer', password);
        res.json({ success: true, user });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const users = await userService.listUsers();
        res.json({ success: true, users });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/flows/:id/execute', async (req, res) => {
    const { id } = req.params;
    const initialData = req.body;
    const userId = req.body.userId || req.headers['x-user-id'];

    console.log(`[API] Request to execute flow ${id}`);

    try {
        // 1. Verify the flow exists and is active
        const { data: flow, error: flowError } = await supabaseClient
            .from('flows')
            .select('id, name, active')
            .eq('id', id)
            .single();

        if (flowError || !flow) {
            return res.status(404).json({ success: false, error: 'Flow not found' });
        }

        if (!flow.active) {
            return res.status(400).json({ success: false, error: 'Flow is inactive' });
        }

        // 2. Create a PENDING execution record — FlowWorker picks it up via claim_pending_execution
        const { data: execution, error: execError } = await supabaseClient
            .from('flow_executions')
            .insert({
                flow_id: id,
                status: 'pending',
                context: {
                    ...initialData,
                    trigger: initialData?.source || 'manual_execution',
                },
                user_id: userId || null,
                activation_id: initialData?.activationId || null,
                execution_log: [],
            })
            .select('id')
            .single();

        if (execError || !execution) {
            throw new Error(`Failed to create execution: ${execError?.message}`);
        }

        console.log(`[API] Execution ${execution.id} queued (pending). FlowWorker will pick it up.`);

        res.json({
            success: true,
            executionId: execution.id,
            message: 'Execution queued',
        });
    } catch (error: any) {
        console.error('[API] Flow execution failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancel / Kill single execution
app.post('/api/executions/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: exec, error: fetchErr } = await supabaseClient
            .from('flow_executions')
            .select('id, status')
            .eq('id', id)
            .single();

        if (fetchErr || !exec) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        if (exec.status === 'completed' || exec.status === 'cancelled') {
            return res.json({ success: true, message: `Execution already ${exec.status}` });
        }

        const now = new Date().toISOString();

        const { data: updated } = await supabaseClient
            .from('flow_executions')
            .select('execution_log')
            .eq('id', id)
            .single();

        const existingLog = updated?.execution_log || [];
        existingLog.push({
            nodeId: 'system',
            status: 'cancelled',
            timestamp: now,
            nodeLabel: 'Cancelado pelo usuário',
            nodeType: 'system',
            error: 'Execução cancelada manualmente pelo usuário'
        });

        await supabaseClient
            .from('flow_executions')
            .update({
                status: 'cancelled',
                execution_log: existingLog
            })
            .eq('id', id);

        console.log(`[API] Execution ${id} cancelled by user.`);
        res.json({ success: true, message: 'Execution cancelled' });
    } catch (error: any) {
        console.error('[API] Cancel execution failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

export default app;
