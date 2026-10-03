/**
 * PM2 process file — run from repo root on the VPS:
 *   pm2 start deploy/ecosystem.config.cjs
 *
 * Expects:
 *   Odoo.Server/.env  (PORT=7002, NODE_ENV=production, CORS/ALLOWED_ORIGINS, MONGODB_URI)
 *   mcp/.env          (ARAMBH_API_URL=http://127.0.0.1:7002, ARAMBH_MCP_API_KEY=..., MCP_PUBLIC_URL=https://sportsarena.aarambhevents.in)
 */
const path = require('path');

const root = path.resolve(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'arambh-api',
      cwd: path.join(root, 'Odoo.Server'),
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 7002,
      },
      max_memory_restart: '512M',
    },
    {
      name: 'arambh-worker',
      cwd: path.join(root, 'Odoo.Server'),
      script: 'src/worker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '256M',
    },
    {
      name: 'arambh-mcp',
      cwd: path.join(root, 'mcp'),
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 7337,
        HOST: '127.0.0.1',
        ARAMBH_API_URL: 'http://127.0.0.1:7002',
        MCP_PUBLIC_URL: 'https://sportsarena.aarambhevents.in',
      },
      max_memory_restart: '256M',
    },
  ],
};
