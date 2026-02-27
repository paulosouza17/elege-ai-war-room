/**
 * PM2 Ecosystem Config — Elege.ai WAR ROOM Backend
 * 
 * Usage:
 *   pm2 start ecosystem.config.js          # Start all
 *   pm2 start ecosystem.config.js --only warroom-api  # API only
 *   pm2 restart all                        # Restart all
 *   pm2 logs                               # View logs
 *   pm2 monit                              # Real-time dashboard
 *   pm2 save && pm2 startup                # Persist across reboots
 */

module.exports = {
    apps: [
        // ═══════════════════════════════════════════
        // 1. API SERVER — Express (Cluster Mode)
        // ═══════════════════════════════════════════
        {
            name: 'warroom-api',
            script: 'dist/server.js',
            cwd: __dirname,

            // Cluster: 1 worker per vCPU (auto-detect)
            instances: 'max',
            exec_mode: 'cluster',

            // ── Memory & Restart Guards ──
            max_memory_restart: '1G',
            max_restarts: 15,
            min_uptime: '10s',
            restart_delay: 3000,

            // ── Auto-restart on crash ──
            autorestart: true,
            watch: false,

            // ── Graceful shutdown ──
            kill_timeout: 8000,
            listen_timeout: 10000,
            shutdown_with_message: true,

            // ── Logging ──
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/api-error.log',
            out_file: 'logs/api-out.log',
            merge_logs: true,
            log_type: 'json',

            // ── Environment ──
            node_args: '--max-old-space-size=1536',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            env_staging: {
                NODE_ENV: 'staging',
                PORT: 3000,
            },

            // ── Health check via HTTP ──
            // PM2 will check this endpoint; if it fails, the process restarts
            // Requires: pm2 install pm2-health (optional)
        },

        // ═══════════════════════════════════════════
        // 2. FLOW WORKER — Background Job Processor
        //    Separate process to avoid blocking the API
        // ═══════════════════════════════════════════
        {
            name: 'warroom-worker',
            script: 'dist/workers/flowWorker.js',
            cwd: __dirname,

            // Worker: single instance (uses Redis/BullMQ for job distribution)
            instances: 1,
            exec_mode: 'fork',

            // ── Higher memory for AI-heavy workloads ──
            max_memory_restart: '2G',
            max_restarts: 10,
            min_uptime: '15s',
            restart_delay: 5000,

            autorestart: true,
            watch: false,

            // ── Longer kill timeout (AI calls can take 120s) ──
            kill_timeout: 130000,

            // ── Logging ──
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/worker-error.log',
            out_file: 'logs/worker-out.log',
            merge_logs: true,

            // ── Environment ──
            node_args: '--max-old-space-size=2048',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],

    // ═══════════════════════════════════════════
    // DEPLOYMENT TARGETS (pm2 deploy)
    // ═══════════════════════════════════════════
    deploy: {
        production: {
            user: 'deploy',
            host: ['your-server-ip'],
            ref: 'origin/main',
            repo: 'git@github.com:your-org/war-room.git',
            path: '/opt/warroom',
            'pre-setup': 'apt-get update && apt-get install -y build-essential',
            'post-deploy': 'cd backend && npm ci --omit=dev && npm run build && pm2 reload ecosystem.config.js --env production',
            env: {
                NODE_ENV: 'production',
            },
        },
    },
};
