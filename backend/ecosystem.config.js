module.exports = {
  apps: [{
    name: 'slic-pos-backend',
    script: './app.js',
    instances: 1,
    exec_mode: 'fork',

    // Graceful shutdown settings
    kill_timeout: 5000, // Give app 5 seconds to shut down gracefully (we need 2s for WhatsApp cleanup)
    wait_ready: true,
    listen_timeout: 10000,

    // Auto-restart settings
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 8080
    },

    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Merge logs from all instances
    merge_logs: true,

    // Watch settings (disable in production)
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '.wwebjs_auth',
      '.wwebjs_cache',
      'uploads',
      'public'
    ],

    // Advanced settings
    max_memory_restart: '1G',

    // Graceful start/shutdown
    shutdown_with_message: true,
  }]
};
