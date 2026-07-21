const path = require('node:path');

const root = path.resolve(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'sdi-library-api',
      cwd: path.join(root, 'backend'),
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      time: true,
      env: { NODE_ENV: 'production', PORT: '3000', TRUST_PROXY_HOPS: '1' },
      error_file: path.join(root, 'logs', 'api-error.log'),
      out_file: path.join(root, 'logs', 'api-output.log'),
      merge_logs: true,
    },
    {
      name: 'sdi-library-web',
      cwd: path.join(root, 'frontend'),
      script: 'dist/frontend/server/server.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '384M',
      kill_timeout: 10000,
      time: true,
      env: { NODE_ENV: 'production', PORT: '4000' },
      error_file: path.join(root, 'logs', 'web-error.log'),
      out_file: path.join(root, 'logs', 'web-output.log'),
      merge_logs: true,
    },
  ],
};
