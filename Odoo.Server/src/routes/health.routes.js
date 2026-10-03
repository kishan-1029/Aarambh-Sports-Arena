import { Router } from 'express';
import mongoose from 'mongoose';
import { config } from '../config/index.js';

const router = Router();

/** Liveness — process is up */
router.get('/health', (_req, res) => {
  res.status(200).json({
    isOk: true,
    status: 200,
    message: 'ok',
    data: {
      app: config.appName,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

/** Readiness — mongoose connected */
router.get('/health/ready', (_req, res) => {
  const readyState = mongoose.connection.readyState;
  const ready = readyState === 1;
  res.status(ready ? 200 : 503).json({
    isOk: ready,
    status: ready ? 200 : 503,
    message: ready ? 'ready' : 'database not ready',
    data: {
      readyState,
      // 0=disconnected 1=connected 2=connecting 3=disconnecting
    },
  });
});

export default router;
