module.exports = {
    apps: [
        {
            name: 'warroom-backend',
            cwd: '/opt/warroom/backend',
            script: 'src/server.ts',
            interpreter: '/opt/warroom/node_modules/.bin/tsx',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            error_file: '/tmp/warroom-backend-error.log',
            out_file: '/tmp/warroom-backend-out.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
