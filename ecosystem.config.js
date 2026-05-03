module.exports = {
  apps: [
    {
      name: 'avera_backend_control',
      script: 'dist/index.js',
      cwd: '/www/wwwroot/backend-control',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
