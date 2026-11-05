// PM2 config for production on Hostinger VPS
module.exports = {
  apps: [
    {
      name: 'dearleaf-erp',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/dearleaf',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_PATH: '/var/www/dearleaf/data/dearleaf.db',
        JWT_SECRET: 'CHANGE_THIS_TO_A_RANDOM_SECRET',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/dearleaf-error.log',
      out_file: '/var/log/pm2/dearleaf-out.log',
      log_file: '/var/log/pm2/dearleaf-combined.log',
      time: true,
    },
  ],
};
